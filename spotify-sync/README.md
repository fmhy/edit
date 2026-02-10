# Spotify Sync - Dual MacBook 2.0 Stereo

Play Spotify in perfect sync across two MacBooks, with each one handling a separate stereo channel (Left / Right) to create a true 2.0 stereo sound system.

## How It Works

1. A **sync server** runs on your network (either MacBook or another machine)
2. Both MacBooks open the web UI and connect via WebSocket
3. Each MacBook registers as **Left** or **Right** speaker
4. NTP-style clock synchronization ensures tight timing between both machines
5. When you play a track, both MacBooks start playback at the exact same moment
6. The **Web Audio API** splits the stereo signal so each MacBook only plays its assigned channel through both of its speakers

## Prerequisites

- **Node.js** 18+ installed on the machine running the server
- **Spotify Premium** account (required for the Web Playback SDK)
- Both MacBooks on the **same local network**
- A **Spotify Developer App** (free to create)

## Setup

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Set the **Redirect URI** to `http://localhost:3000/callback`
4. Note your **Client ID** and **Client Secret**

### 2. Install & Run

```bash
cd spotify-sync
npm install

# Set your Spotify credentials
export SPOTIFY_CLIENT_ID="your_client_id_here"
export SPOTIFY_CLIENT_SECRET="your_client_secret_here"

# Start the server
npm start
```

### 3. Connect Both MacBooks

1. On **MacBook A**, open `http://<server-ip>:3000` in Chrome/Safari
2. Click **Log in with Spotify**
3. Select **Left Speaker**
4. On **MacBook B**, open the same URL
5. Select **Right Speaker**
6. Search for a song and hit play — both MacBooks will start simultaneously

## Architecture

```
┌──────────────────────────────────────────┐
│            Sync Server (Node.js)         │
│  - WebSocket for clock sync & commands   │
│  - Spotify OAuth token management        │
│  - Coordinated playback timing           │
└──────────┬───────────────┬───────────────┘
           │               │
     WebSocket        WebSocket
           │               │
┌──────────▼──┐   ┌───────▼──────────┐
│  MacBook A  │   │    MacBook B      │
│  LEFT channel│   │  RIGHT channel   │
│  Web Playback│   │  Web Playback    │
│  SDK + Web   │   │  SDK + Web       │
│  Audio API   │   │  Audio API       │
└─────────────┘   └──────────────────┘
```

## Configuration

| Env Variable | Description | Default |
|---|---|---|
| `SPOTIFY_CLIENT_ID` | Spotify app client ID | (required) |
| `SPOTIFY_CLIENT_SECRET` | Spotify app client secret | (required) |
| `PORT` | Server port | `3000` |

## Tips for Best Results

- **Position the MacBooks** where you'd place stereo speakers (one left, one right)
- **Use external speakers** or the MacBook's built-in speakers at matching volume levels
- **Same network**: Both MacBooks must reach the server. Use the local IP (e.g., `192.168.1.x`), not `localhost`
- **Chrome recommended**: Best support for the Web Audio API and Spotify SDK
- The clock sync runs continuously — playback should stay within ~10-50ms sync accuracy on a typical LAN

## Troubleshooting

- **No sound?** Click anywhere on the page first (browser autoplay policy requires user interaction)
- **Only one MacBook plays?** Make sure both are connected and show "Online" in the status panel
- **Auth error?** Verify your redirect URI matches exactly: `http://localhost:3000/callback`
- **Playback out of sync?** Ensure both MacBooks are on the same WiFi network with low latency
