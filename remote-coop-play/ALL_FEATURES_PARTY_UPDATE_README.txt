REMOTE COOP PLAY - ALL FEATURES PARTY UPDATE

This package is a major app update.

New architecture:
- Multi-member party signaling server.
- Host can accept/reject multiple members.
- Host can change max people while the room is live.
- Host can enable/disable new joins while the room is live.
- Host manages permissions per member.

New UI:
- Sidebar menu is hideable.
- Sidebar contains only navigation, no stream stats.
- Stream area has only a tiny LoL-style overlay for Server ping, Peer RTT, bitrate and loss.
- Lock controls no longer places a big label over the video.
- Home / Host / Join / Party / Network / Settings screens.
- Cleaner task-based layout.
- Dark mode.

Stream controls:
- No more presets.
- Independent controls for:
  - resolution
  - FPS
  - image quality
  - bitrate
  - degradation preference
  - game audio
  - adaptive weak-internet mode
- Host can apply quality changes while streaming.
- Bitrate/FPS are applied through WebRTC sender parameters.
- Resolution/FPS refreshes capture and replaces tracks without leaving the room.

Weak internet:
- Auto weak-internet mode watches RTT and packet loss.
- If RTT/loss gets bad, it lowers bitrate automatically.
- Input uses an unreliable/low-latency data channel.
- Low latency setup button.
- Separate stats for server ping, peer RTT, stream bitrate, packet loss, input delay and TURN status.

Party:
- Camera toggle.
- Mic toggle.
- Push-to-talk with V.
- Low camera resolution by default.
- Host can see guest camera tiles.
- Guest can receive host stream and optional host media.
- This is mesh-style, so keep party size small on weak internet.

Permissions:
- Host can set for each member:
  - keyboard allowed
  - allowed keys list
  - mouse movement
  - mouse clicks
  - mouse wheel
- Guest mouse sends normalized stream coordinates.
- Mouse control works best when the host game is on the primary display or fullscreen.

Important:
This is a big protocol change. Update both:
1. the VPS server folder
2. the Windows app build

VPS:
cd server
npm install
pm2 restart remote-coop-server

If PM2 still points to the old folder, restart it from the new server folder:
pm2 delete remote-coop-server
pm2 start npm --name remote-coop-server -- start
pm2 save

Build Windows app:
Push this package to GitHub and run the Windows build workflow again.