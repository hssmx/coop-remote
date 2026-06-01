const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const ui = {
  appFrame: $(".app-frame"),
  sidebar: $("#sidebar"),
  workspace: $("#workspace"),
  dockLayer: $("#dockLayer"),
  collapseSidebar: $("#collapseSidebar"),
  expandSidebar: $("#expandSidebar"),
  navButtons: $$(".nav-btn"),
  pageTitle: $("#pageTitle"),
  pageSubtitle: $("#pageSubtitle"),
  themeToggle: $("#themeToggle"),
  layoutEditToggle: $("#layoutEditToggle"),
  layoutSave: $("#layoutSave"),
  layoutReset: $("#layoutReset"),

  screens: {
    home: $("#homeScreen"),
    host: $("#hostScreen"),
    join: $("#joinScreen"),
    party: $("#partyScreen"),
    network: $("#networkScreen"),
    settings: $("#settingsScreen")
  },

  homeHost: $("#homeHost"),
  homeJoin: $("#homeJoin"),

  hostName: $("#hostName"),
  guestName: $("#guestName"),
  maxPeople: $("#maxPeople"),
  allowJoins: $("#allowJoins"),
  captureSource: $("#captureSource"),
  refreshSources: $("#refreshSources"),
  startHost: $("#startHost"),
  stopHost: $("#stopHost"),
  panicInput: $("#panicInput"),
  roomBox: $("#roomBox"),
  roomCode: $("#roomCode"),
  copyRoom: $("#copyRoom"),
  pendingList: $("#pendingList"),

  joinCode: $("#joinCode"),
  joinRoom: $("#joinRoom"),
  leaveRoom: $("#leaveRoom"),

  cameraToggle: $("#cameraToggle"),
  micToggle: $("#micToggle"),
  pushToTalk: $("#pushToTalk"),
  pttKeyButton: $("#pttKeyButton"),
  antiEchoToggle: $("#antiEchoToggle"),
  memberList: $("#memberList"),

  resolutionSelect: $("#resolutionSelect"),
  fpsSelect: $("#fpsSelect"),
  imageQuality: $("#imageQuality"),
  imageQualityLabel: $("#imageQualityLabel"),
  bitrateSlider: $("#bitrateSlider"),
  bitrateLabel: $("#bitrateLabel"),
  degradationPreference: $("#degradationPreference"),
  gameAudioToggle: $("#gameAudioToggle"),
  autoNetworkMode: $("#autoNetworkMode"),
  applyQuality: $("#applyQuality"),
  lowLatencyBtn: $("#lowLatencyBtn"),

  serverPingBadge: $("#serverPingBadge"),
  peerPingBadge: $("#peerPingBadge"),
  serverPingValue: $("#serverPingValue"),
  peerRttValue: $("#peerRttValue"),
  streamBitrateValue: $("#streamBitrateValue"),
  packetLossValue: $("#packetLossValue"),
  inputDelayValue: $("#inputDelayValue"),
  turnStatusValue: $("#turnStatusValue"),
  networkAdvice: $("#networkAdvice"),

  serverUrl: $("#serverUrl"),
  stunUrl: $("#stunUrl"),
  turnUrl: $("#turnUrl"),
  turnUsername: $("#turnUsername"),
  turnPassword: $("#turnPassword"),
  saveSettings: $("#saveSettings"),
  openDebug: $("#openDebug"),

  streamTitle: $("#streamTitle"),
  streamStage: $("#streamStage"),
  localVideo: $("#localVideo"),
  remoteVideo: $("#remoteVideo"),
  emptyStage: $("#emptyStage"),
  tinyOverlay: $("#tinyOverlay"),
  warningOverlay: $("#warningOverlay"),
  lockControls: $("#lockControls"),
  fullscreenBtn: $("#fullscreenBtn"),
  localCameraVideo: $("#localCameraVideo"),
  cameraPreview: $("#cameraPreview"),
  remoteCameraStrip: $("#remoteCameraStrip"),

  debugPanel: $("#debugPanel"),
  debugLog: $("#debugLog"),
  copyLog: $("#copyLog"),
  clearLog: $("#clearLog"),
  toast: $("#toast")
};

const DEFAULT_SETTINGS = {
  serverUrl: "ws://localhost:8787",
  stunUrl: "stun:stun.l.google.com:19302",
  turnUrl: "",
  turnUsername: "",
  turnPassword: "",
  theme: "light",
  resolution: "640x360",
  fps: 15,
  imageQuality: 45,
  bitrateKbps: 700,
  degradationPreference: "maintain-framerate",
  gameAudio: true,
  autoNetworkMode: true,
  antiEcho: true,
  pushToTalkKey: "KeyV",
  captureSourceId: "",
  layout: {}
};

const DEFAULT_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight"];

const KEYBOARD_ROWS = [
  [
    ["Escape", "Esc"], ["Digit1", "1"], ["Digit2", "2"], ["Digit3", "3"], ["Digit4", "4"], ["Digit5", "5"], ["Digit6", "6"], ["Digit7", "7"], ["Digit8", "8"], ["Digit9", "9"], ["Digit0", "0"], ["Minus", "-"], ["Equal", "="], ["Backspace", "Back"]
  ],
  [
    ["Tab", "Tab"], ["KeyQ", "Q"], ["KeyW", "W"], ["KeyE", "E"], ["KeyR", "R"], ["KeyT", "T"], ["KeyY", "Y"], ["KeyU", "U"], ["KeyI", "I"], ["KeyO", "O"], ["KeyP", "P"], ["BracketLeft", "["], ["BracketRight", "]"], ["Backslash", "\\"]
  ],
  [
    ["CapsLock", "Caps"], ["KeyA", "A"], ["KeyS", "S"], ["KeyD", "D"], ["KeyF", "F"], ["KeyG", "G"], ["KeyH", "H"], ["KeyJ", "J"], ["KeyK", "K"], ["KeyL", "L"], ["Semicolon", ";"], ["Quote", "'"], ["Enter", "Enter"]
  ],
  [
    ["ShiftLeft", "Shift"], ["KeyZ", "Z"], ["KeyX", "X"], ["KeyC", "C"], ["KeyV", "V"], ["KeyB", "B"], ["KeyN", "N"], ["KeyM", "M"], ["Comma", ","], ["Period", "."], ["Slash", "/"], ["ShiftRight", "Shift"]
  ],
  [
    ["ControlLeft", "Ctrl"], ["AltLeft", "Alt"], ["Space", "Space"], ["AltRight", "Alt"], ["ControlRight", "Ctrl"], ["ArrowLeft", "←"], ["ArrowUp", "↑"], ["ArrowDown", "↓"], ["ArrowRight", "→"]
  ]
];

const state = {
  role: null,
  ws: null,
  peerId: null,
  room: null,
  localGameStream: null,
  localPartyStream: null,
  gameStreamId: null,
  partyStreamId: null,
  peers: new Map(),
  pendingIce: new Map(),
  captureSources: [],
  settings: { ...DEFAULT_SETTINGS },
  locked: false,
  pressedCodes: new Set(),
  pingTimer: null,
  statsTimer: null,
  statsSnapshot: new Map(),
  serverPing: null,
  peerRtt: null,
  streamBitrate: null,
  packetLoss: null,
  inputDelay: null,
  adaptiveFactor: 1,
  layoutEditing: false,
  layoutDrag: null,
  panelZ: 10,
  logs: []
};

function log(level, message, data) {
  const time = new Date().toLocaleTimeString([], { hour12: false });
  const suffix = data ? ` ${safeJson(data)}` : "";
  const line = `[${time}] ${level.toUpperCase()} ${message}${suffix}`;
  state.logs.push(line);
  if (state.logs.length > 700) state.logs.shift();

  const span = document.createElement("span");
  span.textContent = line + "\n";
  span.className = `log-${level}`;
  ui.debugLog.appendChild(span);
  ui.debugLog.scrollTop = ui.debugLog.scrollHeight;
}

function safeJson(data) {
  try { return JSON.stringify(data); } catch { return String(data); }
}

function toast(message, duration = 3200) {
  ui.toast.textContent = message;
  ui.toast.classList.remove("hidden");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ui.toast.classList.add("hidden"), duration);
}

function showScreen(name) {
  Object.entries(ui.screens).forEach(([key, el]) => el.classList.toggle("hidden", key !== name));
  ui.navButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.screen === name));

  const titles = {
    home: ["Remote local co-op, optimized for weak internet.", "Start simple. Open advanced panels only when needed."],
    host: ["Host a game.", "Choose a window, room size, and approve players."],
    join: ["Join a room.", "Enter code, wait for approval, then lock controls."],
    party: ["Party controls.", "Manage people, cameras, mics, and permissions."],
    network: ["Network and stream quality.", "Change quality live without leaving the room."],
    settings: ["Advanced settings.", "Signaling, STUN, TURN, theme, and debug."]
  };

  const [title, subtitle] = titles[name] || titles.home;
  ui.pageTitle.textContent = title;
  ui.pageSubtitle.textContent = subtitle;
}

function loadSettings() {
  try {
    state.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem("remoteCoopV3Settings") || "{}") };
  } catch {
    state.settings = { ...DEFAULT_SETTINGS };
  }

  ui.serverUrl.value = state.settings.serverUrl;
  ui.stunUrl.value = state.settings.stunUrl;
  ui.turnUrl.value = state.settings.turnUrl;
  ui.turnUsername.value = state.settings.turnUsername;
  ui.turnPassword.value = state.settings.turnPassword;
  ui.resolutionSelect.value = state.settings.resolution;
  ui.fpsSelect.value = String(state.settings.fps);
  ui.imageQuality.value = String(state.settings.imageQuality);
  ui.bitrateSlider.value = String(state.settings.bitrateKbps);
  ui.degradationPreference.value = state.settings.degradationPreference;
  ui.gameAudioToggle.checked = Boolean(state.settings.gameAudio);
  ui.autoNetworkMode.checked = Boolean(state.settings.autoNetworkMode);
  ui.antiEchoToggle.checked = Boolean(state.settings.antiEcho);
  ui.pttKeyButton.textContent = keyCodeToLabel(state.settings.pushToTalkKey || "KeyV");
  applyTheme(state.settings.theme);
  updateQualityLabels();
}

function saveSettings() {
  state.settings = {
    ...state.settings,
    serverUrl: ui.serverUrl.value.trim() || DEFAULT_SETTINGS.serverUrl,
    stunUrl: ui.stunUrl.value.trim() || DEFAULT_SETTINGS.stunUrl,
    turnUrl: ui.turnUrl.value.trim(),
    turnUsername: ui.turnUsername.value.trim(),
    turnPassword: ui.turnPassword.value,
    resolution: ui.resolutionSelect.value,
    fps: Number(ui.fpsSelect.value),
    imageQuality: Number(ui.imageQuality.value),
    bitrateKbps: Number(ui.bitrateSlider.value),
    degradationPreference: ui.degradationPreference.value,
    gameAudio: ui.gameAudioToggle.checked,
    autoNetworkMode: ui.autoNetworkMode.checked,
    antiEcho: ui.antiEchoToggle.checked,
    antiEcho: ui.antiEchoToggle.checked,
    pushToTalkKey: state.settings.pushToTalkKey || "KeyV",
    captureSourceId: ui.captureSource.value || state.settings.captureSourceId,
    theme: state.settings.theme
  };

  localStorage.setItem("remoteCoopV3Settings", JSON.stringify(state.settings));
  updateQualityLabels();
}

function applyTheme(theme) {
  const value = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = value;
  ui.themeToggle.textContent = value === "dark" ? "Light mode" : "Dark mode";
}

function toggleTheme() {
  state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
  applyTheme(state.settings.theme);
  saveSettings();
}

function getQuality() {
  const [width, height] = ui.resolutionSelect.value.split("x").map(Number);
  return {
    width,
    height,
    fps: Number(ui.fpsSelect.value),
    imageQuality: Number(ui.imageQuality.value),
    bitrate: Number(ui.bitrateSlider.value) * 1000,
    degradationPreference: ui.degradationPreference.value,
    gameAudio: ui.gameAudioToggle.checked,
    autoNetworkMode: ui.autoNetworkMode.checked,
    antiEcho: ui.antiEchoToggle.checked
  };
}

function updateQualityLabels() {
  const q = getQuality();
  ui.imageQualityLabel.textContent = `${q.imageQuality}%`;
  ui.bitrateLabel.textContent = formatBitrate(q.bitrate);
}


function keyCodeToLabel(code) {
  for (const row of KEYBOARD_ROWS) {
    const found = row.find(([value]) => value === code);
    if (found) return found[1];
  }
  return String(code || "V").replace("Key", "");
}

function syncPeersFromRoom() {
  if (!state.room || !state.peerId) return;
  const members = state.room.members || [];

  for (const member of members) {
    if (member.peerId === state.peerId) continue;
    const initiator = state.peerId < member.peerId;
    ensurePeer(member.peerId, initiator).catch((error) => {
      log("warn", "Could not sync peer", { peerId: member.peerId, error: error.message });
    });
  }
}

function classifyIncomingTrack(peer, event) {
  const streamId = event.streams && event.streams[0] ? event.streams[0].id : "";

  if (peer.remoteGameStreamId && streamId === peer.remoteGameStreamId) return "game";
  if (peer.remotePartyStreamId && streamId === peer.remotePartyStreamId) return "party";

  const fromHost = peer.peerId === state.room?.hostPeerId;

  if (fromHost && state.role === "guest" && event.track.kind === "video" && !ui.remoteVideo.srcObject) return "game";
  if (fromHost && state.role === "guest" && event.track.kind === "audio" && !peer.remoteStream.getAudioTracks().length) return "game";

  return "party";
}

function signalMeta() {
  return {
    gameStreamId: state.role === "host" && state.localGameStream ? state.localGameStream.id : null,
    partyStreamId: state.localPartyStream ? state.localPartyStream.id : null
  };
}

function applySignalMeta(peer, meta) {
  if (!peer || !meta) return;
  if (meta.gameStreamId) peer.remoteGameStreamId = meta.gameStreamId;
  if (meta.partyStreamId) peer.remotePartyStreamId = meta.partyStreamId;
}

function updateGameAudioTracks() {
  if (!state.localGameStream) return;

  const q = getQuality();
  const partyVoiceActive = Boolean(state.localPartyStream && state.localPartyStream.getAudioTracks().length);
  const allowGameAudio = q.gameAudio && !(state.role === "host" && q.antiEcho && partyVoiceActive);

  for (const track of state.localGameStream.getAudioTracks()) {
    track.enabled = allowGameAudio;
  }

  if (q.gameAudio && !allowGameAudio) {
    showWarning("Anti-echo: game audio capture paused while party voice is active");
  }
}

async function applyRemoteMediaControl(msg) {
  if (msg.camera === false) ui.cameraToggle.checked = false;
  if (msg.mic === false) ui.micToggle.checked = false;
  await startLocalPartyMedia();
  toast(msg.reason || "Host changed your camera/mic access.", 3500);
}


function formatBitrate(bps) {
  if (!Number.isFinite(bps)) return "--";
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  return `${Math.round(bps / 1000)} kbps`;
}

function getIceServers() {
  const servers = [];
  if (state.settings.stunUrl) servers.push({ urls: state.settings.stunUrl });

  if (state.settings.turnUrl) {
    const turn = { urls: state.settings.turnUrl };
    if (state.settings.turnUsername) turn.username = state.settings.turnUsername;
    if (state.settings.turnPassword) turn.credential = state.settings.turnPassword;
    servers.push(turn);
  }

  return servers;
}

function sendWs(payload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    log("warn", "Signaling not connected", payload);
    return false;
  }

  state.ws.send(JSON.stringify(payload));
  return true;
}

async function connectSignaling() {
  saveSettings();

  if (state.ws && state.ws.readyState === WebSocket.OPEN) return;

  if (state.ws) {
    try { state.ws.close(); } catch {}
  }

  state.ws = new WebSocket(state.settings.serverUrl);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Signaling connection timed out.")), 10000);

    state.ws.addEventListener("open", () => {
      clearTimeout(timeout);
      log("info", "Signaling connected", { server: state.settings.serverUrl });
      startServerPing();
      resolve();
    }, { once: true });

    state.ws.addEventListener("error", () => {
      clearTimeout(timeout);
      reject(new Error("Could not connect to signaling server."));
    }, { once: true });
  });

  state.ws.addEventListener("message", (event) => handleWsMessage(JSON.parse(event.data)));
  state.ws.addEventListener("close", () => log("warn", "Signaling disconnected"));
}

function handleWsMessage(msg) {
  switch (msg.type) {
    case "welcome":
      state.peerId = msg.peerId;
      log("info", "Welcome", msg);
      break;

    case "room-created":
      state.room = msg.room;
      state.role = "host";
      ui.roomCode.textContent = msg.roomCode;
      ui.roomBox.classList.remove("hidden");
      ui.startHost.disabled = true;
      ui.stopHost.disabled = false;
      ui.streamTitle.textContent = "Hosting stream";
      showScreen("host");
      renderRoom();
      toast(`Room created: ${msg.roomCode}`);
      break;

    case "room-state":
      state.room = msg.room;
      renderRoom();
      syncPeersFromRoom();
      break;

    case "join-request":
      state.room = msg.room || state.room;
      renderRoom();
      toast(`${msg.member?.name || "Guest"} wants to join.`);
      break;

    case "join-request-sent":
      state.room = msg.room || state.room;
      ui.joinRoom.disabled = true;
      ui.leaveRoom.disabled = false;
      toast("Request sent. Waiting for host approval.");
      renderRoom();
      break;

    case "guest-accepted":
      state.role = "guest";
      state.room = msg.room;
      showScreen("party");
      ui.leaveRoom.disabled = false;
      toast("Host accepted you.");
      ensurePeer(msg.hostPeerId, state.peerId < msg.hostPeerId);
      syncPeersFromRoom();
      break;

    case "guest-connected":
      state.room = msg.room || state.room;
      renderRoom();
      if (state.role === "host") ensurePeer(msg.guestPeerId, true);
      break;

    case "guest-left":
      closePeer(msg.guestPeerId);
      state.room = msg.room || state.room;
      renderRoom();
      break;

    case "guest-rejected":
      toast("Host rejected the request.");
      resetGuest();
      break;

    case "member-permissions":
      state.room = msg.room || state.room;
      renderRoom();
      toast("Host updated your input permissions.");
      break;

    case "signal":
      handleSignal(msg.fromPeerId, msg.payload);
      break;

    case "pong":
      if (msg.echo) {
        state.serverPing = Math.max(0, Date.now() - msg.echo);
        updateStatsUi();
      }
      break;

    case "room-closed":
      toast(`Room closed: ${msg.reason}`);
      resetAll();
      break;

    case "error":
      toast(msg.message || "Server error", 5000);
      log("error", msg.message || "Server error", msg);
      break;

    default:
      log("warn", "Unknown signaling message", msg);
  }
}

function startServerPing() {
  clearInterval(state.pingTimer);
  state.pingTimer = setInterval(() => {
    sendWs({ type: "ping", at: Date.now() });
  }, 1000);
}

async function loadCaptureSources() {
  ui.captureSource.innerHTML = "";
  const fallback = document.createElement("option");
  fallback.value = "__picker";
  fallback.textContent = "Use system picker";
  ui.captureSource.appendChild(fallback);

  try {
    state.captureSources = await window.remoteCoop.listCaptureSources();

    for (const source of state.captureSources) {
      const option = document.createElement("option");
      option.value = source.id;
      option.textContent = `${source.type === "screen" ? "Screen" : "Window"} · ${source.name}`;
      ui.captureSource.appendChild(option);
    }

    const exists = Array.from(ui.captureSource.options).some((option) => option.value === state.settings.captureSourceId);
    ui.captureSource.value = exists ? state.settings.captureSourceId : (state.captureSources[0]?.id || "__picker");
  } catch (error) {
    log("error", "Could not load capture sources", { error: error.message });
    toast("Could not list windows. Using system picker.");
  }
}

function buildDesktopConstraints(sourceId, audio) {
  const q = getQuality();

  return {
    audio: audio ? { mandatory: { chromeMediaSource: "desktop" } } : false,
    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: sourceId,
        minWidth: 320,
        maxWidth: q.width,
        minHeight: 180,
        maxHeight: q.height,
        maxFrameRate: q.fps
      }
    }
  };
}

async function captureGameStream() {
  saveSettings();

  if (ui.captureSource.options.length === 0) await loadCaptureSources();

  const q = getQuality();
  const sourceId = ui.captureSource.value || "__picker";
  let stream;

  try {
    if (sourceId !== "__picker") {
      try {
        stream = await navigator.mediaDevices.getUserMedia(buildDesktopConstraints(sourceId, true));
      } catch (audioError) {
        log("warn", "Capture with audio failed, retrying video only", { error: audioError.message });
        stream = await navigator.mediaDevices.getUserMedia(buildDesktopConstraints(sourceId, false));
      }
    } else {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: q.width, max: q.width },
          height: { ideal: q.height, max: q.height },
          frameRate: { ideal: q.fps, max: q.fps }
        },
        audio: true
      });
    }
  } catch (error) {
    throw new Error(`Capture failed: ${error.message}`);
  }

  const video = stream.getVideoTracks()[0];
  if (video) video.contentHint = "motion";

  for (const audio of stream.getAudioTracks()) {
    audio.enabled = q.gameAudio;
  }

  return stream;
}

async function startHosting() {
  try {
    await connectSignaling();

    state.role = "host";
    state.localGameStream = await captureGameStream();
    state.gameStreamId = state.localGameStream.id;
    await window.remoteCoop.setInputEnabled(true);
    ui.panicInput.disabled = false;
    ui.localVideo.srcObject = state.localGameStream;
    ui.localVideo.classList.remove("hidden");
    ui.remoteVideo.classList.add("hidden");
    ui.emptyStage.classList.add("hidden");
    ui.streamTitle.textContent = "Local preview";

    sendWs({
      type: "create-room",
      name: ui.hostName.value.trim() || "Host",
      maxPeople: Number(ui.maxPeople.value || 2)
    });

    await applyQualityToAll();
    startStats();
  } catch (error) {
    toast(error.message, 6000);
    log("error", "Start hosting failed", { error: error.message });
  }
}

async function stopHosting() {
  sendWs({ type: "leave-room" });
  resetAll();
}

async function joinRoom() {
  try {
    await connectSignaling();
    state.role = "guest";

    sendWs({
      type: "join-room",
      roomCode: ui.joinCode.value.trim().toUpperCase(),
      name: ui.guestName.value.trim() || "Player"
    });
  } catch (error) {
    toast(error.message, 6000);
    log("error", "Join failed", { error: error.message });
  }
}

function resetAll() {
  for (const peerId of Array.from(state.peers.keys())) closePeer(peerId);

  stopTracks(state.localGameStream);
  stopTracks(state.localPartyStream);

  state.role = null;
  state.room = null;
  state.localGameStream = null;
  state.localPartyStream = null;
  state.locked = false;
  state.peers.clear();

  ui.localVideo.srcObject = null;
  ui.remoteVideo.srcObject = null;
  ui.localCameraVideo.srcObject = null;
  ui.localVideo.classList.add("hidden");
  ui.remoteVideo.classList.remove("hidden");
  ui.emptyStage.classList.remove("hidden");
  ui.cameraPreview.classList.add("hidden");
  ui.remoteCameraStrip.innerHTML = "";
  ui.roomBox.classList.add("hidden");
  ui.roomCode.textContent = "------";
  ui.startHost.disabled = false;
  ui.stopHost.disabled = true;
  ui.panicInput.disabled = true;
  window.remoteCoop.setInputEnabled(false).catch(() => {});
  ui.joinRoom.disabled = false;
  ui.leaveRoom.disabled = true;
  ui.lockControls.textContent = "Lock controls";
  ui.streamTitle.textContent = "No active stream";
  renderRoom();
  updateStatsUi();
}

function resetGuest() {
  for (const peerId of Array.from(state.peers.keys())) closePeer(peerId);
  state.role = null;
  state.room = null;
  ui.joinRoom.disabled = false;
  ui.leaveRoom.disabled = true;
  ui.emptyStage.classList.remove("hidden");
  renderRoom();
}

function stopTracks(stream) {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try { track.stop(); } catch {}
  }
}

async function ensurePeer(targetPeerId, initiator) {
  if (!targetPeerId || targetPeerId === state.peerId) return;
  if (state.peers.has(targetPeerId)) return state.peers.get(targetPeerId);

  const pc = new RTCPeerConnection({ iceServers: getIceServers() });
  const peer = {
    peerId: targetPeerId,
    pc,
    dc: null,
    remoteStream: new MediaStream(),
    cameraStream: new MediaStream(),
    remoteGameStreamId: null,
    remotePartyStreamId: null,
    stats: new Map()
  };

  state.peers.set(targetPeerId, peer);

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendWs({
        type: "signal",
        roomCode: state.room?.code,
        targetPeerId,
        payload: { type: "ice", candidate: event.candidate }
      });
    }
  };

  pc.onconnectionstatechange = () => {
    log("info", `Peer ${targetPeerId} connection ${pc.connectionState}`);
    updateStatsUi();
  };

  pc.ontrack = (event) => {
    const track = event.track;
    const kind = classifyIncomingTrack(peer, event);

    if (kind === "game") {
      peer.remoteStream.addTrack(track);

      if (track.kind === "video") {
        ui.remoteVideo.srcObject = peer.remoteStream;
        ui.remoteVideo.classList.remove("hidden");
        ui.localVideo.classList.add("hidden");
        ui.emptyStage.classList.add("hidden");
        ui.streamTitle.textContent = "Remote game stream";
      }
      return;
    }

    if (kind === "party") {
      if (track.kind === "video") {
        peer.cameraStream.addTrack(track);
        renderCameraTile(targetPeerId, peer.cameraStream);
      } else if (track.kind === "audio") {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.srcObject = new MediaStream([track]);
        audio.dataset.peerId = targetPeerId;
        document.body.appendChild(audio);
      }
    }
  };

  pc.ondatachannel = (event) => {
    setupDataChannel(peer, event.channel);
  };

  if (state.role === "host" && state.localGameStream) {
    for (const track of state.localGameStream.getTracks()) {
      pc.addTrack(track, state.localGameStream);
    }
  }

  if (state.localPartyStream) {
    for (const track of state.localPartyStream.getTracks()) {
      pc.addTrack(track, state.localPartyStream);
    }
  }

  if (initiator) {
    setupDataChannel(peer, pc.createDataChannel("input", { ordered: false, maxRetransmits: 0 }));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendWs({
      type: "signal",
      roomCode: state.room?.code,
      targetPeerId,
      payload: { type: "offer", sdp: pc.localDescription, meta: signalMeta() }
    });
  }

  await applyQualityToPeer(peer);
  startStats();
  return peer;
}

function setupDataChannel(peer, dc) {
  peer.dc = dc;
  dc.onopen = () => log("info", "Input channel open", { peerId: peer.peerId });
  dc.onclose = () => log("warn", "Input channel closed", { peerId: peer.peerId });
  dc.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      handleDataMessage(peer.peerId, msg);
    } catch (error) {
      log("error", "Bad data message", { error: error.message });
    }
  };
}

async function handleSignal(fromPeerId, payload) {
  const peer = await ensurePeer(fromPeerId, false);
  const pc = peer.pc;

  if (payload.type === "offer") {
    applySignalMeta(peer, payload.meta);
    await pc.setRemoteDescription(payload.sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendWs({
      type: "signal",
      roomCode: state.room?.code,
      targetPeerId: fromPeerId,
      payload: { type: "answer", sdp: pc.localDescription, meta: signalMeta() }
    });
  } else if (payload.type === "answer") {
    applySignalMeta(peer, payload.meta);
    await pc.setRemoteDescription(payload.sdp);
  } else if (payload.type === "ice") {
    try {
      await pc.addIceCandidate(payload.candidate);
    } catch (error) {
      log("warn", "Could not add ICE candidate", { error: error.message });
    }
  }
}

function closePeer(peerId) {
  const peer = state.peers.get(peerId);
  if (!peer) return;

  try { peer.dc?.close(); } catch {}
  try { peer.pc?.close(); } catch {}

  state.peers.delete(peerId);
  document.querySelectorAll(`[data-peer-camera="${peerId}"], audio[data-peer-id="${peerId}"]`).forEach((el) => el.remove());
}

function getMember(peerId) {
  if (!state.room) return null;
  return state.room.members?.find((m) => m.peerId === peerId) || state.room.pending?.find((m) => m.peerId === peerId) || null;
}

function handleDataMessage(peerId, msg) {
  if (msg.kind === "pong-input") {
    state.inputDelay = Math.max(0, Date.now() - msg.at);
    updateStatsUi();
    return;
  }

  if (msg.kind === "media-control") {
    applyRemoteMediaControl(msg);
    return;
  }

  if (state.role !== "host") return;

  if (msg.kind === "ping-input") {
    sendData(peerId, { kind: "pong-input", at: msg.at });
    return;
  }

  const member = getMember(peerId);
  const perms = member?.permissions || {};

  if (msg.kind === "key") {
    if (!perms.keyboard) return;
    if (!perms.allowedKeys?.includes("*") && !perms.allowedKeys?.includes(msg.code)) return;
    window.remoteCoop.sendInput({ type: "key", action: msg.action, code: msg.code }).then((result) => {
      if (!result.ok) log("warn", "Host input refused", result);
    });
    return;
  }

  if (msg.kind === "mouse") {
    if (msg.action === "move" && !perms.mouseMove) return;
    if (["down", "up", "click"].includes(msg.action) && !perms.mouseButtons) return;
    if (msg.action === "wheel" && !perms.mouseWheel) return;
    window.remoteCoop.sendInput({ type: "mouse", ...msg }).then((result) => {
      if (!result.ok) log("warn", "Host mouse input refused", result);
    });
  }
}

function sendData(peerId, payload) {
  const peer = state.peers.get(peerId);
  if (!peer?.dc || peer.dc.readyState !== "open") return false;
  peer.dc.send(JSON.stringify(payload));
  return true;
}

async function startLocalPartyMedia() {
  const needCamera = ui.cameraToggle.checked;
  const needMic = ui.micToggle.checked;

  if (!needCamera && !needMic) {
    stopTracks(state.localPartyStream);
    state.localPartyStream = null;
    ui.cameraPreview.classList.add("hidden");
    updateGameAudioTracks();
    broadcastMediaState();
    await renegotiateAll();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: needCamera ? { width: { ideal: 240 }, height: { ideal: 135 }, frameRate: { ideal: 12, max: 15 } } : false,
      audio: needMic
    });

    if (ui.pushToTalk.checked) {
      for (const track of stream.getAudioTracks()) track.enabled = false;
    }

    stopTracks(state.localPartyStream);
    state.localPartyStream = stream;
    state.partyStreamId = stream.id;

    ui.localCameraVideo.srcObject = stream;
    ui.cameraPreview.classList.toggle("hidden", !needCamera);

    await addOrReplacePartyTracks(stream);
    updateGameAudioTracks();
    await renegotiateAll();
    broadcastMediaState();
  } catch (error) {
    toast(`Camera/mic failed: ${error.message}`, 5000);
    log("error", "Party media failed", { error: error.message });
    ui.cameraToggle.checked = false;
    ui.micToggle.checked = false;
  }
}

async function addOrReplacePartyTracks(stream) {
  for (const peer of state.peers.values()) {
    for (const track of stream.getTracks()) {
      const sender = peer.pc.getSenders().find((s) => s.track && s.track.kind === track.kind && state.localPartyStream && state.localPartyStream.getTracks().includes(s.track));
      if (sender) {
        await sender.replaceTrack(track);
      } else {
        peer.pc.addTrack(track, stream);
      }
    }
  }
}

async function renegotiateAll() {
  if (state.role !== "host" && state.role !== "guest") return;

  for (const peer of state.peers.values()) {
    if (!peer.pc || peer.pc.signalingState !== "stable") continue;
    try {
      const offer = await peer.pc.createOffer();
      await peer.pc.setLocalDescription(offer);
      sendWs({
        type: "signal",
        roomCode: state.room?.code,
        targetPeerId: peer.peerId,
        payload: { type: "offer", sdp: peer.pc.localDescription }
      });
    } catch (error) {
      log("warn", "Renegotiation failed", { peerId: peer.peerId, error: error.message });
    }
  }
}

function broadcastMediaState() {
  sendWs({
    type: "member-media",
    roomCode: state.room?.code,
    camera: ui.cameraToggle.checked,
    mic: ui.micToggle.checked
  });
}

async function applyQualityNow() {
  saveSettings();
  updateQualityLabels();

  if (state.role === "host" && state.localGameStream) {
    await refreshGameCapture();
  }

  await applyQualityToAll();
  updateStatsUi();
  toast("Quality updated.");
}

async function refreshGameCapture() {
  if (state.role !== "host") return;

  const oldStream = state.localGameStream;
  const newStream = await captureGameStream();
  const newVideo = newStream.getVideoTracks()[0];
  const newAudio = newStream.getAudioTracks()[0] || null;

  for (const peer of state.peers.values()) {
    const videoSender = peer.pc.getSenders().find((sender) => sender.track?.kind === "video");
    if (videoSender && newVideo) await videoSender.replaceTrack(newVideo);

    const audioSender = peer.pc.getSenders().find((sender) => sender.track?.kind === "audio" && oldStream?.getAudioTracks().includes(sender.track));
    if (audioSender) await audioSender.replaceTrack(newAudio);
    else if (newAudio) peer.pc.addTrack(newAudio, newStream);
  }

  state.localGameStream = newStream;
  state.gameStreamId = newStream.id;
  updateGameAudioTracks();
  ui.localVideo.srcObject = newStream;
  stopTracks(oldStream);

  await renegotiateAll();
}

async function applyQualityToAll() {
  for (const peer of state.peers.values()) {
    await applyQualityToPeer(peer);
  }
}

async function applyQualityToPeer(peer) {
  const q = getQuality();
  const targetBitrate = Math.round(q.bitrate * state.adaptiveFactor);

  for (const sender of peer.pc.getSenders()) {
    if (!sender.track || sender.track.kind !== "video") continue;

    try {
      const params = sender.getParameters();
      if (!params.encodings || !params.encodings.length) params.encodings = [{}];

      params.encodings[0].maxBitrate = targetBitrate;
      params.encodings[0].maxFramerate = q.fps;
      params.degradationPreference = q.degradationPreference;

      await sender.setParameters(params);
    } catch (error) {
      log("warn", "Could not apply sender quality", { error: error.message });
    }
  }
}

function setLowLatency() {
  ui.resolutionSelect.value = "640x360";
  ui.fpsSelect.value = "15";
  ui.imageQuality.value = "35";
  ui.bitrateSlider.value = "450";
  ui.degradationPreference.value = "maintain-framerate";
  ui.gameAudioToggle.checked = false;
  ui.cameraToggle.checked = false;
  ui.micToggle.checked = false;
  updateQualityLabels();
  saveSettings();
  toast("Low latency setup applied. Click Apply now if already streaming.");
}

function updateRoomSettings() {
  if (state.role !== "host" || !state.room) return;

  sendWs({
    type: "update-room",
    roomCode: state.room.code,
    maxPeople: Number(ui.maxPeople.value || 2),
    allowJoin: ui.allowJoins.checked
  });
}

function updatePermissions(peerId, partial) {
  if (state.role !== "host" || !state.room) return;

  const member = getMember(peerId);
  const base = member?.permissions || {};
  const permissions = { ...base, ...partial };

  sendWs({
    type: "update-permissions",
    roomCode: state.room.code,
    peerId,
    permissions
  });
}

function renderRoom() {
  const room = state.room;

  if (!room) {
    ui.memberList.textContent = "No party yet.";
    ui.memberList.classList.add("empty-list");
    ui.pendingList.textContent = "No pending requests.";
    ui.pendingList.classList.add("empty-list");
    return;
  }

  ui.maxPeople.value = room.maxPeople || ui.maxPeople.value;
  ui.allowJoins.checked = room.allowJoin !== false;

  renderPending(room.pending || []);
  renderMembers(room.members || []);
}

function renderPending(pending) {
  ui.pendingList.innerHTML = "";

  if (!pending.length) {
    ui.pendingList.textContent = "No pending requests.";
    ui.pendingList.classList.add("empty-list");
    return;
  }

  ui.pendingList.classList.remove("empty-list");

  for (const member of pending) {
    const card = document.createElement("div");
    card.className = "member-card";
    card.innerHTML = `
      <div class="member-head">
        <div><strong>${escapeHtml(member.name)}</strong><span>Waiting for approval</span></div>
      </div>
      <div class="button-row">
        <button class="primary-btn small-btn" data-accept="${member.peerId}">Accept</button>
        <button class="danger-btn small-btn" data-reject="${member.peerId}">Reject</button>
      </div>
    `;
    ui.pendingList.appendChild(card);
  }

  ui.pendingList.querySelectorAll("[data-accept]").forEach((btn) => {
    btn.addEventListener("click", () => sendWs({ type: "accept-guest", roomCode: state.room.code, guestPeerId: btn.dataset.accept }));
  });

  ui.pendingList.querySelectorAll("[data-reject]").forEach((btn) => {
    btn.addEventListener("click", () => sendWs({ type: "reject-guest", roomCode: state.room.code, guestPeerId: btn.dataset.reject }));
  });
}

function renderMembers(members) {
  ui.memberList.innerHTML = "";

  if (!members.length) {
    ui.memberList.textContent = "No party yet.";
    ui.memberList.classList.add("empty-list");
    return;
  }

  ui.memberList.classList.remove("empty-list");

  for (const member of members) {
    const isMe = member.peerId === state.peerId;
    const canEdit = state.role === "host" && member.role !== "host";
    const p = member.permissions || {};
    const card = document.createElement("div");
    card.className = "member-card";
    card.innerHTML = `
      <div class="member-head">
        <div>
          <strong>${escapeHtml(member.name)}${isMe ? " (you)" : ""}</strong>
          <span>${member.role} · camera ${member.media?.camera ? "on" : "off"} · mic ${member.media?.mic ? "on" : "off"}</span>
        </div>
      </div>
      ${canEdit ? `
        <div class="permission-grid">
          <label><input type="checkbox" data-perm="keyboard" ${p.keyboard ? "checked" : ""}> Keyboard</label>
          <label><input type="checkbox" data-perm="mouseMove" ${p.mouseMove ? "checked" : ""}> Mouse move</label>
          <label><input type="checkbox" data-perm="mouseButtons" ${p.mouseButtons ? "checked" : ""}> Mouse clicks</label>
          <label><input type="checkbox" data-perm="mouseWheel" ${p.mouseWheel ? "checked" : ""}> Mouse wheel</label>
        </div>
        <div class="button-row">
          <button class="secondary-btn small-btn" data-media="mute">Mute mic</button>
          <button class="secondary-btn small-btn" data-media="camera-off">Disable camera</button>
        </div>
        <div class="keyboard-picker" data-keyboard></div>
      ` : ""}
    `;

    if (canEdit) {
      card.querySelectorAll("[data-perm]").forEach((input) => {
        input.addEventListener("change", () => updatePermissions(member.peerId, { [input.dataset.perm]: input.checked }));
      });

      card.querySelector('[data-media="mute"]').addEventListener("click", () => sendData(member.peerId, { kind: "media-control", mic: false, reason: "Host muted your mic." }));
      card.querySelector('[data-media="camera-off"]').addEventListener("click", () => sendData(member.peerId, { kind: "media-control", camera: false, reason: "Host disabled your camera." }));

      renderKeyboardPicker(card.querySelector("[data-keyboard]"), member);
    }

    ui.memberList.appendChild(card);
  }
}

function renderKeyboardPicker(container, member) {
  const permissions = member.permissions || {};
  const selected = new Set(permissions.allowedKeys || DEFAULT_KEYS);
  let dragging = false;
  let dragValue = true;

  container.innerHTML = "";

  for (const row of KEYBOARD_ROWS) {
    const rowEl = document.createElement("div");
    rowEl.className = "keyboard-row";

    for (const [code, label] of row) {
      const key = document.createElement("button");
      key.type = "button";
      key.className = "keyboard-key";
      key.dataset.code = code;
      key.textContent = label;
      key.classList.toggle("selected", selected.has(code) || selected.has("*"));

      const setKey = (value) => {
        if (value) selected.add(code);
        else selected.delete(code);
        key.classList.toggle("selected", value);
      };

      key.addEventListener("mousedown", (event) => {
        event.preventDefault();
        dragging = true;
        dragValue = !(selected.has(code) || selected.has("*"));
        setKey(dragValue);
      });

      key.addEventListener("mouseenter", () => {
        if (dragging) setKey(dragValue);
      });

      key.addEventListener("click", () => {
        updatePermissions(member.peerId, { allowedKeys: Array.from(selected) });
      });

      rowEl.appendChild(key);
    }

    container.appendChild(rowEl);
  }

  window.addEventListener("mouseup", () => {
    if (!dragging) return;
    dragging = false;
    updatePermissions(member.peerId, { allowedKeys: Array.from(selected) });
  }, { once: true });
}

function renderCameraTile(peerId, stream) {
  let tile = ui.remoteCameraStrip.querySelector(`[data-peer-camera="${peerId}"]`);

  if (!tile) {
    tile = document.createElement("div");
    tile.className = "camera-tile";
    tile.dataset.peerCamera = peerId;
    tile.innerHTML = `<video autoplay playsinline></video><span>${escapeHtml(getMember(peerId)?.name || "Guest")}</span>`;
    ui.remoteCameraStrip.appendChild(tile);
  }

  tile.querySelector("video").srcObject = stream;
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
}

function lockControls() {
  if (state.role !== "guest") {
    toast("Only guests need lock controls.");
    return;
  }

  const peer = getHostPeer();
  if (!peer?.dc || peer.dc.readyState !== "open") {
    toast("Input channel is not ready yet.");
    return;
  }

  state.locked = !state.locked;
  ui.lockControls.textContent = state.locked ? "Unlock controls" : "Lock controls";

  if (state.locked) {
    ui.streamStage.focus();
    sendInputPing();
    toast("Controls locked. Press Escape to unlock.", 2200);
  } else {
    releasePressedKeys();
  }
}

function getHostPeer() {
  const hostId = state.room?.hostPeerId;
  return hostId ? state.peers.get(hostId) : Array.from(state.peers.values())[0];
}

function sendToHost(payload) {
  const peer = getHostPeer();
  if (!peer?.dc || peer.dc.readyState !== "open") return false;
  peer.dc.send(JSON.stringify(payload));
  return true;
}

function handleKeyDown(event) {
  if (ui.pushToTalk.checked && event.code === (state.settings.pushToTalkKey || "KeyV")) {
    setMicEnabled(true);
  }

  if (!state.locked) return;

  if (event.code === "Escape") {
    event.preventDefault();
    lockControls();
    return;
  }

  event.preventDefault();
  if (state.pressedCodes.has(event.code)) return;
  state.pressedCodes.add(event.code);
  sendToHost({ kind: "key", action: "down", code: event.code });
}

function handleKeyUp(event) {
  if (ui.pushToTalk.checked && event.code === (state.settings.pushToTalkKey || "KeyV")) {
    setMicEnabled(false);
  }

  if (!state.locked) return;

  event.preventDefault();
  state.pressedCodes.delete(event.code);
  sendToHost({ kind: "key", action: "up", code: event.code });
}

function releasePressedKeys() {
  for (const code of Array.from(state.pressedCodes)) {
    sendToHost({ kind: "key", action: "up", code });
    state.pressedCodes.delete(code);
  }
}

function pointerPayload(event, action) {
  const rect = ui.remoteVideo.getBoundingClientRect();
  const xRatio = clamp((event.clientX - rect.left) / rect.width, 0, 1);
  const yRatio = clamp((event.clientY - rect.top) / rect.height, 0, 1);
  return {
    kind: "mouse",
    action,
    xRatio,
    yRatio,
    button: event.button === 2 ? "right" : event.button === 1 ? "middle" : "left",
    deltaY: event.deltaY || 0
  };
}

function handlePointer(event, action) {
  if (!state.locked || state.role !== "guest") return;
  event.preventDefault();
  sendToHost(pointerPayload(event, action));
}

function setMicEnabled(enabled) {
  if (!state.localPartyStream) return;
  for (const track of state.localPartyStream.getAudioTracks()) {
    track.enabled = enabled && ui.micToggle.checked;
  }
}

function sendInputPing() {
  const at = Date.now();
  sendToHost({ kind: "ping-input", at });
}

function startStats() {
  clearInterval(state.statsTimer);
  state.statsSnapshot.clear();

  state.statsTimer = setInterval(async () => {
    try {
      for (const peer of state.peers.values()) {
        const stats = await peer.pc.getStats();
        readPeerStats(peer, stats);
      }

      if (state.role === "guest" && state.locked) sendInputPing();
      updateStatsUi();
      maybeAdaptQuality();
    } catch (error) {
      log("warn", "Stats read failed", { error: error.message });
    }
  }, 1500);
}

function readPeerStats(peer, stats) {
  stats.forEach((report) => {
    if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated && typeof report.currentRoundTripTime === "number") {
      state.peerRtt = Math.round(report.currentRoundTripTime * 1000);
    }

    if (report.type === "local-candidate" && report.candidateType === "relay") {
      ui.turnStatusValue.textContent = "Using TURN";
    }

    const isVideo = report.kind === "video" && (report.type === "outbound-rtp" || report.type === "inbound-rtp");
    if (!isVideo || report.isRemote) return;

    const key = `${peer.peerId}:${report.id}`;
    const previous = state.statsSnapshot.get(key);
    const bytes = report.bytesSent ?? report.bytesReceived;
    const packetsLost = report.packetsLost || 0;
    const packetsReceived = report.packetsReceived || 0;

    if (previous && typeof bytes === "number") {
      const deltaBytes = bytes - previous.bytes;
      const deltaMs = report.timestamp - previous.timestamp;
      if (deltaBytes >= 0 && deltaMs > 0) state.streamBitrate = (deltaBytes * 8 * 1000) / deltaMs;
    }

    if (packetsReceived + packetsLost > 0) {
      state.packetLoss = (packetsLost / (packetsReceived + packetsLost)) * 100;
    }

    if (typeof bytes === "number") state.statsSnapshot.set(key, { bytes, timestamp: report.timestamp });
  });
}

function maybeAdaptQuality() {
  if (state.role !== "host" || !ui.autoNetworkMode.checked) return;

  const bad = (state.peerRtt && state.peerRtt > 180) || (state.packetLoss && state.packetLoss > 3);
  const good = (!state.peerRtt || state.peerRtt < 90) && (!state.packetLoss || state.packetLoss < 1);

  if (bad && state.adaptiveFactor > 0.45) {
    state.adaptiveFactor = Math.max(0.45, state.adaptiveFactor - 0.12);
    applyQualityToAll();
    showWarning("Network unstable: lowering bitrate");
  } else if (good && state.adaptiveFactor < 1) {
    state.adaptiveFactor = Math.min(1, state.adaptiveFactor + 0.05);
    applyQualityToAll();
  }
}

function showWarning(text) {
  ui.warningOverlay.textContent = text;
  ui.warningOverlay.classList.remove("hidden");
  clearTimeout(showWarning.timer);
  showWarning.timer = setTimeout(() => ui.warningOverlay.classList.add("hidden"), 2500);
}

function updateStatsUi() {
  const server = state.serverPing == null ? "--" : state.serverPing;
  const peer = state.peerRtt == null ? "--" : state.peerRtt;
  const stream = formatBitrate(state.streamBitrate);
  const loss = state.packetLoss == null ? "--" : `${state.packetLoss.toFixed(1)}%`;
  const input = state.inputDelay == null ? "--" : state.inputDelay;

  ui.serverPingBadge.textContent = `Server ${server} ms`;
  ui.peerPingBadge.textContent = `Peer ${peer} ms`;
  ui.serverPingValue.textContent = `${server} ms`;
  ui.peerRttValue.textContent = `${peer} ms`;
  ui.streamBitrateValue.textContent = stream;
  ui.packetLossValue.textContent = loss;
  ui.inputDelayValue.textContent = `${input} ms`;
  ui.tinyOverlay.textContent = `Server ${server}ms · Peer ${peer}ms · ${stream} · Loss ${loss}`;

  if (ui.turnStatusValue.textContent === "Unknown") {
    ui.turnStatusValue.textContent = state.settings.turnUrl ? "Configured" : "Not configured";
  }

  if (state.peerRtt && state.peerRtt > 180) {
    ui.networkAdvice.textContent = "High latency detected. Lower FPS or enable TURN TCP only if UDP fails.";
  } else if (state.packetLoss && state.packetLoss > 3) {
    ui.networkAdvice.textContent = "Packet loss detected. Lower bitrate or disable cameras/audio.";
  } else {
    ui.networkAdvice.textContent = "Connection looks usable. Increase quality slowly if needed.";
  }
}

function listenForPttKey() {
  ui.pttKeyButton.textContent = "Press a key...";
  const handler = (event) => {
    event.preventDefault();
    state.settings.pushToTalkKey = event.code;
    ui.pttKeyButton.textContent = keyCodeToLabel(event.code);
    saveSettings();
    window.removeEventListener("keydown", handler, true);
    toast(`Push-to-talk set to ${keyCodeToLabel(event.code)}.`);
  };
  window.addEventListener("keydown", handler, true);
}


function initLayoutEditor() {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    if (panel.querySelector(":scope > .layout-panel-bar")) return;

    const title = panel.dataset.panelTitle || panel.dataset.panel || "Panel";
    const bar = document.createElement("div");
    bar.className = "layout-panel-bar";
    bar.innerHTML = `
      <span class="layout-panel-title">${escapeHtml(title)}</span>
      <span class="layout-panel-actions">
        <button type="button" data-layout-action="dock-left">L</button>
        <button type="button" data-layout-action="dock-center">C</button>
        <button type="button" data-layout-action="dock-right">R</button>
        <button type="button" data-layout-action="dock-bottom">B</button>
        <button type="button" data-layout-action="collapse">_</button>
      </span>
    `;

    panel.prepend(bar);

    bar.addEventListener("mousedown", (event) => startPanelDrag(event, panel));

    bar.querySelectorAll("[data-layout-action]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        handlePanelAction(panel, button.dataset.layoutAction);
      });
    });
  });

  applySavedLayout();
}

function toggleLayoutEditor() {
  state.layoutEditing = !state.layoutEditing;

  document.body.classList.toggle("layout-editing", state.layoutEditing);
  ui.layoutEditToggle.textContent = state.layoutEditing ? "Exit layout" : "Edit layout";
  ui.layoutSave.classList.toggle("hidden", !state.layoutEditing);
  ui.layoutReset.classList.toggle("hidden", !state.layoutEditing);

  if (state.layoutEditing) {
    prepareLayoutEditPositions();
    toast("Layout edit mode: drag panels, resize corners, dock with L/C/R/B.", 4600);
  } else {
    saveLayout();
    document.body.classList.remove("layout-dragging");
  }
}

function prepareLayoutEditPositions() {
  const workspaceRect = ui.workspace.getBoundingClientRect();
  const panels = Array.from(document.querySelectorAll("[data-panel]"));

  panels.forEach((panel, index) => {
    const saved = state.settings.layout?.[panel.dataset.panel];
    if (saved) {
      applyPanelLayout(panel, saved);
      return;
    }

    const rect = panel.getBoundingClientRect();
    const fallback = defaultPanelLayout(panel.dataset.panel, index, workspaceRect);
    const layout = {
      left: Math.max(8, rect.left - workspaceRect.left || fallback.left),
      top: Math.max(8, rect.top - workspaceRect.top || fallback.top),
      width: Math.max(260, rect.width || fallback.width),
      height: Math.max(120, rect.height || fallback.height),
      collapsed: false
    };

    applyPanelLayout(panel, layout);
  });
}

function defaultPanelLayout(id, index, workspaceRect) {
  const w = Math.max(900, workspaceRect.width || 1200);
  const h = Math.max(700, workspaceRect.height || 820);

  const layouts = {
    controls: { left: 8, top: 8, width: 410, height: h - 16 },
    stream: { left: 430, top: 8, width: w - 438, height: Math.round(h * 0.68) },
    party: { left: 430, top: Math.round(h * 0.70), width: w - 438, height: 105 },
    debug: { left: 430, top: Math.round(h * 0.84), width: w - 438, height: 150 }
  };

  return layouts[id] || { left: 24 + index * 32, top: 24 + index * 32, width: 360, height: 240 };
}

function applyPanelLayout(panel, layout) {
  panel.style.left = `${layout.left}px`;
  panel.style.top = `${layout.top}px`;
  panel.style.width = `${layout.width}px`;
  panel.style.height = `${layout.height}px`;
  panel.style.zIndex = String(layout.z || ++state.panelZ);
  panel.classList.toggle("layout-collapsed", Boolean(layout.collapsed));
}

function readPanelLayout(panel) {
  return {
    left: Number.parseFloat(panel.style.left) || 0,
    top: Number.parseFloat(panel.style.top) || 0,
    width: Number.parseFloat(panel.style.width) || panel.offsetWidth,
    height: Number.parseFloat(panel.style.height) || panel.offsetHeight,
    z: Number.parseInt(panel.style.zIndex || "1", 10),
    collapsed: panel.classList.contains("layout-collapsed")
  };
}

function saveLayout() {
  const layout = {};
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    layout[panel.dataset.panel] = readPanelLayout(panel);
  });

  state.settings.layout = layout;
  saveSettings();
  toast("Layout saved.");
}

function applySavedLayout() {
  const layout = state.settings.layout || {};
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    const item = layout[panel.dataset.panel];
    if (item) applyPanelLayout(panel, item);
  });
}

function resetLayout() {
  state.settings.layout = {};
  localStorage.setItem("remoteCoopV3Settings", JSON.stringify(state.settings));

  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.style.left = "";
    panel.style.top = "";
    panel.style.width = "";
    panel.style.height = "";
    panel.style.zIndex = "";
    panel.classList.remove("layout-collapsed", "panel-active");
  });

  if (state.layoutEditing) prepareLayoutEditPositions();
  toast("Layout reset.");
}

function startPanelDrag(event, panel) {
  if (!state.layoutEditing) return;
  if (event.button !== 0) return;

  event.preventDefault();

  const rect = panel.getBoundingClientRect();
  const workspaceRect = ui.workspace.getBoundingClientRect();

  state.layoutDrag = {
    panel,
    startX: event.clientX,
    startY: event.clientY,
    startLeft: rect.left - workspaceRect.left,
    startTop: rect.top - workspaceRect.top
  };

  panel.classList.add("panel-active");
  panel.style.zIndex = String(++state.panelZ);
  document.body.classList.add("layout-dragging");

  window.addEventListener("mousemove", movePanelDrag);
  window.addEventListener("mouseup", endPanelDrag, { once: true });
}

function movePanelDrag(event) {
  const drag = state.layoutDrag;
  if (!drag) return;

  const workspaceRect = ui.workspace.getBoundingClientRect();
  const panel = drag.panel;
  const nextLeft = clamp(drag.startLeft + event.clientX - drag.startX, 4, Math.max(4, workspaceRect.width - 120));
  const nextTop = clamp(drag.startTop + event.clientY - drag.startY, 4, Math.max(4, workspaceRect.height - 80));

  panel.style.left = `${nextLeft}px`;
  panel.style.top = `${nextTop}px`;

  updateDockHotZone(event.clientX, event.clientY);
}

function endPanelDrag(event) {
  window.removeEventListener("mousemove", movePanelDrag);

  const drag = state.layoutDrag;
  state.layoutDrag = null;
  document.body.classList.remove("layout-dragging");

  document.querySelectorAll(".dock-zone.hot").forEach((zone) => zone.classList.remove("hot"));

  if (!drag) return;

  const dock = getDockUnderPoint(event.clientX, event.clientY);
  if (dock) dockPanel(drag.panel, dock);

  drag.panel.classList.remove("panel-active");
  saveLayout();
}

function updateDockHotZone(x, y) {
  document.querySelectorAll(".dock-zone").forEach((zone) => zone.classList.toggle("hot", pointInside(zone.getBoundingClientRect(), x, y)));
}

function getDockUnderPoint(x, y) {
  const zone = Array.from(document.querySelectorAll(".dock-zone")).find((el) => pointInside(el.getBoundingClientRect(), x, y));
  return zone ? zone.dataset.dock : null;
}

function pointInside(rect, x, y) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

function handlePanelAction(panel, action) {
  if (action === "collapse") {
    panel.classList.toggle("layout-collapsed");
    saveLayout();
    return;
  }

  const dock = action.replace("dock-", "");
  dockPanel(panel, dock);
  saveLayout();
}

function dockPanel(panel, dock) {
  const rect = ui.workspace.getBoundingClientRect();
  const pad = 8;

  const layouts = {
    left: { left: pad, top: pad, width: Math.round(rect.width * 0.28), height: Math.round(rect.height - pad * 2) },
    right: { left: Math.round(rect.width * 0.72) - pad, top: pad, width: Math.round(rect.width * 0.28), height: Math.round(rect.height - pad * 2) },
    bottom: { left: Math.round(rect.width * 0.25), top: Math.round(rect.height * 0.72), width: Math.round(rect.width * 0.5), height: Math.round(rect.height * 0.26) },
    center: { left: Math.round(rect.width * 0.30), top: pad, width: Math.round(rect.width * 0.69) - pad, height: Math.round(rect.height * 0.70) }
  };

  applyPanelLayout(panel, { ...layouts[dock], collapsed: false, z: ++state.panelZ });
}


function bindEvents() {
  ui.navButtons.forEach((btn) => btn.addEventListener("click", () => {
    showScreen(btn.dataset.screen);
    if (btn.dataset.screen === "host") loadCaptureSources();
  }));

  ui.collapseSidebar.addEventListener("click", () => {
    ui.appFrame.classList.add("menu-hidden");
    ui.expandSidebar.classList.remove("hidden");
  });

  ui.expandSidebar.addEventListener("click", () => {
    ui.appFrame.classList.remove("menu-hidden");
    ui.expandSidebar.classList.add("hidden");
  });

  ui.homeHost.addEventListener("click", () => { showScreen("host"); loadCaptureSources(); });
  ui.homeJoin.addEventListener("click", () => showScreen("join"));
  ui.themeToggle.addEventListener("click", toggleTheme);
  ui.layoutEditToggle.addEventListener("click", toggleLayoutEditor);
  ui.layoutSave.addEventListener("click", saveLayout);
  ui.layoutReset.addEventListener("click", resetLayout);
  ui.refreshSources.addEventListener("click", loadCaptureSources);
  ui.startHost.addEventListener("click", startHosting);
  ui.stopHost.addEventListener("click", stopHosting);
  ui.panicInput.addEventListener("click", async () => {
    await window.remoteCoop.setInputEnabled(false);
    await window.remoteCoop.releaseAllKeys();
    toast("All remote input stopped.");
  });
  ui.copyRoom.addEventListener("click", async () => {
    if (!state.room?.code) return;
    await navigator.clipboard.writeText(state.room.code);
    toast("Room code copied.");
  });
  ui.joinCode.addEventListener("input", () => {
    ui.joinCode.value = ui.joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  });
  ui.joinRoom.addEventListener("click", joinRoom);
  ui.leaveRoom.addEventListener("click", () => { sendWs({ type: "leave-room" }); resetAll(); });
  ui.maxPeople.addEventListener("change", updateRoomSettings);
  ui.allowJoins.addEventListener("change", updateRoomSettings);
  ui.cameraToggle.addEventListener("change", startLocalPartyMedia);
  ui.micToggle.addEventListener("change", startLocalPartyMedia);
  ui.pttKeyButton.addEventListener("click", listenForPttKey);
  ui.antiEchoToggle.addEventListener("change", () => { saveSettings(); updateGameAudioTracks(); });
  ui.pushToTalk.addEventListener("change", () => {
    if (ui.pushToTalk.checked) setMicEnabled(false);
    else setMicEnabled(true);
  });

  [ui.resolutionSelect, ui.fpsSelect, ui.imageQuality, ui.bitrateSlider, ui.degradationPreference, ui.gameAudioToggle, ui.autoNetworkMode, ui.antiEchoToggle].forEach((el) => {
    el.addEventListener("input", () => { saveSettings(); updateQualityLabels(); });
    el.addEventListener("change", () => { saveSettings(); updateQualityLabels(); updateGameAudioTracks(); });
  });

  ui.applyQuality.addEventListener("click", applyQualityNow);
  ui.lowLatencyBtn.addEventListener("click", setLowLatency);
  ui.saveSettings.addEventListener("click", () => { saveSettings(); toast("Settings saved."); });
  ui.openDebug.addEventListener("click", () => ui.debugPanel.classList.toggle("collapsed"));
  ui.copyLog.addEventListener("click", async () => {
    await navigator.clipboard.writeText(state.logs.join("\n"));
    toast("Logs copied.");
  });
  ui.clearLog.addEventListener("click", () => { ui.debugLog.textContent = ""; state.logs = []; });
  ui.fullscreenBtn.addEventListener("click", async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await ui.streamStage.requestFullscreen();
  });
  ui.lockControls.addEventListener("click", lockControls);

  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", releasePressedKeys);

  ui.remoteVideo.addEventListener("mousemove", (event) => handlePointer(event, "move"));
  ui.remoteVideo.addEventListener("mousedown", (event) => handlePointer(event, "down"));
  window.addEventListener("mouseup", (event) => handlePointer(event, "up"));
  ui.remoteVideo.addEventListener("wheel", (event) => handlePointer(event, "wheel"), { passive: false });
  ui.remoteVideo.addEventListener("contextmenu", (event) => {
    if (state.locked) event.preventDefault();
  });

  window.remoteCoop.onDebugEvent((entry) => log(entry.level || "info", `${entry.source || "main"}: ${entry.message}`, entry.data));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

loadSettings();
initLayoutEditor();
bindEvents();
showScreen("home");
updateStatsUi();
log("info", "App ready");
