require("dotenv").config();

const http = require("http");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 8787);
const ROOM_TTL_MINUTES = Number(process.env.ROOM_TTL_MINUTES || 180);

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, clients: clients.size }));
    return;
  }

  res.writeHead(200, { "content-type": "text/plain" });
  res.end("Remote Coop Play signaling server is running.");
});

const wss = new WebSocketServer({ server });

const clients = new Map();
const rooms = new Map();

function now() {
  return Date.now();
}

function makePeerId() {
  return crypto.randomBytes(8).toString("hex");
}

function makeRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function send(ws, payload) {
  if (ws && ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function sendError(ws, message, details = {}) {
  send(ws, { type: "error", message, ...details });
}

function getRoom(code) {
  if (!code) return null;
  return rooms.get(String(code).trim().toUpperCase()) || null;
}

function getClient(peerId) {
  const client = clients.get(peerId);
  return client && client.ws.readyState === client.ws.OPEN ? client : null;
}

function deleteRoom(code, reason = "closed") {
  const room = rooms.get(code);
  if (!room) return;

  for (const peerId of [room.hostPeerId, room.guestPeerId, room.pendingGuestPeerId]) {
    const client = getClient(peerId);
    if (client) {
      send(client.ws, { type: "room-closed", roomCode: code, reason });
      client.roomCode = null;
      client.role = null;
    }
  }

  rooms.delete(code);
}

function cleanupExpiredRooms() {
  const maxAgeMs = ROOM_TTL_MINUTES * 60 * 1000;
  for (const [code, room] of rooms.entries()) {
    if (now() - room.createdAt > maxAgeMs) {
      deleteRoom(code, "expired");
    }
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
    connectedAt: now(),
    alive: true
  };

  clients.set(peerId, client);
  send(ws, { type: "welcome", peerId });

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
      sendError(ws, "Internal signaling error.");
    }
  });

  ws.on("close", () => {
    const { roomCode, role } = client;
    clients.delete(peerId);

    if (roomCode) {
      const room = getRoom(roomCode);
      if (!room) return;

      if (role === "host") {
        deleteRoom(roomCode, "host-disconnected");
      } else if (role === "guest" || room.pendingGuestPeerId === peerId) {
        const host = getClient(room.hostPeerId);
        if (host) send(host.ws, { type: "guest-left", roomCode });
        room.guestPeerId = null;
        room.pendingGuestPeerId = null;
      }
    }
  });
});

function handleMessage(client, msg) {
  switch (msg.type) {
    case "create-room":
      return createRoom(client);

    case "join-room":
      return joinRoom(client, msg);

    case "accept-guest":
      return acceptGuest(client, msg);

    case "reject-guest":
      return rejectGuest(client, msg);

    case "signal":
      return relaySignal(client, msg);

    case "leave-room":
      return leaveRoom(client);

    case "ping":
      return send(client.ws, { type: "pong", at: now(), echo: msg.at });

    default:
      return sendError(client.ws, `Unknown message type: ${msg.type}`);
  }
}

function createRoom(client) {
  if (client.roomCode) {
    leaveRoom(client);
  }

  let code = makeRoomCode();
  while (rooms.has(code)) code = makeRoomCode();

  const room = {
    code,
    hostPeerId: client.peerId,
    guestPeerId: null,
    pendingGuestPeerId: null,
    createdAt: now()
  };

  rooms.set(code, room);
  client.role = "host";
  client.roomCode = code;

  send(client.ws, {
    type: "room-created",
    roomCode: code,
    peerId: client.peerId
  });
}

function joinRoom(client, msg) {
  const code = String(msg.roomCode || "").trim().toUpperCase();
  const room = getRoom(code);

  if (!room) {
    sendError(client.ws, "Room not found.", { roomCode: code });
    return;
  }

  if (room.guestPeerId || room.pendingGuestPeerId) {
    sendError(client.ws, "Room already has a guest.", { roomCode: code });
    return;
  }

  if (room.hostPeerId === client.peerId) {
    sendError(client.ws, "You cannot join your own room.", { roomCode: code });
    return;
  }

  client.role = "guest";
  client.roomCode = code;
  room.pendingGuestPeerId = client.peerId;

  const host = getClient(room.hostPeerId);
  if (!host) {
    deleteRoom(code, "host-disconnected");
    sendError(client.ws, "Host is no longer connected.", { roomCode: code });
    return;
  }

  send(client.ws, {
    type: "join-request-sent",
    roomCode: code
  });

  send(host.ws, {
    type: "join-request",
    roomCode: code,
    guestPeerId: client.peerId
  });
}

function acceptGuest(client, msg) {
  const code = String(msg.roomCode || client.roomCode || "").trim().toUpperCase();
  const room = getRoom(code);

  if (!room || room.hostPeerId !== client.peerId) {
    sendError(client.ws, "Only the host can accept guests.", { roomCode: code });
    return;
  }

  const guest = getClient(room.pendingGuestPeerId);
  if (!guest) {
    room.pendingGuestPeerId = null;
    sendError(client.ws, "Guest is no longer connected.", { roomCode: code });
    return;
  }

  room.guestPeerId = guest.peerId;
  room.pendingGuestPeerId = null;
  guest.role = "guest";
  guest.roomCode = code;

  send(client.ws, {
    type: "guest-connected",
    roomCode: code,
    guestPeerId: guest.peerId
  });

  send(guest.ws, {
    type: "guest-accepted",
    roomCode: code,
    hostPeerId: client.peerId
  });
}

function rejectGuest(client, msg) {
  const code = String(msg.roomCode || client.roomCode || "").trim().toUpperCase();
  const room = getRoom(code);

  if (!room || room.hostPeerId !== client.peerId) {
    sendError(client.ws, "Only the host can reject guests.", { roomCode: code });
    return;
  }

  const guest = getClient(room.pendingGuestPeerId);
  if (guest) {
    send(guest.ws, {
      type: "guest-rejected",
      roomCode: code
    });
    guest.roomCode = null;
    guest.role = null;
  }

  room.pendingGuestPeerId = null;
}

function relaySignal(client, msg) {
  const code = String(msg.roomCode || client.roomCode || "").trim().toUpperCase();
  const room = getRoom(code);

  if (!room) {
    sendError(client.ws, "Room not found for signal.", { roomCode: code });
    return;
  }

  const isHost = room.hostPeerId === client.peerId;
  const isGuest = room.guestPeerId === client.peerId;

  if (!isHost && !isGuest) {
    sendError(client.ws, "You are not part of this room.", { roomCode: code });
    return;
  }

  const targetPeerId = isHost ? room.guestPeerId : room.hostPeerId;
  const target = getClient(targetPeerId);

  if (!target) {
    sendError(client.ws, "Target peer not connected.", { roomCode: code });
    return;
  }

  send(target.ws, {
    type: "signal",
    roomCode: code,
    from: isHost ? "host" : "guest",
    payload: msg.payload
  });
}

function leaveRoom(client) {
  const code = client.roomCode;
  if (!code) return;

  const room = getRoom(code);
  if (!room) {
    client.roomCode = null;
    client.role = null;
    return;
  }

  if (room.hostPeerId === client.peerId) {
    deleteRoom(code, "host-left");
  } else {
    const host = getClient(room.hostPeerId);
    if (host) {
      send(host.ws, { type: "guest-left", roomCode: code });
    }
    if (room.guestPeerId === client.peerId) room.guestPeerId = null;
    if (room.pendingGuestPeerId === client.peerId) room.pendingGuestPeerId = null;
    client.roomCode = null;
    client.role = null;
    send(client.ws, { type: "left-room", roomCode: code });
  }
}

setInterval(() => {
  for (const [peerId, client] of clients.entries()) {
    if (!client.alive) {
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
});
