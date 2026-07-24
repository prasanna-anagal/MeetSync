# MeetSync

A full-stack video conferencing web app. Create a room, share the link, and talk face to face with in-call chat, screen sharing, and host-controlled room access.

## Features

- Google-free username/password auth (register/login) with JWT-style tokens
- Create or join a meeting by room code
- Peer-to-peer video/audio calling via WebRTC (mesh topology)
- In-call text chat
- Screen sharing, with automatic fallback to camera when sharing stops
- Host approval for anyone joining after the room is created (waiting room)
- Host controls: request a participant to mute, or remove them from the call
- Meeting history per user

## Tech stack

**Backend:** Node.js, Express, Socket.IO, MongoDB (Mongoose), bcrypt
**Frontend:** React, React Router, Axios, native WebRTC APIs

## Architecture notes

- Signaling (SDP offer/answer, ICE candidates) is relayed through Socket.IO; actual audio/video/screen-share media flows directly peer-to-peer once connected.
- The first person to join a room becomes its host. Anyone joining afterward is placed in a waiting state until the host approves or denies them.
- Screen sharing works by swapping the outgoing WebRTC video track (`RTCRtpSender.replaceTrack`) rather than opening a second connection.

## Local setup

### Backend

```bash
cd backend
npm install
cp .env.example .env   # fill in MONGO_URI (see note below)
npm run dev
```

If your network can't resolve `mongodb+srv://` DNS records (some ISPs block SRV/TXT lookups), use the standard non-SRV connection string format instead — Atlas's dashboard provides both under "Connect".

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend expects the backend at `http://localhost:8000` by default (override via `REACT_APP_SERVER_URL` / `REACT_APP_API_BASE_URL`).

## Known limitations

- Mesh topology means every participant connects directly to every other participant — fine for small calls, but doesn't scale to large rooms the way a media server (SFU) would.
- If the host disconnects, the room continues without host controls rather than reassigning a new host.
