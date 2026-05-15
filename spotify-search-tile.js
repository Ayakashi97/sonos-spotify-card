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
      </ha-card>
    `;
  }

  async _search() {
    const query = this.shadowRoot.getElementById('searchInput').value;
    if (!query) return;

    if (!this.config.spotify_entity) {
      alert("Please configure a Spotify entity to use search.");
      return;
    }

    this._searching = true;
    this._results = [];

    try {
      const spotifyEntity = this.config.spotify_entity;
      let response;
      try {
        response = await this.hass.callWS({
          type: "media_player/search_media",
          entity_id: spotifyEntity,
          query: query
        });
      } catch (e) {
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
