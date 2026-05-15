import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class SonosSpotifyCard extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _results: { type: Array },
      _searching: { type: Boolean },
    };
  }

  constructor() {
    super();
    this._results = [];
    this._searching = false;
  }

  render() {
    if (!this.config || !this.hass) {
      return html``;
    }

    const entityId = this.config.entity;
    const stateObj = this.hass.states[entityId];

    if (!stateObj) {
      return html`
        <ha-card>
          <div class="error">Entity not found: ${entityId}</div>
        </ha-card>
      `;
    }

    return html`
      <ha-card>
        <div class="header">
          <div class="name">${stateObj.attributes.friendly_name || entityId}</div>
        </div>
        
        <div class="controls">
          <ha-icon-button
            icon="mdi:skip-previous"
            @click="${() => this._mediaControl("media_previous_track")}"
          ></ha-icon-button>
          <ha-icon-button
            icon="${stateObj.state === "playing" ? "mdi:pause" : "mdi:play"}"
            @click="${() => this._mediaControl(stateObj.state === "playing" ? "media_pause" : "media_play")}"
          ></ha-icon-button>
          <ha-icon-button
            icon="mdi:skip-next"
            @click="${() => this._mediaControl("media_next_track")}"
          ></ha-icon-button>
        </div>

        <div class="volume">
          <ha-slider
            min="0"
            max="1"
            step="0.01"
            .value="${stateObj.attributes.volume_level}"
            @change="${(e) => this._setVolume(e.target.value)}"
          ></ha-slider>
        </div>

        <div class="search-section">
          <div class="search-bar">
            <input type="text" placeholder="Search Spotify..." id="searchInput" @keypress="${(e) => e.key === 'Enter' && this._search()}">
            <ha-icon-button icon="mdi:magnify" @click="${this._search}"></ha-icon-button>
          </div>
          
          ${this._searching ? html`<div class="loading">Searching...</div>` : ""}
          
          <div class="results">
            ${this._results.map(item => html`
              <div class="result-item" @click="${() => this._playMedia(item.media_content_id, item.media_content_type)}">
                <img src="${item.thumbnail}" alt="${item.title}" onerror="this.style.display='none'">
                <div class="result-info">
                  <div class="result-title">${item.title}</div>
                  <div class="result-subtitle">${item.subtitle || ""}</div>
                </div>
              </div>
            `)}
          </div>
        </div>

        <div class="grouping-section">
          <h3>Groups</h3>
          ${this._renderGrouping(stateObj)}
        </div>
      </ha-card>
    `;
  }

  _renderGrouping(stateObj) {
    const allMediaPlayers = Object.keys(this.hass.states).filter(e => e.startsWith('media_player.'));
    // Robust check for Sonos speakers
    const sonosPlayers = allMediaPlayers.filter(e => {
      const state = this.hass.states[e];
      return state.attributes.brand === 'sonos' || 
             state.attributes.integration === 'sonos' ||
             e.includes('sonos') ||
             (state.attributes.source_list && state.attributes.source_list.includes('TV'));
    });
    
    const members = stateObj.attributes.group_members || [this.config.entity];

    return html`
      <div class="groups">
        ${sonosPlayers.map(p => {
          const isMember = members.includes(p);
          const name = this.hass.states[p].attributes.friendly_name || p.split('.')[1].replace(/_/g, ' ');
          if (p === this.config.entity) return html`<div class="group-item master">${name} (Host)</div>`;
          return html`
            <div class="group-item ${isMember ? 'active' : ''}" @click="${() => this._toggleGroup(p, isMember)}">
              ${name}
            </div>
          `;
        })}
      </div>
    `;
  }

  async _toggleGroup(entityId, isMember) {
    const master = this.config.entity;
    if (isMember) {
      await this.hass.callService("sonos", "unjoin", { entity_id: entityId });
    } else {
      await this.hass.callService("sonos", "join", { entity_id: entityId, master: master });
    }
  }

  _mediaControl(service) {
    this.hass.callService("media_player", service, {
      entity_id: this.config.entity,
    });
  }

  _setVolume(value) {
    this.hass.callService("media_player", "volume_set", {
      entity_id: this.config.entity,
      volume_level: value,
    });
  }

  async _search() {
    const query = this.shadowRoot.getElementById('searchInput').value;
    if (!query) return;

    if (!this.config.spotify_entity) {
      alert("Please configure a Spotify entity in the card settings to use search.");
      return;
    }

    this._searching = true;
    this._results = [];

    try {
      const spotifyEntity = this.config.spotify_entity;
      
      // HA 2026.5.1+ Search logic: Prioritize search_media WebSocket command
      let response;
      try {
        response = await this.hass.callWS({
          type: "media_player/search_media",
          entity_id: spotifyEntity,
          query: query
        });
      } catch (e) {
        console.warn("search_media failed, falling back to browse_media", e);
        response = await this.hass.callWS({
          type: "media_player/browse_media",
          entity_id: spotifyEntity,
          media_content_type: "search",
          media_content_id: query
        });
      }

      if (response && response.children) {
        this._results = response.children;
      } else if (response && response.items) {
        this._results = response.items;
      }
    } catch (err) {
      console.error("Spotify Search failed:", err);
    } finally {
      this._searching = false;
    }
  }

  _playMedia(contentId, contentType) {
    this.hass.callService("media_player", "play_media", {
      entity_id: this.config.entity,
      media_content_id: contentId,
      media_content_type: contentType
    });
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity (Sonos)");
    }
    this.config = config;
  }

  static getConfigElement() {
    return document.createElement("sonos-spotify-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "",
      spotify_entity: ""
    };
  }

  getCardSize() {
    return 5;
  }

  static get styles() {
    return css`
      ha-card {
        padding: 20px;
        background: var(--card-background-color, var(--ha-card-background, #fff));
        border-radius: var(--ha-card-border-radius, 12px);
        box-shadow: var(--ha-card-box-shadow, none);
        border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color, #e0e0e0));
      }
      .header {
        font-size: 1.4em;
        font-weight: 600;
        margin-bottom: 20px;
        text-align: center;
        color: var(--primary-text-color);
      }
      .controls {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }
      .controls ha-icon-button {
        --mdc-icon-button-size: 56px;
        --mdc-icon-size: 32px;
        color: var(--primary-text-color);
      }
      .controls ha-icon-button[icon="mdi:pause"],
      .controls ha-icon-button[icon="mdi:play"] {
        --mdc-icon-size: 48px;
        color: var(--accent-color);
      }
      .volume {
        width: 100%;
        margin-bottom: 20px;
      }
      ha-slider {
        width: 100%;
        --paper-slider-active-color: var(--accent-color);
        --paper-slider-knob-color: var(--accent-color);
      }
      .search-section {
        border-top: 1px solid var(--divider-color);
        padding-top: 20px;
        margin-top: 10px;
      }
      .search-bar {
        display: flex;
        align-items: center;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 28px;
        padding: 4px 8px 4px 20px;
        transition: box-shadow 0.2s;
      }
      .search-bar:focus-within {
        box-shadow: 0 0 0 2px var(--accent-color);
      }
      .search-bar input {
        flex-grow: 1;
        border: none;
        background: transparent;
        color: var(--primary-text-color);
        height: 44px;
        outline: none;
        font-size: 1em;
      }
      .results {
        margin-top: 16px;
        max-height: 300px;
        overflow-y: auto;
        padding-right: 4px;
      }
      .results::-webkit-scrollbar {
        width: 4px;
      }
      .results::-webkit-scrollbar-thumb {
        background: var(--divider-color);
        border-radius: 4px;
      }
      .result-item {
        display: flex;
        align-items: center;
        padding: 10px;
        cursor: pointer;
        border-radius: 10px;
        transition: background 0.2s;
        margin-bottom: 4px;
      }
      .result-item:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .result-item img {
        width: 48px;
        height: 48px;
        border-radius: 6px;
        margin-right: 14px;
        object-fit: cover;
        background: var(--divider-color);
      }
      .result-info {
        flex-grow: 1;
        overflow: hidden;
      }
      .result-title {
        font-weight: 500;
        font-size: 1em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .result-subtitle {
        font-size: 0.85em;
        color: var(--secondary-text-color);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .grouping-section h3 {
        font-size: 1.1em;
        margin: 24px 0 12px;
        font-weight: 500;
      }
      .groups {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .group-item {
        padding: 6px 16px;
        border: 1px solid var(--divider-color);
        border-radius: 20px;
        cursor: pointer;
        font-size: 0.9em;
        transition: all 0.2s;
        background: var(--card-background-color);
      }
      .group-item:hover {
        border-color: var(--accent-color);
      }
      .group-item.active {
        background: var(--accent-color);
        color: #fff;
        border-color: var(--accent-color);
      }
      .group-item.master {
        background: var(--primary-background-color);
        border: 2px solid var(--accent-color);
        cursor: default;
        font-weight: 600;
      }
      .loading {
        text-align: center;
        margin: 16px;
        color: var(--secondary-text-color);
      }
      .error {
        color: var(--error-color);
        text-align: center;
        padding: 20px;
      }
    `;
  }
}

class SonosSpotifyCardEditor extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      _config: { type: Object },
    };
  }

  setConfig(config) {
    this._config = config;
  }

  render() {
    if (!this.hass || !this._config) {
      return html``;
    }

    const entities = Object.keys(this.hass.states).filter(e => e.startsWith('media_player.'));

    return html`
      <div class="card-config">
        <div class="option">
          <ha-select
            label="Sonos Entity"
            .value="${this._config.entity}"
            .configValue="${"entity"}"
            @selected="${this._valueChanged}"
            @closed="${(ev) => ev.stopPropagation()}"
          >
            ${entities.map(entity => html`<mwc-list-item .value="${entity}">${entity}</mwc-list-item>`)}
          </ha-select>
        </div>
        <div class="option">
          <ha-select
            label="Spotify Entity"
            .value="${this._config.spotify_entity}"
            .configValue="${"spotify_entity"}"
            @selected="${this._valueChanged}"
            @closed="${(ev) => ev.stopPropagation()}"
          >
            ${entities.map(entity => html`<mwc-list-item .value="${entity}">${entity}</mwc-list-item>`)}
          </ha-select>
        </div>
      </div>
    `;
  }

  _valueChanged(ev) {
    if (!this._config || !this.hass) {
      return;
    }
    const target = ev.target;
    const value = target.value;
    const configValue = target.configValue;

    if (this._config[configValue] === value) {
      return;
    }

    if (configValue) {
      if (value === "") {
        const tmpConfig = { ...this._config };
        delete tmpConfig[configValue];
        this._config = tmpConfig;
      } else {
        this._config = {
          ...this._config,
          [configValue]: value,
        };
      }
    }
    const event = new CustomEvent("config-changed", {
      detail: { config: this._config },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(event);
  }

  static get styles() {
    return css`
      .option {
        padding: 4px 0;
      }
      ha-select {
        width: 100%;
      }
    `;
  }
}

customElements.define("sonos-spotify-card-editor", SonosSpotifyCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "sonos-spotify-card",
  name: "Sonos Spotify Search Card",
  description: "Control Sonos and search Spotify in one card",
  preview: true,
});

customElements.define("sonos-spotify-card", SonosSpotifyCard);
