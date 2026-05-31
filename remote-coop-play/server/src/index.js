
require("dotenv").config();

const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 8787);
const ROOM_TTL_MINUTES = Number(process.env.ROOM_TTL_MINUTES || 180);

const clients = new Map();
const rooms = new Map();

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      rooms: rooms.size,
      clients: clients.size,
      version: "party-v2"
    }));
    return;
  }

  res.writeHead(200, { "content-type": "text/plain" });
  res.end("Remote Coop Play signaling server is running.");
});

const wss = new WebSocketServer({ server });

function now() {
  return Date.now();
}

function makePeerId() {
  return crypto.randomBytes(8).toString("hex");
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 6; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
  } while (rooms.has(code));
  return code;
}

function send(ws, payload) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

function sendClient(peerId, payload) {
  const client = getClient(peerId);
  if (client) send(client.ws, payload);
}

function sendError(ws, message, details = {}) {
  send(ws, { type: "error", message, ...details });
}

function normalizeCode(code) {
  return String(code || "").trim().toUpperCase();
}

function getRoom(code) {
  return rooms.get(normalizeCode(code)) || null;
}

function getClient(peerId) {
  const client = clients.get(peerId);
  return client && client.ws.readyState === client.ws.OPEN ? client : null;
}

function defaultPermissions() {
  return {
    keyboard: true,
    mouseMove: false,
    mouseButtons: false,
    mouseWheel: false,
    allowedKeys: ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "Enter", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight"]
  };
}

function publicMember(room, peerId) {
  const member = room.members.get(peerId) || room.pending.get(peerId);
  if (!member) return null;

  return {
    peerId,
    name: member.name || "Player",
    role: peerId === room.hostPeerId ? "host" : "guest",
    status: room.pending.has(peerId) ? "pending" : "accepted",
    permissions: member.permissions || defaultPermissions(),
    media: member.media || { camera: false, mic: false },
    joinedAt: member.joinedAt
  };
}

function publicRoom(room) {
  return {
    code: room.code,
    hostPeerId: room.hostPeerId,
    maxPeople: room.maxPeople,
    allowJoin: room.allowJoin,
    createdAt: room.createdAt,
    members: Array.from(room.members.keys()).map((peerId) => publicMember(room, peerId)).filter(Boolean),
    pending: Array.from(room.pending.keys()).map((peerId) => publicMember(room, peerId)).filter(Boolean)
  };
}

function broadcastRoom(room, type = "room-state") {
  const payload = { type, room: publicRoom(room) };

  for (const peerId of room.members.keys()) {
    sendClient(peerId, payload);
  }

  for (const peerId of room.pending.keys()) {
    sendClient(peerId, payload);
  }
}

function deleteRoom(code, reason = "closed") {
  const room = getRoom(code);
  if (!room) return;

  for (const peerId of [...room.members.keys(), ...room.pending.keys()]) {
    const client = getClient(peerId);
    if (client) {
      send(client.ws, { type: "room-closed", roomCode: room.code, reason });
      client.roomCode = null;
      client.role = null;
    }
  }

  rooms.delete(room.code);
}

function cleanupExpiredRooms() {
  const maxAgeMs = ROOM_TTL_MINUTES * 60 * 1000;
  for (const [code, room] of rooms.entries()) {
    if (now() - room.createdAt > maxAgeMs) deleteRoom(code, "expired");
  }
}

setInterval(cleanupExpiredRooms, 60_000);

wss.on("connection", (ws) => {
  const peerId = makePeerId();
  const client = {
    ws,
    peerId,
    role: null,
    roomCode: null,
    name: "Player",
    connectedAt: now(),
    alive: true
  };

  clients.set(peerId, client);
  send(ws, { type: "welcome", peerId, serverVersion: "party-v2" });

  ws.on("pong", () => {
    client.alive = true;
  });

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      sendError(ws, "Invalid JSON message.");
      return;
    }

    try {
      handleMessage(client, msg);
    } catch (error) {
      console.error("Message error:", error);
      sendError(ws, "Internal signaling error.", { details: error.message });
    }
  });

  ws.on("close", () => {
    leaveRoom(client, "disconnect");
    clients.delete(peerId);
  });
});

function handleMessage(client, msg) {
  switch (msg.type) {
    case "create-room":
      return createRoom(client, msg);

    case "join-room":
      return joinRoom(client, msg);

    case "accept-guest":
      return acceptGuest(client, msg);

    case "reject-guest":
      return rejectGuest(client, msg);

    case "signal":
      return relaySignal(client, msg);

    case "update-room":
      return updateRoom(client, msg);

    case "update-permissions":
      return updatePermissions(client, msg);

    case "member-media":
      return updateMemberMedia(client, msg);

    case "leave-room":
      return leaveRoom(client, "left");

    case "ping":
      return send(client.ws, { type: "pong", at: now(), echo: msg.at });

    default:
      return sendError(client.ws, `Unknown message type: ${msg.type}`);
  }
}

function createRoom(client, msg = {}) {
  if (client.roomCode) leaveRoom(client, "new-room");

  const code = makeRoomCode();
  const maxPeople = clamp(Number(msg.maxPeople || 2), 2, 8);
  const name = cleanName(msg.name || "Host");

  const room = {
    code,
    hostPeerId: client.peerId,
    maxPeople,
    allowJoin: true,
    createdAt: now(),
    members: new Map(),
    pending: new Map()
  };

  room.members.set(client.peerId, {
    name,
    permissions: {
      keyboard: true,
      mouseMove: true,
      mouseButtons: true,
      mouseWheel: true,
      allowedKeys: ["*"]
    },
    media: { camera: false, mic: false },
    joinedAt: now()
  });

  rooms.set(code, room);
  client.role = "host";
  client.name = name;
  client.roomCode = code;

  send(client.ws, {
    type: "room-created",
    roomCode: code,
    peerId: client.peerId,
    room: publicRoom(room)
  });

  broadcastRoom(room);
}

function joinRoom(client, msg) {
  const code = normalizeCode(msg.roomCode);
  const room = getRoom(code);
  const name = cleanName(msg.name || "Guest");

  if (!room) {
    sendError(client.ws, "Room not found.", { roomCode: code });
    return;
  }

  if (!room.allowJoin) {
    sendError(client.ws, "Host disabled new joins.", { roomCode: code });
    return;
  }

  if (room.members.has(client.peerId) || room.pending.has(client.peerId)) {
    sendError(client.ws, "You already requested or joined this room.", { roomCode: code });
    return;
  }

  if (room.members.size >= room.maxPeople) {
    sendError(client.ws, "Room is full.", { roomCode: code, maxPeople: room.maxPeople });
    return;
  }

  client.role = "pending";
  client.name = name;
  client.roomCode = code;

  room.pending.set(client.peerId, {
    name,
    permissions: defaultPermissions(),
    media: { camera: false, mic: false },
    joinedAt: now()
  });

  send(client.ws, { type: "join-request-sent", roomCode: code, room: publicRoom(room) });
  sendClient(room.hostPeerId, {
    type: "join-request",
    roomCode: code,
    guestPeerId: client.peerId,
    member: publicMember(room, client.peerId),
    room: publicRoom(room)
  });

  broadcastRoom(room);
}

function acceptGuest(client, msg) {
  const room = requireHost(client, msg.roomCode);
  if (!room) return;

  const peerId = String(msg.guestPeerId || msg.peerId || "");
  const pending = room.pending.get(peerId);
  if (!pending) {
    sendError(client.ws, "Guest is no longer pending.", { peerId });
    return;
  }

  if (room.members.size >= room.maxPeople) {
    sendError(client.ws, "Room is full.", { maxPeople: room.maxPeople });
    return;
  }

  room.pending.delete(peerId);
  room.members.set(peerId, {
    ...pending,
    permissions: msg.permissions || pending.permissions || defaultPermissions(),
    joinedAt: now()
  });

  const guest = getClient(peerId);
  if (guest) {
    guest.role = "guest";
    guest.roomCode = room.code;
    send(guest.ws, {
      type: "guest-accepted",
      roomCode: room.code,
      hostPeerId: room.hostPeerId,
      peerId: guest.peerId,
      room: publicRoom(room)
    });
  }

  sendClient(room.hostPeerId, {
    type: "guest-connected",
    roomCode: room.code,
    guestPeerId: peerId,
    room: publicRoom(room)
  });

  broadcastRoom(room);
}

function rejectGuest(client, msg) {
  const room = requireHost(client, msg.roomCode);
  if (!room) return;

  const peerId = String(msg.guestPeerId || msg.peerId || "");
  room.pending.delete(peerId);

  const guest = getClient(peerId);
  if (guest) {
    send(guest.ws, { type: "guest-rejected", roomCode: room.code });
    guest.roomCode = null;
    guest.role = null;
  }

  broadcastRoom(room);
}

function updateRoom(client, msg) {
  const room = requireHost(client, msg.roomCode);
  if (!room) return;

  if (msg.maxPeople !== undefined) room.maxPeople = clamp(Number(msg.maxPeople), 2, 8);
  if (msg.allowJoin !== undefined) room.allowJoin = Boolean(msg.allowJoin);

  broadcastRoom(room);
}

function updatePermissions(client, msg) {
  const room = requireHost(client, msg.roomCode);
  if (!room) return;

  const peerId = String(msg.peerId || "");
  const member = room.members.get(peerId);
  const pending = room.pending.get(peerId);

  if (!member && !pending) {
    sendError(client.ws, "Member not found for permissions.", { peerId });
    return;
  }

  const target = member || pending;
  target.permissions = {
    ...defaultPermissions(),
    ...(target.permissions || {}),
    ...(msg.permissions || {})
  };

  sendClient(peerId, {
    type: "member-permissions",
    roomCode: room.code,
    permissions: target.permissions,
    room: publicRoom(room)
  });

  broadcastRoom(room);
}

function updateMemberMedia(client, msg) {
  const room = getRoom(client.roomCode || msg.roomCode);
  if (!room) return;

  const member = room.members.get(client.peerId) || room.pending.get(client.peerId);
  if (!member) return;

  member.media = {
    camera: Boolean(msg.camera),
    mic: Boolean(msg.mic)
  };

  broadcastRoom(room);
}

function relaySignal(client, msg) {
  const room = getRoom(msg.roomCode || client.roomCode);
  if (!room) {
    sendError(client.ws, "Room not found for signal.", { roomCode: msg.roomCode || client.roomCode });
    return;
  }

  if (!room.members.has(client.peerId)) {
    sendError(client.ws, "You are not an accepted member of this room.", { roomCode: room.code });
    return;
  }

  const targetPeerId = String(msg.targetPeerId || "");
  if (!room.members.has(targetPeerId)) {
    sendError(client.ws, "Target peer is not in the room.", { targetPeerId });
    return;
  }

  sendClient(targetPeerId, {
    type: "signal",
    roomCode: room.code,
    fromPeerId: client.peerId,
    fromRole: room.hostPeerId === client.peerId ? "host" : "guest",
    payload: msg.payload
  });
}

function leaveRoom(client, reason = "left") {
  const room = getRoom(client.roomCode);
  if (!room) {
    client.roomCode = null;
    client.role = null;
    return;
  }

  if (room.hostPeerId === client.peerId) {
    deleteRoom(room.code, reason === "disconnect" ? "host-disconnected" : "host-left");
    return;
  }

  room.members.delete(client.peerId);
  room.pending.delete(client.peerId);

  sendClient(room.hostPeerId, {
    type: "guest-left",
    roomCode: room.code,
    guestPeerId: client.peerId,
    room: publicRoom(room)
  });

  send(client.ws, { type: "left-room", roomCode: room.code });

  client.roomCode = null;
  client.role = null;

  broadcastRoom(room);
}

function requireHost(client, roomCode) {
  const room = getRoom(roomCode || client.roomCode);

  if (!room || room.hostPeerId !== client.peerId) {
    sendError(client.ws, "Only the host can do this.", { roomCode: roomCode || client.roomCode });
    return null;
  }

  return room;
}

function cleanName(value) {
  const cleaned = String(value || "").trim().replace(/[^\w .-]/g, "").slice(0, 24);
  return cleaned || "Player";
}

function clamp(n, min, max) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

setInterval(() => {
  for (const [peerId, client] of clients.entries()) {
    if (!client.alive) {
      leaveRoom(client, "disconnect");
      try { client.ws.terminate(); } catch {}
      clients.delete(peerId);
      continue;
    }
    client.alive = false;
    try { client.ws.ping(); } catch {}
  }
}, 30_000);

server.listen(PORT, () => {
  console.log(`Remote Coop Play signaling server listening on :${PORT}`);
  console.log("Protocol: party-v2");
});
