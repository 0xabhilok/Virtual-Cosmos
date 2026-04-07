import React from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

export default function FriendsPanel() {
  const show   = useCosmosStore(s => s.showFriends);
  const self   = useCosmosStore(s => s.self);
  const friends = useCosmosStore(s => s.friends);
  const reqs   = useCosmosStore(s => s.friendRequests);
  const removeFriendRequest = useCosmosStore(s => s.removeFriendRequest);
  const setShowFriends = useCosmosStore(s => s.setShowFriends);

  if (!show) return null;

  const accept = (reqId, fromSocketId) => {
    socket.emit('friend:accept', { reqId });
    removeFriendRequest(reqId);
  };
  const reject = (reqId) => {
    socket.emit('friend:reject', { reqId });
    removeFriendRequest(reqId);
  };

  return (
    <div className="anim-slide-right" style={{
      position:'fixed', top:52, right:0, bottom:0, width:280,
      background:'var(--surface)', borderLeft:'1px solid var(--border)',
      zIndex:90, display:'flex', flexDirection:'column',
      boxShadow:'-4px 0 20px rgba(0,0,0,0.06)',
    }}>
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'Fraunces', fontSize:16, fontWeight:600, color:'var(--text)' }}>Friends</div>
          {self && <div style={{ fontSize:10, color:'var(--muted)', fontFamily:'DM Mono', marginTop:2 }}>Your ID: {self.permId}</div>}
        </div>
        <button onClick={()=>setShowFriends(false)} style={{ background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--muted)' }}>×</button>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
        {/* Pending requests */}
        {reqs.length>0 && (
          <div style={{ marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:8, fontFamily:'DM Mono' }}>
              Requests ({reqs.length})
            </div>
            {reqs.map(r => (
              <div key={r.reqId} className="anim-slide-up" style={{
                display:'flex',alignItems:'center',gap:10,padding:'10px',
                background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,marginBottom:6,
              }}>
                <div style={{ width:34,height:34,borderRadius:'50%',background:r.fromColor||'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>
                  {r.fromAvatar||'🧑'}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13,fontWeight:500,color:'var(--text)' }}>{r.fromName}</div>
                  <div style={{ fontSize:10,color:'var(--muted)',fontFamily:'DM Mono' }}>{r.fromPermId}</div>
                </div>
                <button onClick={()=>accept(r.reqId, r.fromSocketId)} style={{ ...actionBtn, background:'var(--green)', color:'#fff' }}>✓</button>
                <button onClick={()=>reject(r.reqId)} style={{ ...actionBtn, background:'var(--red)', color:'#fff' }}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        <div style={{ fontSize:11,fontWeight:600,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:8,fontFamily:'DM Mono' }}>
          Friends ({friends.length})
        </div>
        {friends.length===0 && (
          <div style={{ textAlign:'center',marginTop:40,color:'var(--muted)',fontSize:13 }}>
            <div style={{ fontSize:28,marginBottom:8 }}>👥</div>
            <div>No friends yet</div>
            <div style={{ fontSize:12,marginTop:4 }}>Walk close to someone and click + to add them</div>
          </div>
        )}
        {friends.map(f => (
          <div key={f.permId} style={{
            display:'flex',alignItems:'center',gap:10,padding:'10px',
            background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,marginBottom:6,
          }}>
            <div style={{ width:34,height:34,borderRadius:'50%',background:f.color||'var(--accent)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,flexShrink:0 }}>
              {f.avatar||'🧑'}
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:13,fontWeight:500,color:'var(--text)' }}>{f.displayName}</div>
              <div style={{ fontSize:10,color:'var(--muted)',fontFamily:'DM Mono' }}>{f.permId}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const actionBtn = { width:26,height:26,border:'none',borderRadius:'50%',cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:700 };
