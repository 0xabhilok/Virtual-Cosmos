import { useEffect } from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

export function useSocket() {
  const {
    setSelf,
    addUser,
    removeUser,
    updateUserPosition,
    setAllUsers,
    setNearbyUsers,
    addMessage,
    activeChatSocketId,
    incrementUnread,
  } = useCosmosStore();

  useEffect(() => {
    socket.connect();

    socket.on('self', (user) => {
      setSelf(user);
    });

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
      // If chat panel isn't open for that room, count as unread
      const isActive =
        msg.roomId.includes(activeChatSocketId || '___NONE___');
      if (!isActive) {
        incrementUnread();
      }
    });

    return () => {
      socket.off('self');
      socket.off('users:init');
      socket.off('user:joined');
      socket.off('user:moved');
      socket.off('user:left');
      socket.off('proximity:update');
      socket.off('chat:message');
      socket.disconnect();
    };
  }, []);
}
