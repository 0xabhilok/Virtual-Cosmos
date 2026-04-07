import React from 'react';
import { useCosmosStore } from '../utils/store';

export default function ProximityHUD() {
  const nearbyUsers = useCosmosStore((s) => s.nearbyUsers);
  const users = useCosmosStore((s) => s.users);
  const activeChatSocketId = useCosmosStore((s) => s.activeChatSocketId);
  const setActiveChat = useCosmosStore((s) => s.setActiveChat);
  const unreadCount = useCosmosStore((s) => s.unreadCount);

  if (nearbyUsers.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24, left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 10,
      zIndex: 50,
      pointerEvents: 'none',
    }}>
      {/* Nearby users list */}
      <div className="animate-slide-in-up" style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'rgba(13,13,25,0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--cosmos-border)',
        borderRadius: 100,
        padding: '8px 16px',
        pointerEvents: 'auto',
      }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#6ef7a0',
          boxShadow: '0 0 8px #6ef7a088',
          flexShrink: 0,
          animation: 'pulse 2s infinite',
        }} />
        <span style={{
          fontSize: 12, color: 'var(--cosmos-muted)',
          fontFamily: 'Space Mono', letterSpacing: '0.05em',
        }}>
          {nearbyUsers.length === 1 ? '1 person nearby' : `${nearbyUsers.length} people nearby`}
        </span>

        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
          {nearbyUsers.map((u) => {
            const userData = users[u.socketId];
            const isActive = activeChatSocketId === u.socketId;
            return (
              <button
                key={u.socketId}
                onClick={() => setActiveChat(u.socketId)}
                title={`Chat with ${u.username}`}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: userData?.color || 'var(--cosmos-accent)',
                  border: `2px solid ${isActive ? '#fff' : 'transparent'}`,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, transition: 'all 0.2s',
                  boxShadow: isActive ? `0 0 12px ${userData?.color || '#6ee7f7'}88` : 'none',
                  position: 'relative',
                }}
              >
                {userData?.avatar || '🧑'}
                {!isActive && unreadCount > 0 && (
                  <div style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#f76e6e', fontSize: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700,
                    border: '1.5px solid var(--cosmos-bg)',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p style={{
        fontSize: 11, color: 'var(--cosmos-muted)',
        fontFamily: 'Space Mono',
        pointerEvents: 'none',
      }}>
        Click an avatar to open chat
      </p>
    </div>
  );
}
