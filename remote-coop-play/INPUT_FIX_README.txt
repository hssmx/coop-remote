INPUT FIX APPLIED

Problem:
Video worked, but guest keyboard input did not reach the host.

Most probable packaged-build cause:
The Windows PowerShell keyboard helper was packed inside Electron app.asar.
Windows cannot execute a .ps1 file from inside app.asar.

Fixes included:
- Added asarUnpack for src/native/**
- Updated input-injector.js to locate:
  process.resourcesPath\app.asar.unpacked\src\native\windows-key-helper.ps1
- Added clearer error reporting when the host enables Remote input.
- Improved guest keyboard focus capture.

You must rebuild the Windows executable after applying this fix.

GitHub Actions:
1. Replace your repo files with this fixed package.
2. Commit and push.
3. Run Build Windows Executable again.
4. Download the new artifact.

Testing checklist:
1. Start the local signaling server.
2. Host creates room.
3. Guest joins.
4. Host accepts guest.
5. Host enables Remote input.
6. Host should see "Keyboard helper ready" or no error.
7. Host clicks the game/browser window.
8. Guest enables Lock controls.
9. Guest presses W/A/S/D or arrows.

Important:
If the host game/browser is running as Administrator, run Remote Coop Play as Administrator too.
Windows blocks non-admin apps from injecting keys into elevated windows.
