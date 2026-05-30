# Remote Coop Play

Remote Coop Play is a Windows-focused app that turns local 2-player games into online co-op.

One computer hosts the game, streams the screen through WebRTC, and receives limited keyboard input from the guest. The guest watches the low-latency stream and sends only approved game keys such as WASD and arrow keys.

This project is built for legitimate, consent-based remote play. It is not stealth remote access software.


## Client-ready executable build

This repository includes two ways to produce the final Windows `.exe`:

### Option A, easiest: GitHub Actions

1. Push this folder to a GitHub repository.
2. Open **Actions**.
3. Run **Build Windows Executable**.
4. Download the artifact named **Remote-Coop-Play-Windows**.
5. Give the client only the `.exe` file.

### Option B: Build on Windows

Double click:

```text
BUILD_WINDOWS_EXE.bat
```

The final `.exe` files will appear in:

```text
app\dist\
```

The ChatGPT sandbox used to generate this project cannot currently download Electron's Windows runtime from GitHub, so it cannot attach the final `.exe` directly here. The workflow and scripts above produce the executable on a Windows builder or GitHub Actions.

## What is included

```text
remote-coop-play/
  app/                 Electron Windows client
  server/              WebSocket signaling server
  coturn/              Optional TURN relay config
  scripts/             Windows helper scripts
```

## Features

- Host mode and guest mode
- Room code system
- WebRTC video/audio streaming
- STUN support by default
- Optional TURN relay support for difficult networks
- Consent screen before a guest connects
- Host-side remote input toggle
- Guest-side input lock
- Real Windows key injection through a visible PowerShell SendInput helper
- Allowed-key whitelist
- Emergency stop
- Latency and connection state display
- UI/UX ready for testing and improvement

## Important limitation

This project is a complete MVP, not a commercial Parsec replacement.

For best results:
- Both users should use Ethernet or strong Wi-Fi.
- The host should run the game in borderless/windowed mode.
- The host should keep the game/browser focused.
- Use a TURN server if P2P fails because of strict routers.

## Requirements

- Windows 10/11
- Node.js 20 LTS or newer
- npm
- PowerShell, included in Windows

No router port forwarding is required when direct WebRTC succeeds. For strict networks, you need a TURN relay.

## Quick start, same machine or LAN test

From the project root:

```bash
npm run install:all
npm run server
```

Open another terminal:

```bash
npm run app
```

In the app:
1. Choose **Host a game**.
2. Click **Start hosting**.
3. Choose your screen or window when asked.
4. Share the room code with the guest.
5. Guest chooses **Join a game** and enters the room code.
6. Host accepts the guest.
7. Host enables **Remote input**.
8. Guest clicks **Lock controls** inside the stream panel.

## Internet setup

Deploy the server folder to a small VPS.

```bash
cd server
npm install
npm start
```

Then both users put your server URL in the app:

```text
ws://YOUR_SERVER_IP:8787
```

For production, use HTTPS/WSS with a reverse proxy such as Nginx or Caddy.

## TURN setup

A TURN server is needed when direct P2P fails. The project includes a sample coturn config in `coturn/`.

In the app settings, add:

```text
TURN URL: turn:your-domain.com:3478
TURN Username: your-user
TURN Password: your-password
```

The app will try:

1. Direct WebRTC P2P through STUN
2. TURN relay if direct connection fails

## Build Windows installer

From the project root:

```bash
npm run package:win
```

The installer/portable build will appear in:

```text
app/dist/
```

## Controls allowed by default

The host only accepts these keys:

```text
W A S D
Arrow Up / Down / Left / Right
Space
Enter
Shift
Control
```

You can edit the whitelist in:

```text
app/src/lib/key-policy.js
app/src/native/windows-key-helper.ps1
```

## Security model

This app intentionally avoids hidden control.

- Host must create a room.
- Host must accept the guest.
- Host must enable remote input.
- Guest input is limited to game keys.
- Host can stop the session immediately.
- No persistence.
- No background autostart.
- No credential collection.
- No file access from guest.

## Suggested next improvements

- Gamepad forwarding
- Better source/window picker UI
- Adaptive bitrate settings
- H.265 support where possible
- Host overlay showing active remote keys
- Account/friends system
- Cloud-hosted signaling server
- TURN server autoscaling
