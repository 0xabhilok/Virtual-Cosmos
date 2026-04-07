import { create } from 'zustand';

export const useCosmosStore = create((set, get) => ({
  // ── self ──────────────────────────────────────────────────────────────────
  self: null,
  setSelf: (self) => set({ self }),

  // ── other users ───────────────────────────────────────────────────────────
  users: {},           // { socketId: userObj }
  addUser: (user) =>
    set((s) => ({ users: { ...s.users, [user.socketId]: user } })),
  removeUser: (socketId) =>
    set((s) => {
      const next = { ...s.users };
      delete next[socketId];
      return { users: next };
    }),
  updateUserPosition: (socketId, x, y) =>
    set((s) => ({
      users: s.users[socketId]
        ? { ...s.users, [socketId]: { ...s.users[socketId], x, y } }
        : s.users,
    })),
  setAllUsers: (usersArray) => {
    const map = {};
    usersArray.forEach((u) => { map[u.socketId] = u; });
    set({ users: map });
  },

  // ── proximity ─────────────────────────────────────────────────────────────
  nearbyUsers: [],     // [{ socketId, userId, username, distance }]
  setNearbyUsers: (list) => set({ nearbyUsers: list }),

  // ── chat ──────────────────────────────────────────────────────────────────
  activeChatSocketId: null,
  setActiveChat: (socketId) =>
    set({ activeChatSocketId: socketId, unreadCount: 0 }),
  closeChat: () => set({ activeChatSocketId: null }),

  // messages keyed by roomId (sorted pair of socketIds)
  messages: {},        // { roomId: [msgObj] }
  addMessage: (msg) => {
    const rid = msg.roomId;
    set((s) => ({
      messages: {
        ...s.messages,
        [rid]: [...(s.messages[rid] || []), msg],
      },
    }));
  },

  unreadCount: 0,
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),

  // ── UI state ──────────────────────────────────────────────────────────────
  phase: 'lobby',      // 'lobby' | 'cosmos'
  setPhase: (phase) => set({ phase }),
}));
