REMOTE COOP PLAY - WEAK INTERNET UPDATE

This update goes back to the Remote Coop Play peer-to-peer app and adds weak-internet controls.

New:
- Host can choose the exact app/window/screen to stream.
- Host can refresh the app/window list.
- Stream quality presets:
  - Data saver: 360p, 15 FPS, ~350 kbps
  - SD: 480p, 24 FPS, ~700 kbps
  - HD: 720p, 30 FPS, ~1.6 Mbps
  - Max: 1080p, 60 FPS, ~4.5 Mbps
- Optional audio toggle.
- Dark mode toggle.
- WebRTC sender bitrate and FPS limits are applied.
- WebRTC stats show actual stream bitrate.
- Minimal UI kept from the fixed-scroll version.

Recommended for weak internet:
1. Use Data saver first.
2. If it is stable, try SD.
3. Disable audio if input/video delay is high.
4. Select the exact game window, not the whole desktop.
5. Prefer a TURN server close to users for reliability if peer connection fails.

Build:
1. Replace your GitHub repo files with this package.
2. Commit and push.
3. Run GitHub Actions build.
4. Download the Windows artifact.