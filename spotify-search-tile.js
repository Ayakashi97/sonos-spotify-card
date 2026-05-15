import {
  LitElement,
  html,
  css,
} from "https://unpkg.com/lit-element@2.4.0/lit-element.js?module";

class SpotifySearchTile extends LitElement {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _results: { type: Array },
      _searching: { type: Boolean },
      _error: { type: String },
    };
  }

  constructor() {
    super();
    this._results = [];
    this._searching = false;
    this._error = "";
  }

  render() {
    if (!this.config || !this.hass) {
      return html``;
    }

    return html`
      <ha-card>
        <div class="search-bar">
          <input 
            type="text" 
            placeholder="Search Spotify..." 
            id="searchInput" 
            @keypress="${(e) => e.key === 'Enter' && this._search()}"
          >
          <ha-icon-button icon="mdi:magnify" @click="${this._search}"></ha-icon-button>
        </div>
        
        ${this._searching ? html`<div class="loading">Searching...</div>` : ""}
        ${this._error ? html`<div class="error-msg">${this._error}</div>` : ""}
        ${!this._searching && !this._error && this._results.length === 0 && this.shadowRoot?.getElementById('searchInput')?.value ? html`<div class="loading">No results found.</div>` : ""}
        
        <div class="results">
          ${this._results.map(item => html`
            <div class="result-item" @click="${() => this._playMedia(item.media_content_id, item.media_content_type)}">
              <img src="${item.thumbnail || item.image || item.picture}" alt="${item.title}" onerror="this.src='https://raw.githubusercontent.com/Ayakashi97/sonos-spotify-card/main/icon.png'; this.style.opacity='0.5'">
              <div class="result-info">
                <div class="result-title">${item.title}</div>
                <div class="result-subtitle">${item.subtitle || item.artist || item.author || ""}</div>
              </div>
            </div>
          `)}
        </div>
      </ha-card>
    `;
  }

  async _search() {
    const query = this.shadowRoot.getElementById('searchInput').value;
    if (!query) return;

    this._searching = true;
    this._results = [];
    this._error = "";

    const spotifyEntity = this.config.spotify_entity;
    if (!spotifyEntity) {
      this._error = "Please configure a Spotify entity.";
      this._searching = false;
      return;
    }

    try {
      // Attempt 1: Universal Media Source Search (The most modern way)
      try {
        const response = await this.hass.callWS({
          type: "media_source/browse_media",
          media_content_id: `media-source://spotify/search?query=${encodeURIComponent(query)}`
        });
        if (this._parseResults(response)) {
          this._searching = false;
          return;
        }
      } catch (e) {}

      // Attempt 2: Direct Search via Entity (Legacy/Integration specific)
      try {
        const response = await this.hass.callWS({
          type: "media_player/search_media",
          entity_id: spotifyEntity,
          query: query
        });
        if (this._parseResults(response)) {
          this._searching = false;
          return;
        }
      } catch (e) {}

      // Attempt 3: Browse Media with Search ID
      try {
        const response = await this.hass.callWS({
          type: "media_player/browse_media",
          entity_id: spotifyEntity,
          media_content_type: "search",
          media_content_id: query
        });
        if (this._parseResults(response)) {
          this._searching = false;
          return;
        }
      } catch (e) {}

      this._error = "All search methods failed. Check your Spotify integration.";
    } catch (err) {
      this._error = "Search failed: " + err.message;
    } finally {
      this._searching = false;
    }
  }

  _parseResults(response) {
    if (!response) return false;
    const results = response.children || response.items || (Array.isArray(response) ? response : []);
    if (results.length > 0) {
      this._results = results;
      return true;
    }
    return false;
  }

  _playMedia(contentId, contentType) {
    const targetEntity = this.config.target_entity;
    if (!targetEntity) {
      alert("Please configure a target media player entity.");
      return;
    }
    this.hass.callService("media_player", "play_media", {
      entity_id: targetEntity,
      media_content_id: contentId,
      media_content_type: contentType
    });
  }

  setConfig(config) {
    this.config = config;
  }

  static getConfigElement() {
    return document.createElement("spotify-search-tile-editor");
  }

  static getStubConfig() {
    return {
      target_entity: "",
      spotify_entity: ""
    };
  }

  getCardSize() {
    return 4;
  }

  static get styles() {
    return css`
      ha-card {
        padding: 12px;
        background: var(--ha-card-background, var(--card-background-color, #fff));
        border-radius: var(--ha-card-border-radius, 12px);
      }
      .search-bar {
        display: flex;
        align-items: center;
        background: var(--secondary-background-color, #f5f5f5);
        border-radius: 24px;
        padding: 4px 8px 4px 16px;
      }
      .search-bar input {
        flex-grow: 1;
        border: none;
        background: transparent;
        color: var(--primary-text-color);
        height: 40px;
        outline: none;
        font-size: 1em;
      }
      .loading {
        text-align: center;
        margin: 12px;
        font-size: 0.9em;
        color: var(--secondary-text-color);
      }
      .error-msg {
        text-align: center;
        margin: 12px;
        font-size: 0.9em;
        color: var(--error-color, #db4437);
        background: var(--error-background-color, rgba(219, 68, 55, 0.1));
        padding: 8px;
        border-radius: 4px;
      }
      .results {
        margin-top: 12px;
        max-height: 400px;
        overflow-y: auto;
      }
      .result-item {
        display: flex;
        align-items: center;
        padding: 8px;
        cursor: pointer;
        border-radius: 8px;
        transition: background 0.2s;
      }
      .result-item:hover {
        background: var(--secondary-background-color, #f5f5f5);
      }
      .result-item img {
        width: 44px;
        height: 44px;
        border-radius: 4px;
        margin-right: 12px;
        object-fit: cover;
      }
      .result-info {
        flex-grow: 1;
        overflow: hidden;
      }
      .result-title {
        font-weight: 500;
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
    `;
  }
}

class SpotifySearchTileEditor extends LitElement {
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
            label="Target Media Player"
            .value="${this._config.target_entity}"
            .configValue="${"target_entity"}"
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
    if (!this._config || !this.hass) return;
    const target = ev.target;
    if (this._config[target.configValue] === target.value) return;
    
    this._config = {
      ...this._config,
      [target.configValue]: target.value,
    };
    
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
        padding: 8px 0;
      }
      ha-select {
        width: 100%;
      }
    `;
  }
}

customElements.define("spotify-search-tile", SpotifySearchTile);
customElements.define("spotify-search-tile-editor", SpotifySearchTileEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "spotify-search-tile",
  name: "Spotify Search Tile",
  description: "A dedicated tile for searching Spotify and playing on any media player",
  preview: true,
});
