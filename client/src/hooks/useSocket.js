import { useEffect } from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

export function useSocket() {
  useEffect(() => {
    const S = useCosmosStore.getState;

    socket.on('users:init',      arr  => S().setAllUsers(arr));
    socket.on('user:joined',     u    => S().addUser(u));
    socket.on('user:moved',      ({socketId,x,y,walking}) => S().updateUserPosition(socketId,x,y,walking));
    socket.on('user:left',       ({socketId}) => S().removeUser(socketId));
    socket.on('proximity:update',list => S().setNearbyUsers(list));
    socket.on('user:renamed',    ({socketId,displayName}) => S().updateUserName(socketId,displayName));
    socket.on('user:emote',      ({socketId,emote}) => {
      S().setUserEmote(socketId, emote);
      setTimeout(() => S().setUserEmote(socketId, null), 3000);
    });

    socket.on('chat:message', msg => {
      S().addMessage(msg);
      const { activeChatSocketId } = S();
      const mine = msg.senderSocketId === socket.id;
      if (!mine && !(activeChatSocketId && msg.roomId.includes(activeChatSocketId))) {
        S().incrementUnread();
      }
    });

    // calls
    socket.on('call:incoming', ({ fromSocketId, fromName, callType }) => {
      S().setCallState({ phase:'incoming', peerSocketId:fromSocketId, peerName:fromName, callType });
    });
    socket.on('call:accepted', ({ fromSocketId, callType }) => {
      const cs = S().callState; if(cs) S().setCallState({ ...cs, phase:'active' });
    });
    socket.on('call:rejected', () => S().setCallState(null));
    socket.on('call:ended',    () => S().setCallState(null));

    // WebRTC signals are handled inside useWebRTC hook

    // recording
    socket.on('recording:notify', ({ fromName, active }) => {
      S().setRecordingNotify(active ? { fromName } : null);
    });

    // friends
    socket.on('friend:incoming', req  => S().addFriendRequest(req));
    socket.on('friend:accepted', f    => {
      S().addFriend(f);
      // remove matching pending request
      const req = S().friendRequests.find(r => r.fromPermId === f.permId);
      if (req) S().removeFriendRequest(req.reqId);
    });

    return () => {
      ['users:init','user:joined','user:moved','user:left','proximity:update','user:renamed','user:emote',
       'chat:message','call:incoming','call:accepted','call:rejected','call:ended',
       'recording:notify','friend:incoming','friend:accepted'
      ].forEach(e => socket.off(e));
    };
  }, []);
}
