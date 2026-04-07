import React, { useEffect, useState } from 'react';
import { useCosmosStore } from '../utils/store';

export default function ConnectionToast() {
  const [toasts, setToasts] = useState([]);
  const nearbyUsers = useCosmosStore(s => s.nearbyUsers);
  const users = useCosmosStore(s => s.users);
  const recordingNotify = useCosmosStore(s => s.recordingNotify);
  const prevRef = React.useRef([]);

  useEffect(() => {
    const prev = new Set(prevRef.current.map(u=>u.socketId));
    const curr = new Set(nearbyUsers.map(u=>u.socketId));
    for (const u of nearbyUsers) {
      if (!prev.has(u.socketId)) push({ id:`${u.socketId}-in`, type:'connect', avatar:users[u.socketId]?.avatar||'🧑', name:u.username, color:users[u.socketId]?.color||'var(--accent)' });
    }
    for (const u of prevRef.current) {
      if (!curr.has(u.socketId)) push({ id:`${u.socketId}-out`, type:'disconnect', avatar:users[u.socketId]?.avatar||'🧑', name:u.username, color:'var(--muted)' });
    }
    prevRef.current = nearbyUsers;
  }, [nearbyUsers]);

  useEffect(() => {
    if (recordingNotify) push({ id:'rec-'+Date.now(), type:'record', name:recordingNotify.fromName });
  }, [recordingNotify]);

  function push(t) {
    setToasts(prev=>[...prev,t]);
    setTimeout(()=>setToasts(prev=>prev.filter(x=>x.id!==t.id)), 3500);
  }

  return (
    <div style={{ position:'fixed',top:64,left:16,display:'flex',flexDirection:'column',gap:7,zIndex:200,pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} className="anim-slide-up" style={{
          display:'flex',alignItems:'center',gap:10,
          background:'var(--surface)',border:'1px solid var(--border)',
          borderRadius:12,padding:'9px 14px',
          boxShadow:'0 4px 16px rgba(0,0,0,0.1)',minWidth:200,
          borderLeft:`3px solid ${t.type==='connect'?'var(--green)':t.type==='record'?'var(--red)':'var(--border)'}`,
        }}>
          {t.type!=='record' && (
            <div style={{ width:28,height:28,borderRadius:'50%',background:t.color,display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,flexShrink:0 }}>
              {t.avatar}
            </div>
          )}
          <div>
            <div style={{ fontSize:12,fontWeight:600,color:'var(--text)' }}>{t.type==='record'?'⏺ Recording':t.name}</div>
            <div style={{ fontSize:11,color:t.type==='connect'?'var(--green)':t.type==='record'?'var(--red)':'var(--muted)' }}>
              {t.type==='connect'?'Entered your range':t.type==='record'?`${t.name} is recording`:'Left your range'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
