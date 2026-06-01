REMOTE COOP PLAY - CRITICAL FIXES + UI REDESIGN PATCH

This patch targets the issues found during real testing.

Fixed:
- Guest input was arriving but not treated because host input injection was not enabled automatically.
- Host now enables the input helper when hosting starts.
- Added Stop all input panic button.
- Broader keyboard support added to the key policy and Windows helper.
- Mouse input remains permission-controlled.
- Input refusals are logged clearly.

Camera and party fixes:
- Added mesh peer syncing from room-state so guests can connect to each other, not only to host.
- Added stream metadata to distinguish game stream from camera stream.
- Fixed black camera tiles caused by party video being mistaken for game video.
- Camera previews are no longer mirrored/inverted.
- Camera placement improved with a stronger party strip layout.

Audio echo fix:
- Added Anti-echo mode.
- When party voice is active on host, the app automatically pauses captured game/system audio to prevent hearing voices twice.
- This avoids the common loopback problem where the host app audio is re-captured into the game stream.

Push-to-talk:
- Push-to-talk key is now changeable.
- Default is V.
- Always-on mic remains possible by disabling push-to-talk.
- Host can mute a guest or disable their camera from member controls.

Permissions UI:
- Removed comma-separated key codes.
- Added a visual keyboard picker.
- Host can click or drag keys to choose allowed buttons.
- Mouse move, clicks and wheel are separate permissions.

UI:
- Added animations.
- Improved camera tiles and party strip.
- Cleaner Discord/Unity-inspired direction.
- Menu stays hideable and stream stats remain tiny on top of the video.
- No large lock overlay covers the stream.

Important:
This still uses mesh WebRTC for party media, so keep party sizes small for weak internet.
For strict NAT/4G, keep TURN configured.
Update both the Windows app and the VPS server folder.