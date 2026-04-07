import React, { useState, useEffect } from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

const AVATARS = ['🧑', '👩', '🧔', '👩‍💻', '🧑‍🚀', '🧙', '🦸', '🧑‍🎤', '🧑‍🔬', '🧑‍🎨'];
const COLORS = [
  '#6ee7f7', '#b57bee', '#f7c56e', '#6ef7a0',
  '#f76e6e', '#f76eb8', '#6e8ef7', '#f7956e',
];

export default function LobbyScreen() {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);
  const setPhase = useCosmosStore((s) => s.setPhase);
  const setSelf = useCosmosStore((s) => s.setSelf);

  // Connect socket and listen for server confirmation before switching phase
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onSelf = (user) => {
      setSelf(user);
      setPhase('cosmos');
    };
    socket.on('self', onSelf);
    return () => {
      socket.off('self', onSelf);
    };
  }, []);

  const enter = () => {
    if (!username.trim() || loading) return;
    setLoading(true);
    socket.emit('join', {
      username: username.trim(),
      avatar: selectedAvatar,
      color: selectedColor,
    });
  };

  const onKey = (e) => { if (e.key === 'Enter') enter(); };

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: 'var(--cosmos-bg)' }}>
      {/* Ambient glow blobs */}
      <div style={{
        position: 'absolute', top: '20%', left: '15%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, #6ee7f720 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '15%',
        width: 350, height: 350, borderRadius: '50%',
        background: 'radial-gradient(circle, #b57bee18 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="animate-fade-in" style={{
        background: 'var(--cosmos-surface)',
        border: '1px solid var(--cosmos-border)',
        borderRadius: 24,
        padding: '48px 40px',
        width: '100%',
        maxWidth: 460,
        boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(110,231,247,0.06)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }} className="animate-float">✦</div>
          <h1 style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: 28, fontWeight: 700,
            color: 'var(--cosmos-accent)',
            letterSpacing: '-0.5px', marginBottom: 6,
          }}>Virtual Cosmos</h1>
          <p style={{ color: 'var(--cosmos-muted)', fontSize: 14, fontWeight: 300 }}>
            A proximity-based social space
          </p>
        </div>

        {/* Username */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: 'var(--cosmos-muted)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>Your Name</label>
          <input
            type="text"
            placeholder="Enter your name..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={onKey}
            maxLength={20}
            style={{
              width: '100%', padding: '12px 16px',
              background: '#0a0a12', border: '1px solid var(--cosmos-border)',
              borderRadius: 10, color: 'var(--cosmos-text)',
              fontSize: 15, outline: 'none', fontFamily: 'DM Sans',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = 'var(--cosmos-accent)'}
            onBlur={(e) => e.target.style.borderColor = 'var(--cosmos-border)'}
            autoFocus
          />
        </div>

        {/* Avatar picker */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: 'var(--cosmos-muted)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>Avatar</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AVATARS.map((av) => (
              <button key={av} onClick={() => setSelectedAvatar(av)} style={{
                width: 44, height: 44, borderRadius: 10, fontSize: 22,
                background: selectedAvatar === av ? 'rgba(110,231,247,0.12)' : 'transparent',
                border: `2px solid ${selectedAvatar === av ? 'var(--cosmos-accent)' : 'var(--cosmos-border)'}`,
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{av}</button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div style={{ marginBottom: 36 }}>
          <label style={{
            display: 'block', fontSize: 11, fontWeight: 600,
            color: 'var(--cosmos-muted)', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 8,
          }}>Color</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map((c) => (
              <button key={c} onClick={() => setSelectedColor(c)} style={{
                width: 32, height: 32, borderRadius: '50%', background: c,
                border: `3px solid ${selectedColor === c ? '#fff' : 'transparent'}`,
                cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: selectedColor === c ? `0 0 12px ${c}88` : 'none',
              }} />
            ))}
          </div>
        </div>

        {/* Enter button */}
        <button
          onClick={enter}
          disabled={!username.trim() || loading}
          style={{
            width: '100%', padding: '14px',
            background: username.trim() && !loading
              ? `linear-gradient(135deg, var(--cosmos-accent), var(--cosmos-accent2))`
              : 'var(--cosmos-border)',
            border: 'none', borderRadius: 12,
            color: username.trim() && !loading ? '#0a0a12' : 'var(--cosmos-muted)',
            fontSize: 15, fontWeight: 700, fontFamily: 'Space Mono',
            cursor: username.trim() && !loading ? 'pointer' : 'not-allowed',
            letterSpacing: '0.05em',
            transition: 'all 0.2s',
            boxShadow: username.trim() && !loading ? '0 8px 32px rgba(110,231,247,0.25)' : 'none',
          }}
        >
          {loading ? 'CONNECTING…' : 'ENTER THE COSMOS →'}
        </button>

        <p style={{
          textAlign: 'center', marginTop: 16,
          color: 'var(--cosmos-muted)', fontSize: 12,
        }}>Use WASD or Arrow Keys to move</p>
      </div>
    </div>
  );
}
