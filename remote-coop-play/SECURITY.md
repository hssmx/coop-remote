# Security Notes

Remote Coop Play is designed for consent-based gaming sessions only.

## Non-goals

This project does not include and should not add:

- Hidden remote access
- Persistence or autorun
- Credential collection
- Bypassing Windows security prompts
- File exfiltration
- Screen capture without the host selecting it
- Control without host acceptance

## Safe defaults

- Remote input is off until the host enables it.
- Only a small list of game keys is accepted.
- The host can stop the session at any time.
- The PowerShell input helper is spawned only during the app session.
- The guest cannot send arbitrary commands.

## Production recommendations

Before publishing this app publicly:

- Use WSS instead of WS.
- Add authentication.
- Add room expiration.
- Rate-limit signaling messages.
- Add TURN credentials with time-limited secrets.
- Sign the Windows app.
- Show a permanent visible indicator while sharing.
