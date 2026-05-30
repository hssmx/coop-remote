DEBUG AND INPUT FIX BUILD

What changed:
1. Replaced the old UI with a cleaner diagnostic layout.
2. Added a visible Debug console at the bottom of the app.
3. Logs now show signaling, WebRTC, data channel state, sent keys, received keys, helper output, and errors.
4. Fixed the Windows keyboard helper by replacing the SendInput structure with the correct Windows INPUT union layout.
5. Added fallback to keybd_event if SendInput still fails.
6. Added a Host button: Test input locally.

How to test input:
1. On the host, open Notepad.
2. Click inside Notepad.
3. In Remote Coop Play, Host mode, enable Remote input.
4. Click Test input locally.
5. If W appears in Notepad, local injection works.
6. Then test guest input.

If local test works but guest input does not:
- Look at the debug console on both PCs.
- On guest, you should see: Guest sent down KeyW.
- On host, you should see: Host received DC message input.
- Then: Host processed input down KeyW.

If local test does not work:
- Copy the debug logs and check the helper error.
- Run the app as Administrator.
- If the target game/browser is Administrator, Remote Coop Play must also be Administrator.
- Some anti-cheat games block simulated input. Browser games and Notepad should work.

You must rebuild the executable after applying this package.
