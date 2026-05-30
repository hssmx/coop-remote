const $ = (selector) => document.querySelector(selector);

const ui = {
  roleScreen: $("#roleScreen"),
  hostScreen: $("#hostScreen"),
  guestScreen: $("#guestScreen"),
  homeNav: $("#homeNav"),
  hostNav: $("#hostNav"),
  guestNav: $("#guestNav"),
  settingsNav: $("#settingsNav"),
  quickOpenSettings: $("#quickOpenSettings"),
  settingsModal: $("#settingsModal"),
  closeSettingsModal: $("#closeSettingsModal"),
  idleStage: $("#idleStage"),
  hostVideoWrap: $("#hostVideoWrap"),
  guestVideoWrap: $("#guestVideoWrap"),
  hostFullscreen: $("#hostFullscreen"),
  guestFullscreen: $("#guestFullscreen"),
  chooseHost: $("#chooseHost"),
  chooseGuest: $("#chooseGuest"),
  serverUrl: $("#serverUrl"),
  stunUrl: $("#stunUrl"),
  turnUrl: $("#turnUrl"),
  turnUsername: $("#turnUsername"),
  turnPassword: $("#turnPassword"),
  saveSettings: $("#saveSettings"),
  signalStatus: $("#signalStatus"),
  rtcStatus: $("#rtcStatus"),
  latencyStatus: $("#latencyStatus"),
  startHost: $("#startHost"),
  stopHost: $("#stopHost"),
  roomCode: $("#roomCode"),
  copyRoom: $("#copyRoom"),
  remoteInputToggle: $("#remoteInputToggle"),
  testLocalInput: $("#testLocalInput"),
  localVideo: $("#localVideo"),
  hostEmpty: $("#hostEmpty"),
  hostSubtitle: $("#hostSubtitle"),
  hostLiveDot: $("#hostLiveDot"),
  joinCode: $("#joinCode"),
  joinRoom: $("#joinRoom"),
  leaveGuest: $("#leaveGuest"),
  guestInputLock: $("#guestInputLock"),
  remoteStage: $("#remoteStage"),
  remoteVideo: $("#remoteVideo"),
  guestEmpty: $("#guestEmpty"),
  guestSubtitle: $("#guestSubtitle"),
  guestLiveDot: $("#guestLiveDot"),
  inputOverlay: $("#inputOverlay"),
  toastHost: $("#toastHost"),
  acceptGuest: $("#acceptGuest"),
  rejectGuest: $("#rejectGuest"),
  toast: $("#toast"),
  debugLog: $("#debugLog"),
  clearLog: $("#clearLog"),
  copyLog: $("#copyLog")
};

const DEFAULT_SETTINGS = {
  serverUrl: "ws://localhost:8787",
  stunUrl: "stun:stun.l.google.com:19302",
  turnUrl: "",
  turnUsername: "",
  turnPassword: ""
};

const ALLOWED_CODES = new Set([
  "KeyW", "KeyA", "KeyS", "KeyD",
  "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight",
  "Space", "Enter", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight"
]);

const state = {
  role: null,
  ws: null,
  peerId: null,
  roomCode: null,
  localStream: null,
  remoteStream: null,
  pc: null,
  dc: null,
  pendingCandidates: [],
  guestAccepted: false,
  pendingGuestPeerId: null,
  pressedCodes: new Set(),
  pingTimer: null,
  statsTimer: null,
  settings: { ...DEFAULT_SETTINGS },
  logs: []
};

function timestamp() {
  return new Date().toLocaleTimeString([], { hour12: false });
}

function log(level, message, data) {
  const entry = { at: timestamp(), level, message, data };
  state.logs.push(entry);
  if (state.logs.length > 600) state.logs.shift();

  const dataText = data ? ` ${safeStringify(data)}` : "";
  const line = `[${entry.at}] ${level.toUpperCase()} ${message}${dataText}`;
  const span = document.createElement("span");
  span.className = `log-${level}`;
  span.textContent = line + "\n";
  ui.debugLog.appendChild(span);
  ui.debugLog.scrollTop = ui.debugLog.scrollHeight;
}

function safeStringify(data) {
  try { return JSON.stringify(data); } catch { return String(data); }
}

function setActiveNav(screen) {
  if (ui.homeNav) ui.homeNav.classList.toggle("active", screen === "role");
  if (ui.hostNav) ui.hostNav.classList.toggle("active", screen === "host");
  if (ui.guestNav) ui.guestNav.classList.toggle("active", screen === "guest");
}

function openSettingsModal() {
  ui.settingsModal.classList.remove("hidden");
  if (ui.settingsNav) ui.settingsNav.classList.add("active");
  log("info", "Opened settings modal");
}

function closeSettingsModal() {
  ui.settingsModal.classList.add("hidden");
  if (ui.settingsNav) ui.settingsNav.classList.remove("active");
}

function showToast(message, duration = 3600) {
  ui.toast.textContent = message;
  ui.toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => ui.toast.classList.add("hidden"), duration);
}

function showScreen(screen) {
  ui.roleScreen.classList.toggle("hidden", screen !== "role");
  ui.hostScreen.classList.toggle("hidden", screen !== "host");
  ui.guestScreen.classList.toggle("hidden", screen !== "guest");
  ui.idleStage.classList.toggle("hidden", screen !== "role");
  ui.hostVideoWrap.classList.toggle("hidden", screen !== "host");
  ui.guestVideoWrap.classList.toggle("hidden", screen !== "guest");
  setActiveNav(screen);
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem("remoteCoopSettings") || "{}");
    state.settings = { ...DEFAULT_SETTINGS, ...saved };
  } catch {
    state.settings = { ...DEFAULT_SETTINGS };
  }

  ui.serverUrl.value = state.settings.serverUrl;
  ui.stunUrl.value = state.settings.stunUrl;
  ui.turnUrl.value = state.settings.turnUrl;
  ui.turnUsername.value = state.settings.turnUsername;
  ui.turnPassword.value = state.settings.turnPassword;
  log("info", "Settings loaded", { serverUrl: state.settings.serverUrl, stunUrl: state.settings.stunUrl, hasTurn: Boolean(state.settings.turnUrl) });
}

function saveSettings() {
  state.settings = {
    serverUrl: ui.serverUrl.value.trim() || DEFAULT_SETTINGS.serverUrl,
    stunUrl: ui.stunUrl.value.trim() || DEFAULT_SETTINGS.stunUrl,
    turnUrl: ui.turnUrl.value.trim(),
    turnUsername: ui.turnUsername.value.trim(),
    turnPassword: ui.turnPassword.value
  };

  localStorage.setItem("remoteCoopSettings", JSON.stringify(state.settings));
  log("info", "Settings saved", { serverUrl: state.settings.serverUrl, stunUrl: state.settings.stunUrl, hasTurn: Boolean(state.settings.turnUrl) });
  showToast("Settings saved.");
}

function getIceServers() {
  const iceServers = [];
  if (state.settings.stunUrl) iceServers.push({ urls: state.settings.stunUrl });
  if (state.settings.turnUrl) {
    iceServers.push({ urls: state.settings.turnUrl, username: state.settings.turnUsername, credential: state.settings.turnPassword });
  }
  return iceServers;
}

function updateSignalStatus(text) { ui.signalStatus.textContent = `Signaling: ${text}`; }
function updateRtcStatus(text) { ui.rtcStatus.textContent = `WebRTC: ${text}`; }
function setLatency(ms) { ui.latencyStatus.textContent = typeof ms === "number" && Number.isFinite(ms) ? `Latency: ${Math.round(ms)} ms` : "Latency: -- ms"; }

function sendWs(payload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    log("error", "Cannot send signaling message, WebSocket not open", payload);
    showToast("Signaling server is not connected.");
    return false;
  }
  state.ws.send(JSON.stringify(payload));
  log("info", `WS sent: ${payload.type}`, payload.type === "signal" ? { kind: payload.payload?.kind } : payload);
  return true;
}

function connectSignaling() {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) return Promise.resolve();

  saveSettings();
  updateSignalStatus("connecting");
  log("info", "Connecting signaling", { url: state.settings.serverUrl });

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(state.settings.serverUrl);
    state.ws = ws;

    const timeout = setTimeout(() => {
      reject(new Error("Connection timeout."));
      try { ws.close(); } catch {}
    }, 8000);

    ws.addEventListener("open", () => {
      clearTimeout(timeout);
      updateSignalStatus("connected");
      log("info", "Signaling connected");
      resolve();
    });

    ws.addEventListener("close", () => {
      updateSignalStatus("disconnected");
      log("warn", "Signaling disconnected");
      if (state.role === "host") resetHost(false);
      if (state.role === "guest") resetGuest(false);
    });

    ws.addEventListener("error", () => {
      updateSignalStatus("error");
      log("error", "Signaling WebSocket error");
    });

    ws.addEventListener("message", async (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      log("info", `WS received: ${msg.type}`, msg.type === "signal" ? { kind: msg.payload?.kind, from: msg.from } : msg);
      await handleServerMessage(msg);
    });
  });
}

async function handleServerMessage(msg) {
  switch (msg.type) {
    case "welcome": state.peerId = msg.peerId; return;
    case "room-created":
      state.roomCode = msg.roomCode;
      ui.roomCode.textContent = msg.roomCode;
      ui.startHost.disabled = true;
      ui.stopHost.disabled = false;
      showToast(`Room created: ${msg.roomCode}`);
      return;
    case "join-request":
      state.pendingGuestPeerId = msg.guestPeerId;
      ui.toastHost.classList.remove("hidden");
      return;
    case "guest-connected":
      ui.toastHost.classList.add("hidden");
      showToast("Guest accepted. Starting WebRTC...");
      await startHostPeer();
      return;
    case "join-request-sent":
      ui.guestSubtitle.textContent = "Waiting for host approval";
      showToast("Join request sent.");
      return;
    case "guest-accepted":
      state.roomCode = msg.roomCode;
      state.guestAccepted = true;
      ui.leaveGuest.disabled = false;
      ui.joinRoom.disabled = true;
      ui.guestSubtitle.textContent = "Approved. Waiting for stream...";
      showToast("Host accepted you.");
      return;
    case "guest-rejected":
      showToast("Host rejected the request.");
      resetGuest(false);
      return;
    case "signal": await handleSignal(msg.payload); return;
    case "guest-left":
      showToast("Guest left.");
      await closePeer();
      return;
    case "room-closed":
      showToast(`Room closed: ${msg.reason || "closed"}`);
      if (state.role === "host") resetHost(false);
      if (state.role === "guest") resetGuest(false);
      return;
    case "error": showToast(msg.message || "Server error."); return;
  }
}

async function startCapture() {
  log("info", "Opening screen picker");
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 60, max: 60 } },
    audio: true
  });

  state.localStream = stream;
  ui.localVideo.srcObject = stream;
  ui.hostEmpty.classList.add("hidden");
  ui.hostSubtitle.textContent = "Screen capture active";
  ui.hostLiveDot.textContent = "live";
  ui.hostLiveDot.classList.add("live");
  log("info", "Capture active", stream.getTracks().map((track) => ({ kind: track.kind, label: track.label })));

  for (const track of stream.getTracks()) {
    track.addEventListener("ended", () => {
      log("warn", `Capture track ended: ${track.kind}`);
      if (state.role === "host") resetHost();
    });
  }
}

async function startHost() {
  try {
    await connectSignaling();
    await startCapture();
    sendWs({ type: "create-room" });
  } catch (error) {
    log("error", "Could not start hosting", { error: error.message });
    showToast(error.message || "Could not start hosting.");
    resetHost(false);
  }
}

async function createPeerConnection() {
  const pc = new RTCPeerConnection({ iceServers: getIceServers(), bundlePolicy: "max-bundle", rtcpMuxPolicy: "require" });
  state.pc = pc;
  updateRtcStatus("connecting");
  log("info", "RTCPeerConnection created", { iceServers: getIceServers().map((s) => ({ urls: s.urls, hasCredential: Boolean(s.credential) })) });

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      log("info", "ICE candidate gathered", { type: event.candidate.type, protocol: event.candidate.protocol });
      sendSignal("ice", event.candidate);
    }
  };

  pc.onconnectionstatechange = () => {
    updateRtcStatus(pc.connectionState);
    log(pc.connectionState === "failed" ? "error" : "info", `Peer connection state: ${pc.connectionState}`);
    if (pc.connectionState === "failed") showToast("WebRTC failed. Try a TURN server.");
  };

  pc.oniceconnectionstatechange = () => log("info", `ICE state: ${pc.iceConnectionState}`);
  return pc;
}

async function startHostPeer() {
  if (!state.localStream) { showToast("Start screen capture first."); return; }
  await closePeer();
  const pc = await createPeerConnection();
  for (const track of state.localStream.getTracks()) pc.addTrack(track, state.localStream);
  const dc = pc.createDataChannel("input", { ordered: false, maxRetransmits: 0 });
  setupHostDataChannel(dc);
  const offer = await pc.createOffer({ offerToReceiveAudio: false, offerToReceiveVideo: false });
  await pc.setLocalDescription(offer);
  log("info", "Created WebRTC offer");
  sendSignal("offer", offer);
  startStats();
}

function setupHostDataChannel(dc) {
  state.dc = dc;
  dc.onopen = () => { log("info", "Host data channel open"); showToast("Input channel open."); };
  dc.onclose = () => { log("warn", "Host data channel closed"); window.remoteCoop.releaseAllKeys(); };
  dc.onerror = (event) => log("error", "Host data channel error", event.message || event);
  dc.onmessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { log("error", "Invalid data channel message", event.data); return; }
    log("input", `Host received DC message: ${msg.type}`, msg);

    if (msg.type === "input") {
      const result = await window.remoteCoop.sendInput(msg);
      log(result.ok ? "input" : "error", `Host processed input ${msg.action} ${msg.code}`, result);
      safeSendData({ type: "input-result", action: msg.action, code: msg.code, ok: result.ok, error: result.error, reason: result.reason, ignored: result.ignored, lastHelperLine: result.lastHelperLine });
      return;
    }

    if (msg.type === "ping") safeSendData({ type: "pong", t: msg.t });
  };
}

function setupGuestDataChannel(dc) {
  state.dc = dc;
  dc.onopen = () => { log("info", "Guest data channel open"); showToast("Input channel ready."); startPing(); };
  dc.onclose = () => { log("warn", "Guest data channel closed"); stopPing(); unlockGuestInput(); };
  dc.onerror = (event) => log("error", "Guest data channel error", event.message || event);
  dc.onmessage = (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { log("error", "Invalid data channel message", event.data); return; }
    if (msg.type === "pong" && typeof msg.t === "number") { setLatency(performance.now() - msg.t); return; }
    if (msg.type === "input-result") {
      log(msg.ok ? "input" : "error", `Guest got input result ${msg.action} ${msg.code}`, msg);
      if (!msg.ok && msg.error) showToast(`Host input error: ${msg.error}`, 7000);
      return;
    }
    log("info", `Guest received DC message: ${msg.type}`, msg);
  };
}

function safeSendData(payload) {
  if (!state.dc || state.dc.readyState !== "open") {
    log("warn", "Data channel not open", { payloadType: payload.type, readyState: state.dc?.readyState });
    return false;
  }
  state.dc.send(JSON.stringify(payload));
  if (payload.type !== "ping") log("input", `DC sent: ${payload.type}`, payload);
  return true;
}

function sendSignal(kind, data) { sendWs({ type: "signal", roomCode: state.roomCode, payload: { kind, data } }); }

async function handleSignal(payload) {
  if (!payload || !payload.kind) return;
  if (payload.kind === "offer") { await handleOffer(payload.data); return; }
  if (payload.kind === "answer") {
    if (!state.pc) return;
    await state.pc.setRemoteDescription(new RTCSessionDescription(payload.data));
    log("info", "Remote answer set");
    await flushPendingCandidates();
    return;
  }
  if (payload.kind === "ice") await handleIce(payload.data);
}

async function handleOffer(offer) {
  await closePeer();
  const pc = await createPeerConnection();
  pc.ontrack = (event) => {
    const [stream] = event.streams;
    if (!stream) return;
    state.remoteStream = stream;
    ui.remoteVideo.srcObject = stream;
    ui.guestEmpty.classList.add("hidden");
    ui.guestSubtitle.textContent = "Connected to host";
    ui.guestLiveDot.textContent = "live";
    ui.guestLiveDot.classList.add("live");
    log("info", "Remote stream attached");
  };
  pc.ondatachannel = (event) => setupGuestDataChannel(event.channel);
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  log("info", "Remote offer set");
  await flushPendingCandidates();
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  log("info", "Created WebRTC answer");
  sendSignal("answer", answer);
  startStats();
}

async function handleIce(candidate) {
  if (!candidate) return;
  if (!state.pc || !state.pc.remoteDescription) { state.pendingCandidates.push(candidate); log("info", "Queued ICE candidate"); return; }
  try { await state.pc.addIceCandidate(new RTCIceCandidate(candidate)); log("info", "Added ICE candidate"); }
  catch (error) { log("error", "Could not add ICE candidate", { error: error.message }); }
}

async function flushPendingCandidates() {
  const pending = [...state.pendingCandidates];
  state.pendingCandidates = [];
  for (const candidate of pending) await handleIce(candidate);
}

async function joinRoom() {
  const code = ui.joinCode.value.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) { showToast("Enter a valid 6-character room code."); return; }
  try {
    await connectSignaling();
    state.roomCode = code;
    ui.guestSubtitle.textContent = "Sending join request...";
    sendWs({ type: "join-room", roomCode: code });
  } catch (error) {
    log("error", "Could not join room", { error: error.message });
    showToast(error.message || "Could not join room.");
  }
}

function lockGuestInput() {
  if (!state.dc || state.dc.readyState !== "open") {
    ui.guestInputLock.checked = false;
    showToast("Input channel is not ready yet.");
    log("warn", "Guest tried to lock controls before data channel open");
    return;
  }
  ui.remoteStage.focus();
  ui.inputOverlay.classList.remove("hidden");
  log("input", "Guest controls locked");
  showToast("Controls locked. Press Escape to unlock.");
}

function unlockGuestInput() {
  ui.guestInputLock.checked = false;
  ui.inputOverlay.classList.add("hidden");
  releaseGuestPressedKeys();
  log("input", "Guest controls unlocked");
}

function sendGuestInput(action, code) {
  if (!ALLOWED_CODES.has(code)) return;
  const ok = safeSendData({ type: "input", action, code });
  log(ok ? "input" : "warn", `Guest ${ok ? "sent" : "failed to send"} ${action} ${code}`);
}

function releaseGuestPressedKeys() {
  for (const code of Array.from(state.pressedCodes)) {
    sendGuestInput("up", code);
    state.pressedCodes.delete(code);
  }
}

function onGuestKeyDown(event) {
  if (!ui.guestInputLock.checked || state.role !== "guest") return;
  if (event.code === "Escape") { event.preventDefault(); unlockGuestInput(); return; }
  if (!ALLOWED_CODES.has(event.code)) return;
  event.preventDefault();
  if (state.pressedCodes.has(event.code)) return;
  state.pressedCodes.add(event.code);
  sendGuestInput("down", event.code);
}

function onGuestKeyUp(event) {
  if (!ui.guestInputLock.checked || state.role !== "guest") return;
  if (!ALLOWED_CODES.has(event.code)) return;
  event.preventDefault();
  state.pressedCodes.delete(event.code);
  sendGuestInput("up", event.code);
}

function startPing() {
  stopPing();
  state.pingTimer = setInterval(() => safeSendData({ type: "ping", t: performance.now() }), 1000);
}
function stopPing() { if (state.pingTimer) clearInterval(state.pingTimer); state.pingTimer = null; setLatency(null); }

function startStats() {
  stopStats();
  state.statsTimer = setInterval(async () => {
    if (!state.pc) return;
    try {
      const stats = await state.pc.getStats();
      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated && typeof report.currentRoundTripTime === "number") {
          if (state.role === "host") ui.latencyStatus.textContent = `Network RTT: ${Math.round(report.currentRoundTripTime * 1000)} ms`;
        }
      });
    } catch {}
  }, 1500);
}
function stopStats() { if (state.statsTimer) clearInterval(state.statsTimer); state.statsTimer = null; }

async function closePeer() {
  stopPing(); stopStats(); releaseGuestPressedKeys(); await window.remoteCoop.releaseAllKeys();
  if (state.dc) { try { state.dc.close(); } catch {} }
  if (state.pc) { try { state.pc.close(); } catch {} }
  state.dc = null; state.pc = null; state.pendingCandidates = [];
  updateRtcStatus("idle");
}

function stopLocalStream() {
  if (state.localStream) for (const track of state.localStream.getTracks()) { try { track.stop(); } catch {} }
  state.localStream = null; ui.localVideo.srcObject = null;
}

async function resetHost(sendLeave = true) {
  if (sendLeave && state.ws && state.ws.readyState === WebSocket.OPEN && state.roomCode) sendWs({ type: "leave-room", roomCode: state.roomCode });
  await closePeer(); stopLocalStream(); await window.remoteCoop.setInputEnabled(false);
  state.roomCode = null; state.pendingGuestPeerId = null;
  ui.roomCode.textContent = "------"; ui.startHost.disabled = false; ui.stopHost.disabled = true; ui.remoteInputToggle.checked = false; ui.toastHost.classList.add("hidden");
  ui.hostEmpty.classList.remove("hidden"); ui.hostSubtitle.textContent = "No capture yet"; ui.hostLiveDot.textContent = "idle"; ui.hostLiveDot.classList.remove("live");
  log("info", "Host reset");
}

async function resetGuest(sendLeave = true) {
  if (sendLeave && state.ws && state.ws.readyState === WebSocket.OPEN && state.roomCode) sendWs({ type: "leave-room", roomCode: state.roomCode });
  await closePeer(); state.roomCode = null; state.guestAccepted = false; state.remoteStream = null;
  ui.remoteVideo.srcObject = null; ui.guestEmpty.classList.remove("hidden"); ui.guestSubtitle.textContent = "Waiting for host"; ui.guestLiveDot.textContent = "idle"; ui.guestLiveDot.classList.remove("live");
  ui.joinRoom.disabled = false; ui.leaveGuest.disabled = true; unlockGuestInput();
  log("info", "Guest reset");
}

function goBack() { if (state.role === "host") resetHost(); if (state.role === "guest") resetGuest(); state.role = null; showScreen("role"); log("info", "Returned to role screen"); }

async function testLocalInput() {
  log("input", "Running local input test: KeyW down/up");
  const status = await window.remoteCoop.setInputEnabled(true);
  if (status.helperError) { showToast(`Input helper failed: ${status.helperError}`, 7000); log("error", "Local input test failed at helper start", status); return; }
  const down = await window.remoteCoop.sendInput({ type: "input", action: "down", code: "KeyW" });
  await new Promise((resolve) => setTimeout(resolve, 80));
  const up = await window.remoteCoop.sendInput({ type: "input", action: "up", code: "KeyW" });
  log(down.ok && up.ok ? "input" : "error", "Local input test result", { down, up });
  showToast("Local input test sent W. Open Notepad and repeat if needed.");
}


async function toggleFullscreen(target, label) {
  try {
    if (!target) {
      log("warn", `Fullscreen target missing: ${label}`);
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      log("info", `Exited fullscreen: ${label}`);
      return;
    }

    await target.requestFullscreen({ navigationUI: "hide" });
    log("info", `Entered fullscreen: ${label}`);
  } catch (error) {
    log("error", `Fullscreen failed: ${label}`, { message: error.message });
    showToast(`Fullscreen failed: ${error.message}`, 6000);
  }
}

document.addEventListener("fullscreenchange", () => {
  const isFullscreen = Boolean(document.fullscreenElement);
  if (ui.hostFullscreen) ui.hostFullscreen.textContent = isFullscreen ? "Exit fullscreen" : "Fullscreen";
  if (ui.guestFullscreen) ui.guestFullscreen.textContent = isFullscreen ? "Exit fullscreen" : "Fullscreen";
});

function bindEvents() {
  ui.chooseHost.addEventListener("click", () => { state.role = "host"; showScreen("host"); log("info", "Selected host mode"); });
  ui.chooseGuest.addEventListener("click", () => { state.role = "guest"; showScreen("guest"); log("info", "Selected guest mode"); });
  ui.homeNav.addEventListener("click", goBack);
  ui.hostNav.addEventListener("click", () => { state.role = "host"; showScreen("host"); log("info", "Opened host screen from navigation"); });
  ui.guestNav.addEventListener("click", () => { state.role = "guest"; showScreen("guest"); log("info", "Opened guest screen from navigation"); });
  ui.settingsNav.addEventListener("click", openSettingsModal);
  ui.quickOpenSettings.addEventListener("click", openSettingsModal);
  ui.closeSettingsModal.addEventListener("click", closeSettingsModal);
  ui.settingsModal.addEventListener("click", (event) => { if (event.target === ui.settingsModal) closeSettingsModal(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !ui.settingsModal.classList.contains("hidden")) closeSettingsModal();
  });
  document.querySelectorAll("[data-back]").forEach((btn) => btn.addEventListener("click", goBack));
  ui.saveSettings.addEventListener("click", () => { saveSettings(); closeSettingsModal(); });

  ui.hostFullscreen.addEventListener("click", () => toggleFullscreen(ui.hostVideoWrap, "host preview"));
  ui.guestFullscreen.addEventListener("click", () => toggleFullscreen(ui.remoteStage, "guest stream"));
  ui.startHost.addEventListener("click", startHost);
  ui.stopHost.addEventListener("click", () => resetHost());
  ui.copyRoom.addEventListener("click", async () => { if (!state.roomCode) return; await navigator.clipboard.writeText(state.roomCode); showToast("Room code copied."); });

  ui.remoteInputToggle.addEventListener("change", async () => {
    const enabled = ui.remoteInputToggle.checked;
    const status = await window.remoteCoop.setInputEnabled(enabled);
    log(status.helperError ? "error" : "info", `Remote input toggle: ${enabled}`, status);
    if (enabled && status.helperError) { ui.remoteInputToggle.checked = false; showToast(`Remote input failed: ${status.helperError}`, 8000); }
    else showToast(enabled ? "Remote input enabled." : "Remote input disabled.");
  });

  ui.testLocalInput.addEventListener("click", testLocalInput);
  ui.acceptGuest.addEventListener("click", () => { if (!state.roomCode) return; sendWs({ type: "accept-guest", roomCode: state.roomCode }); ui.toastHost.classList.add("hidden"); });
  ui.rejectGuest.addEventListener("click", () => { if (!state.roomCode) return; sendWs({ type: "reject-guest", roomCode: state.roomCode }); ui.toastHost.classList.add("hidden"); });
  ui.joinCode.addEventListener("input", () => { ui.joinCode.value = ui.joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6); });
  ui.joinRoom.addEventListener("click", joinRoom);
  ui.leaveGuest.addEventListener("click", () => resetGuest());
  ui.guestInputLock.addEventListener("change", () => { if (ui.guestInputLock.checked) lockGuestInput(); else unlockGuestInput(); });

  ui.remoteStage.addEventListener("keydown", onGuestKeyDown);
  ui.remoteStage.addEventListener("keyup", onGuestKeyUp);
  window.addEventListener("keydown", onGuestKeyDown);
  window.addEventListener("keyup", onGuestKeyUp);
  window.addEventListener("blur", () => { releaseGuestPressedKeys(); window.remoteCoop.releaseAllKeys(); });
  window.addEventListener("beforeunload", () => { releaseGuestPressedKeys(); window.remoteCoop.releaseAllKeys(); });
  ui.clearLog.addEventListener("click", () => { state.logs = []; ui.debugLog.textContent = ""; log("info", "Debug log cleared"); });
  ui.copyLog.addEventListener("click", async () => { await navigator.clipboard.writeText(state.logs.map((e) => `[${e.at}] ${e.level.toUpperCase()} ${e.message}${e.data ? " " + safeStringify(e.data) : ""}`).join("\n")); showToast("Logs copied."); });

  window.remoteCoop.onDebugEvent((entry) => log(entry.level || "info", `${entry.source || "main"}: ${entry.message || "event"}`, entry.data));
}

loadSettings();
bindEvents();
showScreen("role");
updateSignalStatus("disconnected");
updateRtcStatus("idle");
setLatency(null);
log("info", "App ready");
