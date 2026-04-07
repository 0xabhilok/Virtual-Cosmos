import React, { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

export default function TopBar() {
  const self = useCosmosStore(s => s.self);
  const users = useCosmosStore(s => s.users);
  const nearbyUsers = useCosmosStore(s => s.nearbyUsers);
  const selfSpeed = useCosmosStore(s => s.selfSpeed);
  const setSelfSpeed = useCosmosStore(s => s.setSelfSpeed);
  const showFriends = useCosmosStore(s => s.showFriends);
  const setShowFriends = useCosmosStore(s => s.setShowFriends);
  const friendRequests = useCosmosStore(s => s.friendRequests);
  const [connected, setConnected] = useState(socket.connected);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showSpeed, setShowSpeed] = useState(false);

  useEffect(() => {
    socket.on('connect', ()=>setConnected(true));
    socket.on('disconnect', ()=>setConnected(false));
    return () => { socket.off('connect'); socket.off('disconnect'); };
  }, []);

  const submitRename = () => {
    if (!newName.trim()) return;
    socket.emit('rename', { displayName: newName.trim() });
    const store = useCosmosStore.getState();
    store.setSelf({ ...store.self, displayName: newName.trim() });
    setRenaming(false); setNewName('');
  };

  const changeSpeed = v => {
    setSelfSpeed(v);
    socket.emit('set:speed', { speed: v });
  };

  const total = Object.keys(users).length + 1;

  return (
    <div style={{
      position:'fixed', top:0, left:0, right:0, height:52,
      background:'var(--surface)', borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', padding:'0 16px', gap:14,
      zIndex:50, boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
    }}>
      {/* Logo */}
      <span style={{ fontFamily:'Fraunces', fontSize:16, fontWeight:600, color:'var(--accent)', letterSpacing:'-0.3px', flexShrink:0 }}>
        🌐 Cosmos
      </span>

      <div style={{ width:1, height:20, background:'var(--border)' }}/>

      {/* Status */}
      <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color: connected?'var(--green)':'var(--red)', fontFamily:'DM Mono', flexShrink:0 }}>
        <div style={{ width:6,height:6,borderRadius:'50%', background:connected?'var(--green)':'var(--red)' }}/>
        {connected?'LIVE':'OFFLINE'}
      </div>

      <div style={{ fontSize:11, color:'var(--muted)', fontFamily:'DM Mono', flexShrink:0 }}>
        <span style={{ color:'var(--text)', fontWeight:500 }}>{total}</span> online
        {nearbyUsers.length>0 && <span style={{ color:'var(--green)', marginLeft:8 }}>· {nearbyUsers.length} nearby</span>}
      </div>

      <div style={{ flex:1 }}/>

      {/* Keys hint */}
      <div style={{ display:'flex', gap:4, alignItems:'center', fontSize:10, color:'var(--muted)', fontFamily:'DM Mono', flexShrink:0 }}>
        {['W','A','S','D','C'].map(k => (
          <kbd key={k} style={{ padding:'2px 6px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:4, fontSize:10, color:'var(--text2)' }}>{k}</kbd>
        ))}
        <span style={{ marginLeft:2 }}>move · chat</span>
      </div>

      <div style={{ width:1, height:20, background:'var(--border)' }}/>

      {/* Speed button */}
      <div style={{ position:'relative', flexShrink:0 }}>
        <button onClick={()=>setShowSpeed(v=>!v)} style={{
          padding:'5px 10px', borderRadius:8, border:'1px solid var(--border)',
          background:'var(--bg2)', cursor:'pointer', fontSize:11, color:'var(--text2)',
          display:'flex', alignItems:'center', gap:5, fontFamily:'DM Mono',
        }}>
          ⚡ {selfSpeed}x
        </button>
        {showSpeed && (
          <div style={{
            position:'absolute', top:36, right:0, background:'var(--surface)',
            border:'1px solid var(--border)', borderRadius:10, padding:'12px 14px',
            boxShadow:'0 8px 24px rgba(0,0,0,0.1)', zIndex:200, width:180,
          }}>
            <div style={{ fontSize:11, color:'var(--muted)', marginBottom:8, fontFamily:'DM Mono' }}>Speed: {selfSpeed}x</div>
            <input type="range" min={1} max={10} step={0.5} value={selfSpeed}
              onChange={e=>changeSpeed(parseFloat(e.target.value))}
              style={{ width:'100%', accentColor:'var(--accent)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--muted)', marginTop:4 }}>
              <span>Slow</span><span>Fast</span>
            </div>
          </div>
        )}
      </div>

      {/* Friends button */}
      <button onClick={()=>setShowFriends(!showFriends)} style={{
        padding:'5px 10px', borderRadius:8,
        border:`1px solid ${showFriends?'var(--accent)':'var(--border)'}`,
        background: showFriends?'rgba(193,122,58,0.1)':'var(--bg2)',
        cursor:'pointer', fontSize:11, color: showFriends?'var(--accent)':'var(--text2)',
        display:'flex', alignItems:'center', gap:5, fontFamily:'DM Mono', flexShrink:0, position:'relative',
      }}>
        👥 Friends
        {friendRequests.length>0 && (
          <div style={{ position:'absolute', top:-4,right:-4, width:14,height:14, borderRadius:'50%', background:'var(--red)', fontSize:9, color:'#fff', display:'flex',alignItems:'center',justifyContent:'center', fontWeight:700 }}>
            {friendRequests.length}
          </div>
        )}
      </button>

      <div style={{ width:1, height:20, background:'var(--border)' }}/>

      {/* Self info + rename */}
      {self && (
        <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <div style={{ width:28,height:28,borderRadius:'50%', background:self.color, display:'flex',alignItems:'center',justifyContent:'center', fontSize:15, border:'2px solid var(--border)' }}>
            {self.avatar}
          </div>
          {renaming ? (
            <input autoFocus value={newName} onChange={e=>setNewName(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter') submitRename(); if(e.key==='Escape'){setRenaming(false);setNewName('');} }}
              onBlur={submitRename}
              style={{ fontSize:12, padding:'3px 7px', border:'1.5px solid var(--accent)', borderRadius:6, outline:'none', width:110, fontFamily:'DM Sans', background:'var(--bg)' }}
            />
          ) : (
            <div>
              <div style={{ fontSize:12, fontWeight:500, color:'var(--text)', cursor:'pointer', display:'flex',alignItems:'center',gap:4 }}
                onClick={()=>{ setRenaming(true); setNewName(self.displayName||self.username); }}>
                {self.displayName||self.username}
                <span style={{ fontSize:9, color:'var(--muted)' }}>✏</span>
              </div>
              <div style={{ fontSize:9, color:'var(--muted)', fontFamily:'DM Mono' }}>{self.permId}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
