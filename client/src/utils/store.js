import { create } from 'zustand';

export const useCosmosStore = create((set, get) => ({
  // self
  self: null,
  setSelf: (self) => set({ self }),

  // users
  users: {},
  addUser: (u)               => set(s => ({ users: { ...s.users, [u.socketId]: u } })),
  removeUser: (sid)          => set(s => { const n={...s.users}; delete n[sid]; return { users: n }; }),
  updateUserPosition: (sid,x,y,walking) => set(s => s.users[sid] ? ({ users: { ...s.users, [sid]: { ...s.users[sid], x, y, walking } } }) : s),
  setAllUsers: (arr)         => { const m={}; arr.forEach(u=>m[u.socketId]=u); set({ users: m }); },
  updateUserName: (sid, dn)  => set(s => s.users[sid] ? ({ users: { ...s.users, [sid]: { ...s.users[sid], displayName: dn } } }) : s),
  setUserEmote: (sid, emote) => set(s => s.users[sid] ? ({ users: { ...s.users, [sid]: { ...s.users[sid], emote } } }) : s),

  // proximity
  nearbyUsers: [],
  setNearbyUsers: (list) => set({ nearbyUsers: list }),

  // chat
  activeChatSocketId: null,
  setActiveChat: (sid) => set({ activeChatSocketId: sid, unreadCount: 0 }),
  closeChat: ()        => set({ activeChatSocketId: null }),
  messages: {},
  addMessage: (msg) => set(s => ({ messages: { ...s.messages, [msg.roomId]: [...(s.messages[msg.roomId]||[]), msg] } })),
  unreadCount: 0,
  incrementUnread: () => set(s => ({ unreadCount: s.unreadCount + 1 })),
  resetUnread: ()      => set({ unreadCount: 0 }),

  // call
  callState: null, // null | { type:'voice'|'video', phase:'outgoing'|'incoming'|'active', peerSocketId, peerName, callType }
  setCallState: (cs) => set({ callState: cs }),

  // recording
  recordingActive: false,
  setRecordingActive: (v) => set({ recordingActive: v }),
  recordingNotify: null, // { fromName, active }
  setRecordingNotify: (r) => set({ recordingNotify: r }),

  // friends
  friends: [],        // [{ permId, displayName, avatar, color }]
  friendRequests: [], // [{ reqId, fromSocketId, fromName, fromPermId, fromAvatar, fromColor }]
  addFriend: (f)         => set(s => ({ friends: [...s.friends, f] })),
  addFriendRequest: (r)  => set(s => ({ friendRequests: [...s.friendRequests, r] })),
  removeFriendRequest: (reqId) => set(s => ({ friendRequests: s.friendRequests.filter(r=>r.reqId!==reqId) })),

  // UI
  phase: 'lobby',
  setPhase: (p) => set({ phase: p }),
  showFriends: false,
  setShowFriends: (v) => set({ showFriends: v }),
  selfSpeed: 3,
  setSelfSpeed: (v) => set({ selfSpeed: v }),
}));
