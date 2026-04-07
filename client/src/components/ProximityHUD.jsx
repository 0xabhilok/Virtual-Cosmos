import React, { useEffect } from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

const EMOTES = ['👋','❤️','😂','🔥','👍','😮','🎉','💯','😎','🤔'];

export default function ProximityHUD() {
  const nearbyUsers = useCosmosStore(s => s.nearbyUsers);
  const users       = useCosmosStore(s => s.users);
  const activeChatSocketId = useCosmosStore(s => s.activeChatSocketId);
  const setActiveChat = useCosmosStore(s => s.setActiveChat);
  const closeChat   = useCosmosStore(s => s.closeChat);
  const unreadCount = useCosmosStore(s => s.unreadCount);
  const self        = useCosmosStore(s => s.self);
  const setCallState = useCosmosStore(s => s.setCallState);

  // C key
  useEffect(() => {
    const onKey = e => {
      const tag = document.activeElement?.tagName;
      if (tag==='INPUT'||tag==='TEXTAREA') return;
      if (e.key==='c'||e.key==='C') {
        const { nearbyUsers, activeChatSocketId } = useCosmosStore.getState();
        if (activeChatSocketId) { closeChat(); return; }
        if (!nearbyUsers.length) return;
        const closest = nearbyUsers.reduce((a,b)=>a.distance<b.distance?a:b);
        setActiveChat(closest.socketId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const sendEmote = emote => {
    socket.emit('emote', { emote });
    // show on self too
    useCosmosStore.getState().setSelf({ ...useCosmosStore.getState().self, _emote: emote });
    // local emote overlay (dispatched via canvas subscription)
  };

  const sendFriendReq = sid => socket.emit('friend:request', { toSocketId: sid });

  if (nearbyUsers.length === 0) return null;

  return (
    <div style={{
      position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)',
      display:'flex', flexDirection:'column', alignItems:'center', gap:8,
      zIndex:50, pointerEvents:'none',
    }}>
      {/* Nearby pill */}
      <div className="anim-slide-up" style={{
        display:'flex', gap:8, alignItems:'center',
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:100, padding:'7px 14px',
        boxShadow:'0 4px 16px rgba(0,0,0,0.1)',
        pointerEvents:'auto',
      }}>
        <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--green)',boxShadow:'0 0 6px var(--green)',flexShrink:0 }}/>
        <span style={{ fontSize:11,color:'var(--muted)',fontFamily:'DM Mono' }}>
          {nearbyUsers.length===1?'1 person nearby':`${nearbyUsers.length} nearby`}
        </span>

        {nearbyUsers.map(u => {
          const ud = users[u.socketId];
          const active = activeChatSocketId===u.socketId;
          return (
            <div key={u.socketId} style={{ position:'relative', display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
              <button onClick={()=>active?closeChat():setActiveChat(u.socketId)}
                title={`Chat with ${u.username} (C)`}
                style={{
                  width:32,height:32,borderRadius:'50%',background:ud?.color||'var(--accent)',
                  border:`2px solid ${active?'var(--text)':'transparent'}`,
                  cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:16,transition:'all 0.2s',
                  transform:active?'scale(1.12)':'scale(1)',
                  boxShadow:active?`0 0 12px ${ud?.color}88`:'none',
                }}>
                {ud?.avatar||'🧑'}
                {!active&&unreadCount>0&&(
                  <div style={{ position:'absolute',top:-3,right:-3,width:14,height:14,borderRadius:'50%',background:'var(--red)',fontSize:9,color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,border:'2px solid var(--surface)' }}>
                    {unreadCount>9?'9+':unreadCount}
                  </div>
                )}
                {u.isRecording && (
                  <div style={{ position:'absolute',top:-3,left:-3,width:10,height:10,borderRadius:'50%',background:'var(--red)',animation:'record-pulse 1.2s infinite',border:'1px solid var(--surface)' }}/>
                )}
              </button>
              <div style={{ display:'flex',gap:3 }}>
                <button title="Add friend" onClick={()=>sendFriendReq(u.socketId)} style={{ ...miniBtn }}>+</button>
              </div>
            </div>
          );
        })}

        {/* C key hint */}
        <div style={{ display:'flex',alignItems:'center',gap:5,marginLeft:4,paddingLeft:10,borderLeft:'1px solid var(--border)' }}>
          <kbd style={{ padding:'2px 7px',background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:5,fontSize:11,color:'var(--accent)',fontFamily:'DM Mono',fontWeight:700 }}>C</kbd>
          <span style={{ fontSize:11,color:'var(--muted)',fontFamily:'DM Mono' }}>{activeChatSocketId?'close':'chat'}</span>
        </div>
      </div>

      {/* Emote bar */}
      <div style={{
        display:'flex',gap:5,background:'var(--surface)',border:'1px solid var(--border)',
        borderRadius:100,padding:'5px 12px',
        boxShadow:'0 2px 10px rgba(0,0,0,0.07)',
        pointerEvents:'auto',
      }}>
        {EMOTES.map(e => (
          <button key={e} onClick={()=>sendEmote(e)} style={{
            background:'none',border:'none',fontSize:18,cursor:'pointer',
            borderRadius:8,padding:'2px 3px',transition:'transform 0.15s',
          }} onMouseEnter={el=>el.target.style.transform='scale(1.3)'}
            onMouseLeave={el=>el.target.style.transform='scale(1)'}>{e}</button>
        ))}
      </div>
    </div>
  );
}

const miniBtn = {
  width:16,height:16,fontSize:11,borderRadius:'50%',border:'1px solid var(--border)',
  background:'var(--bg2)',cursor:'pointer',color:'var(--text2)',display:'flex',
  alignItems:'center',justifyContent:'center',padding:0,lineHeight:1,
};
