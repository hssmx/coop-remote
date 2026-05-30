REMOTE COOP PLAY - SERVER DEPLOYMENT

For internet sessions, you need one small VPS for the signaling server.

Minimum VPS:
- 1 vCPU
- 512 MB RAM
- Ubuntu
- Public IP
- Port 8787 open

Deploy:

cd server
npm install
npm start

Then clients use:

ws://YOUR_SERVER_IP:8787

For production, use a domain and WSS:

wss://your-domain.com

Recommended:
- Put Nginx or Caddy in front of the server.
- Use HTTPS/WSS.
- Add TURN server if users are behind strict NAT.
