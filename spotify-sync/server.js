import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

// --- State ---
const clients = new Map(); // ws -> { role: 'left'|'right', clockOffset: number }
let spotifyToken = null;
let spotifyRefreshToken = null;
let tokenExpiry = 0;

app.use(express.static(join(__dirname, "public")));
app.use(express.json());

// --- Spotify OAuth ---
app.get("/login", (_req, res) => {
  const scopes = [
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-currently-playing",
    "streaming",
  ].join(" ");
  const authUrl =
    `https://accounts.spotify.com/authorize?` +
    `response_type=code&client_id=${SPOTIFY_CLIENT_ID}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
  res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send("Missing code");

  try {
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    const data = await tokenRes.json();
    spotifyToken = data.access_token;
    spotifyRefreshToken = data.refresh_token;
    tokenExpiry = Date.now() + data.expires_in * 1000;
    res.redirect("/");
  } catch (err) {
    console.error("OAuth error:", err);
    res.status(500).send("Authentication failed");
  }
});

async function refreshToken() {
  if (!spotifyRefreshToken) return;
  if (Date.now() < tokenExpiry - 60000) return; // still valid

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: spotifyRefreshToken,
    }),
  });
  const data = await tokenRes.json();
  spotifyToken = data.access_token;
  if (data.refresh_token) spotifyRefreshToken = data.refresh_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
}

// --- API routes ---
app.get("/api/status", (_req, res) => {
  const roles = [];
  for (const [, info] of clients) {
    roles.push(info.role);
  }
  res.json({
    authenticated: !!spotifyToken,
    clients: roles,
    clientCount: clients.size,
  });
});

app.get("/api/token", async (_req, res) => {
  await refreshToken();
  if (!spotifyToken) return res.status(401).json({ error: "Not authenticated" });
  res.json({ token: spotifyToken });
});

app.get("/api/devices", async (_req, res) => {
  await refreshToken();
  if (!spotifyToken) return res.status(401).json({ error: "Not authenticated" });
  try {
    const resp = await fetch("https://api.spotify.com/v1/me/player/devices", {
      headers: { Authorization: `Bearer ${spotifyToken}` },
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/search", async (req, res) => {
  await refreshToken();
  if (!spotifyToken) return res.status(401).json({ error: "Not authenticated" });
  const q = req.query.q;
  if (!q) return res.status(400).json({ error: "Missing query" });
  try {
    const resp = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(q)}&type=track&limit=10`,
      { headers: { Authorization: `Bearer ${spotifyToken}` } }
    );
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WebSocket for time sync and coordinated playback ---
wss.on("connection", (ws) => {
  console.log("Client connected");
  clients.set(ws, { role: null, clockOffset: 0 });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    const info = clients.get(ws);
    if (!info) return;

    switch (msg.type) {
      case "register": {
        // Client picks left or right
        info.role = msg.role;
        console.log(`Client registered as: ${msg.role}`);
        broadcast({ type: "roster", clients: getRoster() });
        break;
      }

      case "ping": {
        // NTP-style: client sends its time, server responds with server time
        ws.send(
          JSON.stringify({
            type: "pong",
            clientTime: msg.clientTime,
            serverTime: Date.now(),
          })
        );
        break;
      }

      case "clock_offset": {
        // Client reports its calculated offset
        info.clockOffset = msg.offset;
        break;
      }

      case "sync_play": {
        // Controller requests synchronized play
        // Schedule play at a future wall-clock time so both clients start together
        const startAt = Date.now() + 1500; // 1.5s in the future for safety margin
        broadcast({
          type: "play",
          uri: msg.uri,
          trackName: msg.trackName,
          artist: msg.artist,
          startAt,
          positionMs: msg.positionMs || 0,
        });
        break;
      }

      case "sync_pause": {
        broadcast({ type: "pause" });
        break;
      }

      case "sync_resume": {
        const resumeAt = Date.now() + 1000;
        broadcast({ type: "resume", startAt: resumeAt });
        break;
      }
    }
  });

  ws.on("close", () => {
    clients.delete(ws);
    console.log("Client disconnected");
    broadcast({ type: "roster", clients: getRoster() });
  });
});

function getRoster() {
  const roles = [];
  for (const [, info] of clients) {
    if (info.role) roles.push(info.role);
  }
  return roles;
}

function broadcast(msg) {
  const data = JSON.stringify(msg);
  for (const [ws] of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

server.listen(PORT, () => {
  console.log(`\n  Spotify Sync Server running at http://localhost:${PORT}`);
  console.log(`  Open this URL on BOTH MacBooks (same network)\n`);
  if (!SPOTIFY_CLIENT_ID) {
    console.log("  WARNING: Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET env vars");
    console.log("  Create an app at https://developer.spotify.com/dashboard\n");
  }
});
