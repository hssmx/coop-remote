const $ = (selector) => document.querySelector(selector);

const ui = {
  roleScreen: $("#roleScreen"),
  hostScreen: $("#hostScreen"),
  guestScreen: $("#guestScreen"),
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
  toast: $("#toast")
};

const DEFAULT_SETTINGS = {
  serverUrl: "ws://localhost:8787",
  stunUrl: "stun:stun.l.google.com:19302",
  turnUrl: "",
  turnUsername: "",
  turnPassword: ""
};

const ALLOWED_CODES = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Space",
  "Enter",
  "ShiftLeft",
  "ShiftRight",
  "ControlLeft",
  "ControlRight"
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
  lastBytes: 0,
  lastBytesAt: 0,
  settings: { ...DEFAULT_SETTINGS }
};

function showToast(message, duration = 3200) {
  ui.toast.textContent = message;
  ui.toast.classList.remove("hidden");
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => ui.toast.classList.add("hidden"), duration);
}

function showScreen(screen) {
  ui.roleScreen.classList.toggle("hidden", screen !== "role");
  ui.hostScreen.classList.toggle("hidden", screen !== "host");
  ui.guestScreen.classList.toggle("hidden", screen !== "guest");
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
  showToast("Settings saved.");
}

function getIceServers() {
  const iceServers = [];

  if (state.settings.stunUrl) {
    iceServers.push({ urls: state.settings.stunUrl });
  }

  if (state.settings.turnUrl) {
    iceServers.push({
      urls: state.settings.turnUrl,
      username: state.settings.turnUsername,
      credential: state.settings.turnPassword
    });
  }

  return iceServers;
}

function updateSignalStatus(text) {
  ui.signalStatus.textContent = `Signaling: ${text}`;
}

function updateRtcStatus(text) {
  ui.rtcStatus.textContent = `WebRTC: ${text}`;
}

function setLatency(ms) {
  if (typeof ms === "number" && Number.isFinite(ms)) {
    ui.latencyStatus.textContent = `Latency: ${Math.round(ms)} ms`;
  } else {
    ui.latencyStatus.textContent = "Latency: -- ms";
  }
}

function sendWs(payload) {
  if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
    showToast("Signaling server is not connected.");
    return false;
  }

  state.ws.send(JSON.stringify(payload));
  return true;
}

function connectSignaling() {
  if (state.ws && state.ws.readyState === WebSocket.OPEN) return Promise.resolve();

  saveSettings();
  updateSignalStatus("connecting");

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
      resolve();
    });

    ws.addEventListener("close", () => {
      updateSignalStatus("disconnected");
      if (state.role === "host") resetHost(false);
      if (state.role === "guest") resetGuest(false);
    });

    ws.addEventListener("error", () => {
      updateSignalStatus("error");
    });

    ws.addEventListener("message", async (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      await handleServerMessage(msg);
    });
  });
}

async function handleServerMessage(msg) {
  switch (msg.type) {
    case "welcome":
      state.peerId = msg.peerId;
      return;

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

    case "signal":
      await handleSignal(msg.payload);
      return;

    case "guest-left":
      showToast("Guest left.");
      await closePeer();
      return;

    case "room-closed":
      showToast(`Room closed: ${msg.reason || "closed"}`);
      if (state.role === "host") resetHost(false);
      if (state.role === "guest") resetGuest(false);
      return;

    case "error":
      showToast(msg.message || "Server error.");
      return;
  }
}

async function startCapture() {
  const videoConstraints = {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 60, max: 60 }
  };

  let stream;
  try {
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: videoConstraints,
      audio: true
    });
  } catch (firstError) {
    console.warn("Capture with audio failed, retrying video only:", firstError);
    stream = await navigator.mediaDevices.getDisplayMedia({
      video: videoConstraints,
      audio: false
    });
  }
  state.localStream = stream;
  ui.localVideo.srcObject = stream;
  ui.hostEmpty.classList.add("hidden");
  ui.hostSubtitle.textContent = "Screen capture active";
  ui.hostLiveDot.textContent = "live";
  ui.hostLiveDot.classList.add("live");

  for (const track of stream.getTracks()) {
    track.addEventListener("ended", () => {
      if (state.role === "host") {
        showToast("Capture stopped.");
        resetHost();
      }
    });
  }
}

async function startHost() {
  try {
    await connectSignaling();
    await startCapture();
    sendWs({ type: "create-room" });
  } catch (error) {
    console.error(error);
    showToast(error.message || "Could not start hosting.");
    resetHost(false);
  }
}

async function createPeerConnection() {
  const pc = new RTCPeerConnection({
    iceServers: getIceServers(),
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require"
  });

  state.pc = pc;
  updateRtcStatus("connecting");

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      sendSignal("ice", event.candidate);
    }
  };

  pc.onconnectionstatechange = () => {
    updateRtcStatus(pc.connectionState);
    if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
      if (pc.connectionState === "failed") showToast("WebRTC connection failed. Try adding a TURN server.");
    }
  };

  pc.oniceconnectionstatechange = () => {
    if (pc.iceConnectionState === "failed") {
      showToast("ICE failed. TURN relay may be required.");
    }
  };

  return pc;
}

async function startHostPeer() {
  if (!state.localStream) {
    showToast("Start screen capture first.");
    return;
  }

  await closePeer();

  const pc = await createPeerConnection();

  for (const track of state.localStream.getTracks()) {
    pc.addTrack(track, state.localStream);
  }

  const dc = pc.createDataChannel("input", {
    ordered: false,
    maxRetransmits: 0
  });

  setupHostDataChannel(dc);

  const offer = await pc.createOffer({
    offerToReceiveAudio: false,
    offerToReceiveVideo: false
  });

  await pc.setLocalDescription(offer);
  sendSignal("offer", offer);
  startStats();
}

function setupHostDataChannel(dc) {
  state.dc = dc;

  dc.onopen = () => {
    showToast("Input channel open.");
  };

  dc.onclose = () => {
    window.remoteCoop.releaseAllKeys();
  };

  dc.onmessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === "input") {
      await window.remoteCoop.sendInput(msg);
      return;
    }

    if (msg.type === "ping") {
      safeSendData({ type: "pong", t: msg.t });
      return;
    }
  };
}

function setupGuestDataChannel(dc) {
  state.dc = dc;

  dc.onopen = () => {
    showToast("Input channel ready.");
    startPing();
  };

  dc.onclose = () => {
    stopPing();
    unlockGuestInput();
  };
}

function safeSendData(payload) {
  if (!state.dc || state.dc.readyState !== "open") return false;
  state.dc.send(JSON.stringify(payload));
  return true;
}

function sendSignal(kind, data) {
  sendWs({
    type: "signal",
    roomCode: state.roomCode,
    payload: { kind, data }
  });
}

async function handleSignal(payload) {
  if (!payload || !payload.kind) return;

  if (payload.kind === "offer") {
    await handleOffer(payload.data);
    return;
  }

  if (payload.kind === "answer") {
    if (!state.pc) return;
    await state.pc.setRemoteDescription(new RTCSessionDescription(payload.data));
    await flushPendingCandidates();
    return;
  }

  if (payload.kind === "ice") {
    await handleIce(payload.data);
  }
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
  };

  pc.ondatachannel = (event) => {
    setupGuestDataChannel(event.channel);
  };

  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  await flushPendingCandidates();

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  sendSignal("answer", answer);
  startStats();
}

async function handleIce(candidate) {
  if (!candidate) return;

  if (!state.pc || !state.pc.remoteDescription) {
    state.pendingCandidates.push(candidate);
    return;
  }

  try {
    await state.pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (error) {
    console.warn("Could not add ICE candidate:", error);
  }
}

async function flushPendingCandidates() {
  if (!state.pc || !state.pc.remoteDescription) return;

  const pending = [...state.pendingCandidates];
  state.pendingCandidates = [];

  for (const candidate of pending) {
    await handleIce(candidate);
  }
}

async function joinRoom() {
  const code = ui.joinCode.value.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    showToast("Enter a valid 6-character room code.");
    return;
  }

  try {
    await connectSignaling();
    state.roomCode = code;
    ui.guestSubtitle.textContent = "Sending join request...";
    sendWs({ type: "join-room", roomCode: code });
  } catch (error) {
    showToast(error.message || "Could not join room.");
  }
}

function lockGuestInput() {
  if (!state.dc || state.dc.readyState !== "open") {
    ui.guestInputLock.checked = false;
    showToast("Input channel is not ready yet.");
    return;
  }

  ui.remoteStage.focus();
  ui.inputOverlay.classList.remove("hidden");
}

function unlockGuestInput() {
  ui.guestInputLock.checked = false;
  ui.inputOverlay.classList.add("hidden");
  releaseGuestPressedKeys();
}

function sendGuestInput(action, code) {
  if (!ALLOWED_CODES.has(code)) return;
  safeSendData({ type: "input", action, code });
}

function releaseGuestPressedKeys() {
  for (const code of Array.from(state.pressedCodes)) {
    sendGuestInput("up", code);
    state.pressedCodes.delete(code);
  }
}

function onGuestKeyDown(event) {
  if (!ui.guestInputLock.checked) return;
  if (event.code === "Escape") {
    event.preventDefault();
    unlockGuestInput();
    return;
  }

  if (!ALLOWED_CODES.has(event.code)) return;
  event.preventDefault();

  if (state.pressedCodes.has(event.code)) return;
  state.pressedCodes.add(event.code);
  sendGuestInput("down", event.code);
}

function onGuestKeyUp(event) {
  if (!ui.guestInputLock.checked) return;
  if (!ALLOWED_CODES.has(event.code)) return;

  event.preventDefault();
  state.pressedCodes.delete(event.code);
  sendGuestInput("up", event.code);
}

function startPing() {
  stopPing();

  state.pingTimer = setInterval(() => {
    safeSendData({ type: "ping", t: performance.now() });
  }, 1000);

  if (state.dc) {
    const original = state.dc.onmessage;
    state.dc.onmessage = (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }

      if (msg.type === "pong" && typeof msg.t === "number") {
        setLatency(performance.now() - msg.t);
        return;
      }

      if (typeof original === "function") original(event);
    };
  }
}

function stopPing() {
  if (state.pingTimer) clearInterval(state.pingTimer);
  state.pingTimer = null;
  setLatency(null);
}

function startStats() {
  stopStats();

  state.statsTimer = setInterval(async () => {
    if (!state.pc) return;

    try {
      const stats = await state.pc.getStats();
      let selectedPair = null;

      stats.forEach((report) => {
        if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated) {
          selectedPair = report;
        }
      });

      if (selectedPair && typeof selectedPair.currentRoundTripTime === "number") {
        const networkMs = selectedPair.currentRoundTripTime * 1000;
        if (state.role === "host") {
          ui.latencyStatus.textContent = `Network RTT: ${Math.round(networkMs)} ms`;
        }
      }
    } catch {
      // Stats are optional.
    }
  }, 1500);
}

function stopStats() {
  if (state.statsTimer) clearInterval(state.statsTimer);
  state.statsTimer = null;
}

async function closePeer() {
  stopPing();
  stopStats();
  releaseGuestPressedKeys();
  await window.remoteCoop.releaseAllKeys();

  if (state.dc) {
    try { state.dc.close(); } catch {}
  }

  if (state.pc) {
    try { state.pc.close(); } catch {}
  }

  state.dc = null;
  state.pc = null;
  state.pendingCandidates = [];
  updateRtcStatus("idle");
}

function stopLocalStream() {
  if (state.localStream) {
    for (const track of state.localStream.getTracks()) {
      try { track.stop(); } catch {}
    }
  }

  state.localStream = null;
  ui.localVideo.srcObject = null;
}

async function resetHost(sendLeave = true) {
  if (sendLeave && state.ws && state.ws.readyState === WebSocket.OPEN && state.roomCode) {
    sendWs({ type: "leave-room", roomCode: state.roomCode });
  }

  await closePeer();
  stopLocalStream();
  await window.remoteCoop.setInputEnabled(false);

  state.roomCode = null;
  state.pendingGuestPeerId = null;

  ui.roomCode.textContent = "------";
  ui.startHost.disabled = false;
  ui.stopHost.disabled = true;
  ui.remoteInputToggle.checked = false;
  ui.toastHost.classList.add("hidden");
  ui.hostEmpty.classList.remove("hidden");
  ui.hostSubtitle.textContent = "No capture yet";
  ui.hostLiveDot.textContent = "idle";
  ui.hostLiveDot.classList.remove("live");
}

async function resetGuest(sendLeave = true) {
  if (sendLeave && state.ws && state.ws.readyState === WebSocket.OPEN && state.roomCode) {
    sendWs({ type: "leave-room", roomCode: state.roomCode });
  }

  await closePeer();

  state.roomCode = null;
  state.guestAccepted = false;
  state.remoteStream = null;

  ui.remoteVideo.srcObject = null;
  ui.guestEmpty.classList.remove("hidden");
  ui.guestSubtitle.textContent = "Waiting for host";
  ui.guestLiveDot.textContent = "idle";
  ui.guestLiveDot.classList.remove("live");
  ui.joinRoom.disabled = false;
  ui.leaveGuest.disabled = true;
  unlockGuestInput();
}

function goBack() {
  if (state.role === "host") resetHost();
  if (state.role === "guest") resetGuest();

  state.role = null;
  showScreen("role");
}

function bindEvents() {
  ui.chooseHost.addEventListener("click", () => {
    state.role = "host";
    showScreen("host");
  });

  ui.chooseGuest.addEventListener("click", () => {
    state.role = "guest";
    showScreen("guest");
  });

  document.querySelectorAll("[data-back]").forEach((btn) => {
    btn.addEventListener("click", goBack);
  });

  ui.saveSettings.addEventListener("click", saveSettings);
  ui.startHost.addEventListener("click", startHost);
  ui.stopHost.addEventListener("click", () => resetHost());

  ui.copyRoom.addEventListener("click", async () => {
    if (!state.roomCode) return;
    await navigator.clipboard.writeText(state.roomCode);
    showToast("Room code copied.");
  });

  ui.remoteInputToggle.addEventListener("change", async () => {
    const enabled = ui.remoteInputToggle.checked;
    const status = await window.remoteCoop.setInputEnabled(enabled);
    if (enabled && status.helperError) {
      showToast(status.helperError, 5500);
    } else {
      showToast(enabled ? "Remote input enabled." : "Remote input disabled.");
    }
  });

  ui.acceptGuest.addEventListener("click", () => {
    if (!state.roomCode) return;
    sendWs({ type: "accept-guest", roomCode: state.roomCode });
    ui.toastHost.classList.add("hidden");
  });

  ui.rejectGuest.addEventListener("click", () => {
    if (!state.roomCode) return;
    sendWs({ type: "reject-guest", roomCode: state.roomCode });
    ui.toastHost.classList.add("hidden");
  });

  ui.joinCode.addEventListener("input", () => {
    ui.joinCode.value = ui.joinCode.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  });

  ui.joinRoom.addEventListener("click", joinRoom);
  ui.leaveGuest.addEventListener("click", () => resetGuest());

  ui.guestInputLock.addEventListener("change", () => {
    if (ui.guestInputLock.checked) lockGuestInput();
    else unlockGuestInput();
  });

  ui.remoteStage.addEventListener("keydown", onGuestKeyDown);
  ui.remoteStage.addEventListener("keyup", onGuestKeyUp);
  window.addEventListener("blur", () => {
    releaseGuestPressedKeys();
    window.remoteCoop.releaseAllKeys();
  });

  window.addEventListener("beforeunload", () => {
    releaseGuestPressedKeys();
    window.remoteCoop.releaseAllKeys();
  });
}

loadSettings();
bindEvents();
showScreen("role");
updateSignalStatus("disconnected");
updateRtcStatus("idle");
setLatency(null);
