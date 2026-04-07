import { useEffect } from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

export function useSocket() {
  useEffect(() => {
    // socket is already connected from LobbyScreen - don't reconnect

    const {
      addUser,
      removeUser,
      updateUserPosition,
      setAllUsers,
      setNearbyUsers,
      addMessage,
      incrementUnread,
    } = useCosmosStore.getState();

    socket.on('users:init', (usersArray) => {
      setAllUsers(usersArray);
    });

    socket.on('user:joined', (user) => {
      addUser(user);
    });

    socket.on('user:moved', ({ socketId, x, y }) => {
      updateUserPosition(socketId, x, y);
    });

    socket.on('user:left', ({ socketId }) => {
      removeUser(socketId);
    });

    socket.on('proximity:update', (nearUsers) => {
      setNearbyUsers(nearUsers);
    });

    socket.on('chat:message', (msg) => {
      addMessage(msg);
      // Read activeChatSocketId fresh from store to avoid stale closure
      const { activeChatSocketId } = useCosmosStore.getState();
      const isActive = activeChatSocketId && msg.roomId.includes(activeChatSocketId);
      if (!isActive) {
        incrementUnread();
      }
    });

    return () => {
      socket.off('users:init');
      socket.off('user:joined');
      socket.off('user:moved');
      socket.off('user:left');
      socket.off('proximity:update');
      socket.off('chat:message');
    };
  }, []);
}
