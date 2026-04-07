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
  cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 10 * 1024 * 1024, // 10MB for file uploads
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── In-memory state ────────────────────────────────────────────────────────
// userId (permanent) → { userId, permId, socketId, username, displayName, avatar, color, x, y, friends:Set }
const usersBySocket = new Map();   // socketId → user
const usersByPermId = new Map();   // permId   → user
const roomHistory   = new Map();   // roomId   → msg[]
const friendRequests = new Map();  // reqId → { from, to, status }
const recordings    = new Set();   // socketIds currently recording

const PROXIMITY_RADIUS = 150;

function euclidean(a, b) { return Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2); }
function roomId(a, b)    { return [a, b].sort().join('::'); }

function getProximityPairs(sid) {
  const me = usersBySocket.get(sid);
  if (!me) return [];
  const near = [];
  for (const [id, u] of usersBySocket) {
    if (id === sid) continue;
    const d = euclidean(me, u);
    if (d < PROXIMITY_RADIUS) near.push({ socketId: id, userId: u.userId, permId: u.permId, username: u.displayName, avatar: u.avatar, color: u.color, distance: d, isRecording: recordings.has(id) });
  }
  return near;
}

function broadcastProximity(movedSid) {
  for (const [sid] of usersBySocket) {
    io.to(sid).emit('proximity:update', getProximityPairs(sid));
  }
}

// ── Mongoose schemas ────────────────────────────────────────────────────────
const MsgSchema = new mongoose.Schema({
  roomId: String, senderId: String, senderSocketId: String,
  senderName: String, senderColor: String,
  type: { type: String, default: 'text' }, // text | file | image | code
  text: String, fileData: String, fileName: String, fileType: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model('Message', MsgSchema);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/virtual-cosmos')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(() => console.warn('⚠️  MongoDB unavailable — using memory'));

// ── REST ────────────────────────────────────────────────────────────────────
app.get('/health', (_,res) => res.json({ status:'ok', users: usersBySocket.size }));
app.get('/api/room-history/:rid', async (req,res) => {
  try { const m = await Message.find({ roomId: req.params.rid }).sort({timestamp:-1}).limit(50); res.json(m.reverse()); }
  catch { res.json(roomHistory.get(req.params.rid)||[]); }
});

// ── Socket.IO ───────────────────────────────────────────────────────────────
io.on('connection', socket => {
  console.log(`🔌 ${socket.id}`);

  // ── join ─────────────────────────────────────────────────────────────────
  socket.on('join', ({ username, avatar, color }) => {
    const userId  = uuidv4();
    const permId  = 'C-' + Math.random().toString(36).slice(2,8).toUpperCase();
    const user = {
      userId, permId, socketId: socket.id,
      username, displayName: username,
      avatar: avatar||'🧑', color: color||'#6ee7f7',
      x: Math.random()*900+50, y: Math.random()*500+50,
      speed: 3,
      friends: new Set(),
    };
    usersBySocket.set(socket.id, user);
    usersByPermId.set(permId, user);

    const pub = toPublic(user);
    socket.emit('self', pub);
    socket.emit('users:init', [...usersBySocket.values()].filter(u=>u.socketId!==socket.id).map(toPublic));
    socket.broadcast.emit('user:joined', pub);
    console.log(`👤 ${username} (${permId}) joined`);
  });

  // ── rename ───────────────────────────────────────────────────────────────
  socket.on('rename', ({ displayName }) => {
    const u = usersBySocket.get(socket.id);
    if (!u || !displayName?.trim()) return;
    u.displayName = displayName.trim().slice(0,20);
    io.emit('user:renamed', { socketId: socket.id, displayName: u.displayName });
    socket.emit('self', toPublic(u));
  });

  // ── speed ────────────────────────────────────────────────────────────────
  socket.on('set:speed', ({ speed }) => {
    const u = usersBySocket.get(socket.id);
    if (u) { u.speed = Math.max(1, Math.min(10, speed)); socket.emit('self', toPublic(u)); }
  });

  // ── emote ────────────────────────────────────────────────────────────────
  socket.on('emote', ({ emote }) => {
    socket.broadcast.emit('user:emote', { socketId: socket.id, emote });
  });

  // ── move ─────────────────────────────────────────────────────────────────
  socket.on('move', ({ x, y, walking }) => {
    const u = usersBySocket.get(socket.id);
    if (!u) return;
    u.x = x; u.y = y;
    socket.broadcast.emit('user:moved', { socketId: socket.id, x, y, walking });
    broadcastProximity(socket.id);
  });

  // ── chat:send (text + file/image/code) ────────────────────────────────────
  socket.on('chat:send', async ({ toSocketId, text, type, fileData, fileName, fileType }) => {
    const sender   = usersBySocket.get(socket.id);
    const receiver = usersBySocket.get(toSocketId);
    if (!sender || !receiver) return;
    const rid = roomId(socket.id, toSocketId);
    const msg = {
      roomId: rid,
      senderId: sender.userId,
      senderSocketId: socket.id,
      senderName: sender.displayName,
      senderColor: sender.color,
      type: type||'text',
      text: text||'',
      fileData: fileData||null,
      fileName: fileName||null,
      fileType: fileType||null,
      timestamp: new Date().toISOString(),
    };
    if (!roomHistory.has(rid)) roomHistory.set(rid, []);
    const h = roomHistory.get(rid); h.push(msg); if(h.length>100) h.shift();
    socket.emit('chat:message', msg);
    io.to(toSocketId).emit('chat:message', msg);
    try { await new Message(msg).save(); } catch {}
  });

  // ── WebRTC signalling ─────────────────────────────────────────────────────
  socket.on('call:request',  ({ toSocketId, callType }) => io.to(toSocketId).emit('call:incoming',  { fromSocketId: socket.id, fromName: usersBySocket.get(socket.id)?.displayName, callType }));
  socket.on('call:accept',   ({ toSocketId, callType }) => io.to(toSocketId).emit('call:accepted',  { fromSocketId: socket.id, callType }));
  socket.on('call:reject',   ({ toSocketId })           => io.to(toSocketId).emit('call:rejected',  { fromSocketId: socket.id }));
  socket.on('call:end',      ({ toSocketId })           => io.to(toSocketId).emit('call:ended',     { fromSocketId: socket.id }));
  socket.on('webrtc:offer',  ({ toSocketId, offer })    => io.to(toSocketId).emit('webrtc:offer',   { fromSocketId: socket.id, offer }));
  socket.on('webrtc:answer', ({ toSocketId, answer })   => io.to(toSocketId).emit('webrtc:answer',  { fromSocketId: socket.id, answer }));
  socket.on('webrtc:ice',    ({ toSocketId, candidate })=> io.to(toSocketId).emit('webrtc:ice',     { fromSocketId: socket.id, candidate }));

  // ── recording notification ────────────────────────────────────────────────
  socket.on('recording:start', ({ toSocketId }) => {
    recordings.add(socket.id);
    io.to(toSocketId).emit('recording:notify', { fromSocketId: socket.id, fromName: usersBySocket.get(socket.id)?.displayName, active: true });
    broadcastProximity(socket.id);
  });
  socket.on('recording:stop', ({ toSocketId }) => {
    recordings.delete(socket.id);
    if (toSocketId) io.to(toSocketId).emit('recording:notify', { fromSocketId: socket.id, active: false });
    broadcastProximity(socket.id);
  });

  // ── friend request ────────────────────────────────────────────────────────
  socket.on('friend:request', ({ toSocketId }) => {
    const from = usersBySocket.get(socket.id);
    const to   = usersBySocket.get(toSocketId);
    if (!from || !to) return;
    const reqId = uuidv4();
    friendRequests.set(reqId, { reqId, fromSocketId: socket.id, toSocketId, status: 'pending' });
    io.to(toSocketId).emit('friend:incoming', { reqId, fromSocketId: socket.id, fromName: from.displayName, fromPermId: from.permId, fromAvatar: from.avatar, fromColor: from.color });
  });
  socket.on('friend:accept', ({ reqId }) => {
    const req = friendRequests.get(reqId);
    if (!req) return;
    req.status = 'accepted';
    const a = usersBySocket.get(req.fromSocketId);
    const b = usersBySocket.get(req.toSocketId);
    if (a && b) {
      a.friends.add(b.permId); b.friends.add(a.permId);
      io.to(req.fromSocketId).emit('friend:accepted', { permId: b.permId, displayName: b.displayName, avatar: b.avatar, color: b.color });
      io.to(req.toSocketId).emit('friend:accepted',   { permId: a.permId, displayName: a.displayName, avatar: a.avatar, color: a.color });
    }
  });
  socket.on('friend:reject', ({ reqId }) => {
    const req = friendRequests.get(reqId);
    if (req) { req.status = 'rejected'; friendRequests.delete(reqId); }
  });

  // ── disconnect ────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const u = usersBySocket.get(socket.id);
    if (u) {
      recordings.delete(socket.id);
      usersBySocket.delete(socket.id);
      usersByPermId.delete(u.permId);
      io.emit('user:left', { socketId: socket.id, userId: u.userId });
      broadcastProximity(socket.id);
    }
  });
});

function toPublic(u) {
  return { userId: u.userId, permId: u.permId, socketId: u.socketId, username: u.username, displayName: u.displayName, avatar: u.avatar, color: u.color, x: u.x, y: u.y, speed: u.speed };
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => console.log(`🚀 Cosmos server → http://localhost:${PORT}`));
