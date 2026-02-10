// --- State ---
let ws = null;
let myRole = null; // 'left' or 'right'
let clockOffset = 0; // server_time - local_time
let clockSamples = [];
let spotifyPlayer = null;
let spotifyDeviceId = null;
let audioContext = null;
let channelSplitter = null;
let isPlaying = false;
let currentTrack = null;

// --- DOM refs ---
const $ = (id) => document.getElementById(id);

// --- Init ---
async function init() {
  const res = await fetch("/api/status");
  const status = await res.json();

  if (!status.authenticated) {
    $("login-section").classList.remove("hidden");
    return;
  }

  $("login-section").classList.add("hidden");
  $("role-section").classList.remove("hidden");
}

// --- Role selection ---
function selectRole(role) {
  myRole = role;

  // Update UI
  document.querySelectorAll(".role-btn").forEach((btn) => btn.classList.remove("active"));
  event.currentTarget.classList.add("active");

  $("role-section").classList.add("hidden");
  $("status-section").classList.remove("hidden");
  $("channel-display").classList.remove("hidden");
  $("search-section").classList.remove("hidden");

  $("my-role").textContent = role.charAt(0).toUpperCase() + role.slice(1);
  $("channel-label").textContent = role === "left" ? "LEFT" : "RIGHT";
  $("channel-label").className = `channel-label ${role}`;

  connectWebSocket();
  initSpotifyPlayer();
}

// --- WebSocket ---
function connectWebSocket() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${proto}//${location.host}`);

  ws.onopen = () => {
    $("conn-status").innerHTML = '<span class="dot green"></span>Connected';
    ws.send(JSON.stringify({ type: "register", role: myRole }));
    startClockSync();
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleMessage(msg);
  };

  ws.onclose = () => {
    $("conn-status").innerHTML = '<span class="dot red"></span>Disconnected';
    // Reconnect after 2s
    setTimeout(connectWebSocket, 2000);
  };

  ws.onerror = () => {
    $("conn-status").innerHTML = '<span class="dot red"></span>Error';
  };
}

function handleMessage(msg) {
  switch (msg.type) {
    case "pong":
      handlePong(msg);
      break;

    case "roster":
      updateRoster(msg.clients);
      break;

    case "play":
      handleSyncPlay(msg);
      break;

    case "pause":
      handleSyncPause();
      break;

    case "resume":
      handleSyncResume(msg);
      break;
  }
}

function updateRoster(clients) {
  const hasLeft = clients.includes("left");
  const hasRight = clients.includes("right");

  $("left-status").innerHTML = hasLeft
    ? '<span class="dot green"></span>Online'
    : '<span class="dot red"></span>Offline';

  $("right-status").innerHTML = hasRight
    ? '<span class="dot green"></span>Online'
    : '<span class="dot red"></span>Offline';

  if (hasLeft && hasRight) {
    $("sync-indicator").classList.remove("hidden");
    $("sync-indicator").className = "sync-indicator synced";
    $("sync-indicator").textContent = "Both speakers connected - Ready for stereo playback";
  } else {
    $("sync-indicator").classList.remove("hidden");
    $("sync-indicator").className = "sync-indicator syncing";
    $("sync-indicator").textContent = "Waiting for both speakers to connect...";
  }
}

// --- NTP-style clock sync ---
function startClockSync() {
  clockSamples = [];
  doClockPing();
}

function doClockPing() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "ping", clientTime: Date.now() }));
}

function handlePong(msg) {
  const now = Date.now();
  const rtt = now - msg.clientTime;
  const serverTime = msg.serverTime;
  // Estimate: server time at the midpoint of request
  const offset = serverTime - (msg.clientTime + rtt / 2);

  clockSamples.push({ offset, rtt });

  // Keep best 5 samples (lowest RTT = most accurate)
  clockSamples.sort((a, b) => a.rtt - b.rtt);
  if (clockSamples.length > 10) clockSamples.length = 10;

  // Use median of top 5
  const top = clockSamples.slice(0, 5);
  clockOffset = top.reduce((s, x) => s + x.offset, 0) / top.length;

  // Report back to server
  ws.send(JSON.stringify({ type: "clock_offset", offset: clockOffset }));

  // Keep syncing every 3 seconds
  setTimeout(doClockPing, 3000);
}

// Converts a server timestamp to local time
function serverToLocal(serverTime) {
  return serverTime - clockOffset;
}

// --- Spotify Web Playback SDK ---
function initSpotifyPlayer() {
  window.onSpotifyWebPlaybackSDKReady = () => {
    createPlayer();
  };

  // SDK may already be loaded
  if (window.Spotify) {
    createPlayer();
  }
}

async function createPlayer() {
  const tokenRes = await fetch("/api/token");
  const tokenData = await tokenRes.json();
  if (!tokenData.token) {
    console.error("No token available");
    return;
  }

  spotifyPlayer = new Spotify.Player({
    name: `Sync Speaker (${myRole.toUpperCase()})`,
    getOAuthToken: async (cb) => {
      const res = await fetch("/api/token");
      const data = await res.json();
      cb(data.token);
    },
    volume: 0.8,
  });

  spotifyPlayer.addListener("ready", ({ device_id }) => {
    spotifyDeviceId = device_id;
    console.log("Spotify player ready, device:", device_id);
    setupChannelSplitter();
  });

  spotifyPlayer.addListener("not_ready", ({ device_id }) => {
    console.log("Device went offline:", device_id);
  });

  spotifyPlayer.addListener("player_state_changed", (state) => {
    if (!state) return;
    isPlaying = !state.paused;
  });

  spotifyPlayer.connect();
}

// --- Channel splitting using Web Audio API ---
function setupChannelSplitter() {
  // The Spotify Web Playback SDK uses an <audio> element internally.
  // We intercept it using Web Audio API to route only L or R channel.
  // We need to find the audio element the SDK creates.
  const trySetup = () => {
    const audioElements = document.querySelectorAll("audio");
    let targetAudio = null;

    for (const el of audioElements) {
      // The SDK creates an audio element with a Spotify blob URL
      if (el.src || el.srcObject) {
        targetAudio = el;
        break;
      }
    }

    if (!targetAudio) {
      // Retry - SDK may not have created it yet
      setTimeout(trySetup, 500);
      return;
    }

    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaElementSource(targetAudio);

    // Create a channel splitter (stereo -> 2 mono)
    const splitter = audioContext.createChannelSplitter(2);
    // Create a channel merger (2 mono -> stereo output)
    const merger = audioContext.createChannelMerger(2);

    source.connect(splitter);

    if (myRole === "left") {
      // Route left input to both output channels
      splitter.connect(merger, 0, 0); // L -> L
      splitter.connect(merger, 0, 1); // L -> R
    } else {
      // Route right input to both output channels
      splitter.connect(merger, 1, 0); // R -> L
      splitter.connect(merger, 1, 1); // R -> R
    }

    merger.connect(audioContext.destination);
    console.log(`Channel splitter active: playing ${myRole} channel on both speakers`);
  };

  trySetup();
}

// --- Search ---
async function searchTracks() {
  const query = $("search-input").value.trim();
  if (!query) return;

  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();

  const list = $("track-list");
  list.innerHTML = "";

  if (!data.tracks || !data.tracks.items) return;

  data.tracks.items.forEach((track) => {
    const li = document.createElement("li");
    li.className = "track-item";
    li.onclick = () => playSyncTrack(track);

    const img = track.album.images[2] || track.album.images[0];
    li.innerHTML = `
      <img src="${img ? img.url : ""}" alt="">
      <div class="track-info">
        <div class="name">${escapeHtml(track.name)}</div>
        <div class="artist">${escapeHtml(track.artists.map((a) => a.name).join(", "))}</div>
      </div>
    `;
    list.appendChild(li);
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// --- Playback controls ---
function playSyncTrack(track) {
  currentTrack = track;

  // Tell server to broadcast sync play
  ws.send(
    JSON.stringify({
      type: "sync_play",
      uri: track.uri,
      trackName: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      positionMs: 0,
    })
  );
}

async function handleSyncPlay(msg) {
  // Update now playing UI
  $("player-section").classList.remove("hidden");
  $("track-title").textContent = msg.trackName;
  $("track-artist").textContent = msg.artist;

  // Get album art from current state if available
  if (currentTrack && currentTrack.album && currentTrack.album.images[0]) {
    $("track-art").src = currentTrack.album.images[0].url;
  }

  // Ensure audio context is running (browser autoplay policy)
  if (audioContext && audioContext.state === "suspended") {
    await audioContext.resume();
  }

  // Wait until the coordinated start time
  const localStartTime = serverToLocal(msg.startAt);
  const delay = localStartTime - Date.now();

  if (delay > 0) {
    await sleep(delay);
  }

  // Start playback on this device
  const tokenRes = await fetch("/api/token");
  const tokenData = await tokenRes.json();

  await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${spotifyDeviceId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${tokenData.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      uris: [msg.uri],
      position_ms: msg.positionMs || 0,
    }),
  });

  isPlaying = true;
}

async function handleSyncPause() {
  if (spotifyPlayer) {
    await spotifyPlayer.pause();
  }
  isPlaying = false;
}

async function handleSyncResume(msg) {
  const localStartTime = serverToLocal(msg.startAt);
  const delay = localStartTime - Date.now();
  if (delay > 0) await sleep(delay);

  if (spotifyPlayer) {
    await spotifyPlayer.resume();
  }
  isPlaying = true;
}

function sendPause() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "sync_pause" }));
  }
}

function sendResume() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "sync_resume" }));
  }
}

// --- Volume ---
function setVolume(val) {
  $("vol-label").textContent = `${val}%`;
  if (spotifyPlayer) {
    spotifyPlayer.setVolume(val / 100);
  }
}

// --- Helpers ---
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Start ---
init();
