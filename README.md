# 🌐 Virtual Cosmos

> A real-time, proximity-based virtual social space. Move your Among Us-style character close to others to chat, call, and connect — walk away and the connection closes automatically.

![status](https://img.shields.io/badge/status-live-3a8a5a?style=flat-square)
![stack](https://img.shields.io/badge/stack-MERN%20+%20Socket.IO%20+%20PixiJS-c17a3a?style=flat-square)
![webrtc](https://img.shields.io/badge/WebRTC-voice%20%2B%20video-3a6fb5?style=flat-square)
![license](https://img.shields.io/badge/license-MIT-8b3ab5?style=flat-square)

---

## ✦ Architecture

\`\`\`
CLIENT (React + Vite + PixiJS + Zustand)
        │
   Socket.IO (WebSocket)
        │
SERVER (Node.js + Express + Socket.IO)
        │
   MongoDB (optional — in-memory fallback)
\`\`\`

---

## ✦ Features

### World & Movement
- Among Us-style 2D characters with sinusoidal leg walk animation
- WASD + Arrow keys — blocked when typing in chat
- Speed slider (1–10×) in TopBar
- Smooth lerp interpolation for remote avatars

### Proximity System
- Server-side Euclidean distance, radius = 150px
- Proximity rings on canvas, enter/exit toast notifications
- C key — open chat with nearest user, press again to close

### Chat
- Auto-opens in range, auto-closes when walking away
- File uploads: images (inline), code files (syntax block + copy), any file (download)
- Drag & drop support, 10MB limit

### Calls (WebRTC)
- Voice call + Video call — both with accept/reject modal
- Screen share via replaceTrack
- Mute mic, toggle camera, call duration timer

### Recording
- One-click recording — other user notified via toast + red dot on avatar

### Friends & Identity
- Permanent ID (C-XXXXXX) per user — shown on canvas and Friends panel
- Send/accept/reject friend requests
- Rename mid-session from TopBar

### Emotes
- 10-emote bar in proximity HUD, floats above character for 3s

---

## ✦ Tech Stack

| Layer | Technology |
|---|---|
| Canvas | PixiJS v7 (WebGL) |
| State | Zustand |
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS + CSS variables |
| Real-time | Socket.IO v4 |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Calls | WebRTC (browser native, STUN) |

---

## ✦ Getting Started

```bash
git clone https://github.com/0xabhilok/Virtual-Cosmos.git
cd Virtual-Cosmos

npm run install:all

cp server/.env.example server/.env
cp client/.env.example client/.env

npm run dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:4000 |
| Health | http://localhost:4000/health |

Open two browser tabs, enter different names, move avatars close to chat.

---

## ✦ Version History

| Tag | Description |
|---|---|
| v1.0.0 | Base — PixiJS canvas, circle avatars, Socket.IO proximity chat |
| v2.0.0 | Fix — chat race condition, stale closure, client color |
| v3.0.0 | Feat — cursor fix, C key shortcut |
| v4.0.0 | Major — Among Us characters, WebRTC calls, file upload, friends, permanent ID, emotes, recording, speed slider, rename, white UI |

---

## ✦ Author

**Abhilok Reddy** — B.Tech CSE, IIIT Guwahati (2028)
GitHub: [@0xabhilok](https://github.com/0xabhilok)
