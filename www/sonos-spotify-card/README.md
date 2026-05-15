# Sonos & Spotify Search Card

A custom Home Assistant Lovelace card for controlling Sonos speakers with an integrated Spotify search bar.

[**View on Codeberg**](https://codeberg.org/ayakashi/sonos-spotify-card)

## Features
- **Media Controls:** Play, Pause, Next, Previous.
- **Volume Control:** Smooth slider for volume management.
- **Sonos Grouping:** Easily join or unjoin other Sonos speakers in your network.
- **Spotify Search:** Search for any track, album, or playlist on Spotify and play it directly on your Sonos speaker.

## Installation

### Method 1: HACS (Recommended)
1. Open **HACS** in Home Assistant.
2. Click the three dots in the top right corner and select **Custom repositories**.
3. Add the following URL: `https://codeberg.org/ayakashi/sonos-spotify-card`
4. Select **Lovelace** (or Plugin) as the category.
5. Click **Add**, then find the card in the HACS list and click **Download**.

### Method 2: Manual
1. Download the `sonos-spotify-card.js` file.
2. Copy it to your `www/sonos-spotify-card/` directory in Home Assistant.
3. Add the card as a resource:
   - Go to **Settings** -> **Dashboards** -> **Resources**.
   - URL: `/local/sonos-spotify-card/sonos-spotify-card.js`
   - Resource Type: `JavaScript Module`

## Configuration

The card features a visual editor. Simply add a new card and search for "Sonos Spotify Search Card". Alternatively, use YAML:

```yaml
type: custom:sonos-spotify-card
entity: media_player.sonos_living_room
spotify_entity: media_player.spotify_your_account
```

## Dependencies
- **Sonos Integration**
- **Spotify Integration**
- **Spotcast (Optional):** For improved playback reliability.
