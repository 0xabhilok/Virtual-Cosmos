import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';

// Single socket instance shared across the whole app
// autoConnect: false — we connect manually from LobbyScreen after user fills the form
export const socket = io(SERVER_URL, {
  autoConnect: false,
  transports: ['websocket'],
});
