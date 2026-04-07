import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

// ─── In-memory user state ───────────────────────────────────────────────────
// { socketId: { userId, username, avatar, x, y, color } }
const users = new Map();

// ─── Proximity config ───────────────────────────────────────────────────────
const PROXIMITY_RADIUS = 150;

function euclidean(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function getProximityPairs(movedSocketId) {
  const movedUser = users.get(movedSocketId);
  if (!movedUser) return [];

  const nowNear = [];
  for (const [sid, user] of users) {
    if (sid === movedSocketId) continue;
    const dist = euclidean(movedUser, user);
    if (dist < PROXIMITY_RADIUS) {
      nowNear.push({ socketId: sid, userId: user.userId, username: user.username, distance: dist });
    }
  }
  return nowNear;
}

// ─── MongoDB (optional – graceful fallback) ─────────────────────────────────
const MessageSchema = new mongoose.Schema({
  roomId: String,
  senderId: String,
  senderName: String,
  senderColor: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', MessageSchema);

// Room message history (in-memory cache: roomId → last 50 messages)
const roomHistory = new Map();

function roomId(a, b) {
  return [a, b].sort().join('::');
}

mongoose
  .connect(process.env.MONGO_URI || 'mongodb://localhost:27017/virtual-cosmos')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(() => console.warn('⚠️  MongoDB not available — running without persistence'));

// ─── REST: health ───────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({ status: 'ok', users: users.size }));

app.get('/api/room-history/:roomId', async (req, res) => {
  const { roomId: rid } = req.params;
  try {
    const msgs = await Message.find({ roomId: rid }).sort({ timestamp: -1 }).limit(50);
    res.json(msgs.reverse());
  } catch {
    const cached = roomHistory.get(rid) || [];
    res.json(cached);
  }
});

// ─── Socket.IO ──────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  // ── join: user enters the cosmos ──────────────────────────────────────────
  socket.on('join', ({ username, avatar }) => {
    const userId = uuidv4();
    const color = `hsl(${Math.floor(Math.random() * 360)}, 80%, 65%)`;

    const user = {
      userId,
      socketId: socket.id,
      username: username || `User_${userId.slice(0, 4)}`,
      avatar: avatar || '🧑',
      x: Math.random() * 900 + 50,
      y: Math.random() * 500 + 50,
      color,
    };

    users.set(socket.id, user);

    // Send this user their own data
    socket.emit('self', user);

    // Send current user list to newcomer
    socket.emit(
      'users:init',
      [...users.entries()]
        .filter(([sid]) => sid !== socket.id)
        .map(([, u]) => u)
    );

    // Broadcast new user to everyone else
    socket.broadcast.emit('user:joined', user);

    console.log(`👤 ${user.username} joined (${users.size} total)`);
  });

  // ── move: user updates position ───────────────────────────────────────────
  socket.on('move', ({ x, y }) => {
    const user = users.get(socket.id);
    if (!user) return;

    user.x = x;
    user.y = y;

    // Broadcast position to everyone else
    socket.broadcast.emit('user:moved', { socketId: socket.id, userId: user.userId, x, y });

    // Proximity check for THIS user
    const nearUsers = getProximityPairs(socket.id);
    const nearIds = nearUsers.map((u) => u.socketId);

    // Emit updated proximity state to the moved user
    socket.emit('proximity:update', nearUsers);

    // Also notify nearby users that this user is now near them
    for (const [sid] of users) {
      if (sid === socket.id) continue;
      const otherNear = getProximityPairs(sid);
      io.to(sid).emit('proximity:update', otherNear);
    }
  });

  // ── chat:send ─────────────────────────────────────────────────────────────
  socket.on('chat:send', async ({ toSocketId, text }) => {
    const sender = users.get(socket.id);
    const receiver = users.get(toSocketId);
    if (!sender || !receiver) return;

    const rid = roomId(socket.id, toSocketId);
    const msg = {
      roomId: rid,
      senderId: sender.userId,
      senderSocketId: socket.id,
      senderName: sender.username,
      senderColor: sender.color,
      text,
      timestamp: new Date().toISOString(),
    };

    // Cache
    if (!roomHistory.has(rid)) roomHistory.set(rid, []);
    const history = roomHistory.get(rid);
    history.push(msg);
    if (history.length > 50) history.shift();

    // Deliver to both
    socket.emit('chat:message', msg);
    io.to(toSocketId).emit('chat:message', msg);

    // Persist
    try {
      await new Message({
        roomId: rid,
        senderId: sender.userId,
        senderName: sender.username,
        senderColor: sender.color,
        text,
      }).save();
    } catch { /* no mongo */ }
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      console.log(`👋 ${user.username} disconnected`);
      users.delete(socket.id);
      io.emit('user:left', { socketId: socket.id, userId: user.userId });

      // Re-compute proximity for all remaining users
      for (const [sid] of users) {
        const nearUsers = getProximityPairs(sid);
        io.to(sid).emit('proximity:update', nearUsers);
      }
    }
  });
});

// ─── Start ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Virtual Cosmos server running on http://localhost:${PORT}`);
});
