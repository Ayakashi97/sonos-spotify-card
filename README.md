# Spotify Search Tile

A dedicated Home Assistant Lovelace tile for searching Spotify and playing results on any media player.

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg?style=for-the-badge)](https://github.com/hacs/integration)
<a href="https://my.home-assistant.io/redirect/hacs_repository/?owner=Ayakashi97&repository=sonos-spotify-card&category=plugin" target="_blank"><img src="https://my.home-assistant.io/badges/hacs_repository.svg" alt="Add to HACS" /></a>

## Features
- **Dedicated Search:** A clean, focused search bar for the entire Spotify catalog.
- **Universal Playback:** Initiate playback on any Home Assistant `media_player` (Sonos, Google Cast, Apple TV, etc.).
- **Rich Results:** Displays album art, titles, and artist names.
- **Visual Editor:** Easy configuration via the Home Assistant UI.

## Installation

### Method 1: HACS (Recommended)
1. Click the **"Add to HACS"** button above or:
2. Open **HACS** in Home Assistant.
3. Click the three dots in the top right corner and select **Custom repositories**.
4. Add the URL: `https://github.com/Ayakashi97/sonos-spotify-card`
5. Select **Lovelace** (or Dashboard) as the category.
6. Click **Add**, then find **Spotify Search Tile** in the list and click **Download**.

### Method 2: Manual
1. Download the `spotify-search-tile.js` file.
2. Copy it to your `www/` directory in Home Assistant.
3. Add the card as a resource:
   - Go to **Settings** -> **Dashboards** > **Resources**.
   - URL: `/local/spotify-search-tile.js`
   - Resource Type: `JavaScript Module`

## Configuration

The tile features a visual editor. Simply add a new card and search for "Spotify Search Tile".

### YAML Configuration
```yaml
type: custom:spotify-search-tile
target_entity: media_player.living_room_speaker # The player that will play the music
spotify_entity: media_player.spotify_your_account # Your Spotify media player entity
```

## Troubleshooting
If you see a "Repository structure for main is not compliant" error, ensure you have:
1. Pushed `hacs.json`, `README.md`, and `spotify-search-tile.js` to the `main` branch.
2. Added the topics `lovelace` and `hacs` to your GitHub repository settings.
