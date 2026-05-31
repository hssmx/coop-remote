const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const ui = {
  appFrame: $(".app-frame"),
  sidebar: $("#sidebar"),
  collapseSidebar: $("#collapseSidebar"),
  expandSidebar: $("#expandSidebar"),
  navButtons: $$(".nav-btn"),
  pageTitle: $("#pageTitle"),
  pageSubtitle: $("#pageSubtitle"),
  themeToggle: $("#themeToggle"),

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
  captureSourceId: ""
};

const DEFAULT_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight"];

const state = {
  role: null,
  ws: null,
  peerId: null,
  room: null,
  localGameStream: null,
  localPartyStream: null,
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
    autoNetworkMode: ui.autoNetworkMode.checked
  };
}

function updateQualityLabels() {
  const q = getQuality();
  ui.imageQualityLabel.textContent = `${q.imageQuality}%`;
  ui.bitrateLabel.textContent = formatBitrate(q.bitrate);
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
      ensurePeer(msg.hostPeerId, false);
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

    if (state.role === "guest" && track.kind === "video" && !ui.remoteVideo.srcObject) {
      peer.remoteStream.addTrack(track);
      ui.remoteVideo.srcObject = peer.remoteStream;
      ui.remoteVideo.classList.remove("hidden");
      ui.localVideo.classList.add("hidden");
      ui.emptyStage.classList.add("hidden");
      ui.streamTitle.textContent = "Remote game stream";
      return;
    }

    if (state.role === "guest" && track.kind === "audio" && !peer.remoteStream.getAudioTracks().length) {
      peer.remoteStream.addTrack(track);
      return;
    }

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
      payload: { type: "offer", sdp: pc.localDescription }
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
    await pc.setRemoteDescription(payload.sdp);
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendWs({
      type: "signal",
      roomCode: state.room?.code,
      targetPeerId: fromPeerId,
      payload: { type: "answer", sdp: pc.localDescription }
    });
  } else if (payload.type === "answer") {
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
    window.remoteCoop.sendInput({ type: "key", action: msg.action, code: msg.code });
    return;
  }

  if (msg.kind === "mouse") {
    if (msg.action === "move" && !perms.mouseMove) return;
    if (["down", "up", "click"].includes(msg.action) && !perms.mouseButtons) return;
    if (msg.action === "wheel" && !perms.mouseWheel) return;
    window.remoteCoop.sendInput({ type: "mouse", ...msg });
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

    ui.localCameraVideo.srcObject = stream;
    ui.cameraPreview.classList.toggle("hidden", !needCamera);

    await addOrReplacePartyTracks(stream);
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
      const sender = peer.pc.getSenders().find((s) => s.track && s.track.kind === track.kind && s.track.label.includes("RemoteCoopParty"));
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
        <label>
          <span>Allowed keys, comma separated. Use * for all.</span>
          <input class="key-input" data-keys value="${escapeHtml((p.allowedKeys || DEFAULT_KEYS).join(","))}" />
        </label>
      ` : ""}
    `;

    if (canEdit) {
      card.querySelectorAll("[data-perm]").forEach((input) => {
        input.addEventListener("change", () => updatePermissions(member.peerId, { [input.dataset.perm]: input.checked }));
      });

      const keyInput = card.querySelector("[data-keys]");
      keyInput.addEventListener("change", () => {
        const allowedKeys = keyInput.value.split(",").map((x) => x.trim()).filter(Boolean);
        updatePermissions(member.peerId, { allowedKeys });
      });
    }

    ui.memberList.appendChild(card);
  }
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
  if (ui.pushToTalk.checked && event.code === "KeyV") {
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
  if (ui.pushToTalk.checked && event.code === "KeyV") {
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

  if (!state.turnUrl && ui.turnStatusValue.textContent === "Unknown") {
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
  ui.refreshSources.addEventListener("click", loadCaptureSources);
  ui.startHost.addEventListener("click", startHosting);
  ui.stopHost.addEventListener("click", stopHosting);
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
  ui.pushToTalk.addEventListener("change", () => {
    if (ui.pushToTalk.checked) setMicEnabled(false);
    else setMicEnabled(true);
  });

  [ui.resolutionSelect, ui.fpsSelect, ui.imageQuality, ui.bitrateSlider, ui.degradationPreference, ui.gameAudioToggle, ui.autoNetworkMode].forEach((el) => {
    el.addEventListener("input", () => { saveSettings(); updateQualityLabels(); });
    el.addEventListener("change", () => { saveSettings(); updateQualityLabels(); });
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
bindEvents();
showScreen("home");
updateStatsUi();
log("info", "App ready");
