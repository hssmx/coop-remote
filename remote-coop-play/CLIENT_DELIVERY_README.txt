REMOTE COOP PLAY - CLIENT DELIVERY

Give the client only the generated .exe from:

app\dist\

Recommended delivery:
- Remote Coop Play Setup 1.0.0.exe if you want a normal installer.
- Remote Coop Play 1.0.0.exe if you want a portable app.

The client does not need Node.js, npm, source code, or build scripts.

Important:
The app still needs a signaling server URL. For a real client delivery, configure the default server URL in:

app\src\renderer\app.js

or ask the client to enter your server URL in the app settings.

Without a public signaling server, two different internet users cannot find each other.
