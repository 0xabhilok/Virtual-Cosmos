import React, { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

const AVATARS = ['🧑','👩','🧔','👩‍💻','🧑‍🚀','🧙','🦸','🧑‍🎤','🧑‍🔬','🧑‍🎨'];
const COLORS = ['#c17a3a','#3a6fb5','#3a8a5a','#8b3ab5','#b53a3a','#b5893a','#3a9eb5','#b53a89'];

const btn = (active, extra={}) => ({
  border: `2px solid ${active?'var(--accent)':'var(--border)'}`,
  background: active?'rgba(193,122,58,0.1)':'transparent',
  borderRadius:10, cursor:'pointer', transition:'all 0.15s', ...extra
});

export default function LobbyScreen() {
  const [username, setUsername] = useState('');
  const [selAvatar, setSelAvatar] = useState(AVATARS[0]);
  const [selColor, setSelColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const { setSelf, setPhase } = useCosmosStore();

  useEffect(() => {
    if (!socket.connected) socket.connect();
    const onSelf = u => { setSelf(u); setPhase('cosmos'); };
    socket.on('self', onSelf);
    return () => socket.off('self', onSelf);
  }, []);

  const enter = () => {
    if (!username.trim()||loading) return;
    setLoading(true);
    socket.emit('join', { username:username.trim(), avatar:selAvatar, color:selColor });
  };

  return (
    <div style={{ position:'fixed',inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)',
      backgroundImage:`radial-gradient(circle at 30% 40%, rgba(193,122,58,0.08) 0%, transparent 60%),
                       radial-gradient(circle at 70% 70%, rgba(58,111,181,0.06) 0%, transparent 55%)` }}>

      <div className="anim-fade-in" style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:20, padding:'44px 40px', width:'100%', maxWidth:440,
        boxShadow:'0 20px 60px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04)',
      }}>
        <div style={{ textAlign:'center', marginBottom:32 }}>
          <div className="anim-float" style={{ fontSize:40, marginBottom:10 }}>🌐</div>
          <h1 style={{ fontFamily:'Fraunces', fontSize:26, fontWeight:600, color:'var(--text)', marginBottom:6 }}>
            Virtual Cosmos
          </h1>
          <p style={{ color:'var(--muted)', fontSize:13 }}>A proximity-based social space</p>
        </div>

        {/* Name */}
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>Your Name</label>
        <input
          autoFocus type="text" maxLength={20} placeholder="Enter your name…"
          value={username} onChange={e=>setUsername(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&enter()}
          style={{ width:'100%', padding:'11px 14px', background:'var(--bg)', border:'1.5px solid var(--border)',
            borderRadius:10, fontSize:14, color:'var(--text)', outline:'none', fontFamily:'DM Sans', marginBottom:20 }}
          onFocus={e=>e.target.style.borderColor='var(--accent)'}
          onBlur={e=>e.target.style.borderColor='var(--border)'}
        />

        {/* Avatar */}
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Avatar</label>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginBottom:20 }}>
          {AVATARS.map(av => (
            <button key={av} onClick={()=>setSelAvatar(av)}
              style={{ ...btn(selAvatar===av), width:42,height:42,fontSize:20, display:'flex',alignItems:'center',justifyContent:'center' }}>
              {av}
            </button>
          ))}
        </div>

        {/* Color */}
        <label style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>Character Color</label>
        <div style={{ display:'flex', gap:8, marginBottom:28 }}>
          {COLORS.map(c => (
            <button key={c} onClick={()=>setSelColor(c)} style={{
              width:30, height:30, borderRadius:'50%', background:c, cursor:'pointer',
              border:`3px solid ${selColor===c?'var(--text)':'transparent'}`,
              boxShadow:selColor===c?`0 0 0 2px var(--bg), 0 0 0 4px ${c}`:'none',
              transition:'all 0.15s',
            }} />
          ))}
        </div>

        <button onClick={enter} disabled={!username.trim()||loading} style={{
          width:'100%', padding:13,
          background: username.trim()&&!loading ? 'var(--accent)' : 'var(--border)',
          border:'none', borderRadius:12,
          color: username.trim()&&!loading ? '#fff' : 'var(--muted)',
          fontSize:14, fontWeight:600, fontFamily:'DM Sans',
          cursor: username.trim()&&!loading ? 'pointer' : 'not-allowed',
          transition:'all 0.2s', letterSpacing:'0.03em',
        }}>
          {loading ? 'Connecting…' : 'Enter the Cosmos →'}
        </button>

        <p style={{ textAlign:'center', marginTop:14, color:'var(--muted)', fontSize:12 }}>
          WASD · Arrow keys to move · C to open chat
        </p>
      </div>
    </div>
  );
}
