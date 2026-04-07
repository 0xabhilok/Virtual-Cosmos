# ✦ Virtual Cosmos

> A real-time, proximity-based social space where avatars connect and chat only when they're close enough to each other — simulating human interaction in a 2D virtual world.

![Virtual Cosmos](https://img.shields.io/badge/status-live-6ee7f7?style=flat-square)
![Stack](https://img.shields.io/badge/stack-MERN%20%2B%20Socket.IO%20%2B%20PixiJS-b57bee?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-6ef7a0?style=flat-square)

---

## ✦ Demo

> Open two browser tabs → enter different names → move them close → chat panel opens automatically

---

## ✦ Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)             │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │  PixiJS     │  │  Zustand     │  │ Tailwind  │  │
│  │  Canvas     │  │  Store       │  │ CSS UI    │  │
│  │  (WebGL)    │  │  (global)    │  │ overlay   │  │
│  └──────┬──────┘  └──────┬───────┘  └───────────┘  │
│         │                │                          │
│         └────────────────┴──── Socket.IO Client ────┤
│                                                     │
└─────────────────────────────────────────────────────┘
                          │
                   WebSocket (ws://)
                          │
┌─────────────────────────────────────────────────────┐
│                SERVER (Node.js + Express)            │
│                                                     │
│  ┌──────────────────────┐  ┌──────────────────────┐ │
│  │  Socket.IO Server    │  │  MongoDB (Mongoose)  │ │
│  │                      │  │                      │ │
│  │  • join              │  │  • Message history   │ │
│  │  • move              │  │  • Room persistence  │ │
│  │  • proximity:update  │  │                      │ │
│  │  • chat:send/receive │  └──────────────────────┘ │
│  │  • disconnect        │                           │
│  └──────────────────────┘                           │
│                                                     │
│         In-memory user state Map<socketId, user>    │
└─────────────────────────────────────────────────────┘
```

---

## ✦ Features

### Core
- **2D Canvas World** — Rendered with PixiJS (WebGL-accelerated). Smooth 60fps movement with diagonal normalization.
- **Real-Time Multiplayer** — Positions synced via Socket.IO with 50ms throttle to minimize bandwidth.
- **Proximity Detection** — Euclidean distance computed server-side on every `move` event. Radius = 150px.
- **Proximity Chat** — Chat panel appears automatically when users enter range. Disappears with an 800ms grace delay when they walk away.
- **Live Notifications** — Toast popups when users enter/exit your proximity range.
- **Persistent Message History** — Chat messages saved to MongoDB per room. Graceful fallback to in-memory cache if MongoDB is unavailable.

### UX / Design
- **Custom lobby** — Pick username, avatar emoji, and accent color before entering
- **Live status bar** — Shows online count, nearby count, connection state
- **Keyboard controls** — WASD + Arrow keys with diagonal movement support
- **Smooth interpolation** — Remote avatars lerp toward their target position at 10% per frame
- **Unread badge** — Shows unread count on nearby user avatars when chat panel is closed

---

## ✦ Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend rendering | **PixiJS v7** | WebGL-accelerated 2D canvas — handles 100+ avatars at 60fps |
| Frontend state | **Zustand** | Minimal boilerplate, subscription-based, no context hell |
| Frontend framework | **React 18 + Vite** | Fast HMR, modern JSX, recommended in spec |
| Styling | **Tailwind CSS** | Utility-first, production-ready |
| Real-time | **Socket.IO v4** | Reliable WebSocket with fallback, rooms, namespaces |
| Backend | **Node.js + Express** | Non-blocking I/O, ideal for socket-heavy servers |
| Database | **MongoDB + Mongoose** | Flexible schema for messages; runs without it too |

---

## ✦ Socket Event Reference

| Event | Direction | Payload | Description |
|---|---|---|---|
| `join` | Client → Server | `{ username, avatar }` | User enters the cosmos |
| `self` | Server → Client | `UserObject` | Returns assigned userId, color, position |
| `users:init` | Server → Client | `UserObject[]` | All current users on join |
| `move` | Client → Server | `{ x, y }` | Position update (throttled 50ms) |
| `user:moved` | Server → All | `{ socketId, x, y }` | Broadcast position update |
| `user:joined` | Server → All | `UserObject` | New user joined |
| `user:left` | Server → All | `{ socketId, userId }` | User disconnected |
| `proximity:update` | Server → Client | `NearUser[]` | Recomputed after every move |
| `chat:send` | Client → Server | `{ toSocketId, text }` | Send a message |
| `chat:message` | Server → Client | `MessageObject` | Delivered to both sender and receiver |

---

## ✦ Project Structure

```
virtual-cosmos/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── LobbyScreen.jsx      # Entry screen
│   │   │   ├── CosmosCanvas.jsx     # PixiJS canvas + game loop
│   │   │   ├── ChatPanel.jsx        # Proximity chat UI
│   │   │   ├── ProximityHUD.jsx     # Nearby users bar
│   │   │   ├── TopBar.jsx           # Status bar
│   │   │   └── ConnectionToast.jsx  # Enter/exit notifications
│   │   ├── hooks/
│   │   │   └── useSocket.js         # All socket event listeners
│   │   ├── utils/
│   │   │   ├── store.js             # Zustand global store
│   │   │   └── socket.js            # Socket.IO singleton
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                    # Node.js backend
│   ├── src/
│   │   └── index.js           # Express + Socket.IO server
│   ├── .env.example
│   └── package.json
│
├── package.json               # Root scripts
└── README.md
```

---

## ✦ Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB (optional — app runs without it)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/0xabhilok/virtual-cosmos.git
cd virtual-cosmos

# 2. Install all dependencies
npm run install:all

# 3. Configure environment variables
cp server/.env.example server/.env
cp client/.env.example client/.env
# Edit server/.env with your MONGO_URI if needed

# 4. Start both servers concurrently
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:4000
- **Health check**: http://localhost:4000/health

### Test multiplayer locally
Open **two browser tabs** (or two different browsers) at `http://localhost:5173` and enter different usernames. Move the avatars close together to trigger proximity chat.

---

## ✦ Proximity Logic (Core Algorithm)

```js
// Server-side — computed on every move event
function euclidean(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getProximityPairs(movedSocketId) {
  const movedUser = users.get(movedSocketId);
  const nearUsers = [];

  for (const [sid, user] of users) {
    if (sid === movedSocketId) continue;
    const dist = euclidean(movedUser, user);
    if (dist < PROXIMITY_RADIUS) {         // PROXIMITY_RADIUS = 150
      nearUsers.push({ socketId: sid, distance: dist, ...user });
    }
  }

  return nearUsers;  // sent back as 'proximity:update'
}
```

The client reacts to `proximity:update` by:
1. Showing proximity rings around nearby avatars (PixiJS canvas)
2. Displaying the ProximityHUD with clickable avatars
3. Auto-opening or auto-closing the ChatPanel

---

## ✦ Design Decisions

**Why server-side proximity?**
Client-side proximity detection can be spoofed. Computing it on the server using socket positions ensures consistency and prevents users from faking proximity to access chats.

**Why Zustand over Redux?**
For a real-time app, Zustand's subscription model (`useCosmosStore.subscribe`) allows PixiJS (outside React) to react to state changes without re-renders — Redux would require heavy boilerplate to achieve the same.

**Why throttle movement at 50ms?**
Emitting on every frame (60fps) would send ~1200 events/min per user. At 50ms throttle, that's 20 events/sec per user — a 3× reduction in socket traffic with imperceptible visual degradation due to lerp interpolation.

---

## ✦ Author

**Abhilok Reddy** — B.Tech CSE, IIIT Guwahati  
GitHub: [@0xabhilok](https://github.com/0xabhilok)
