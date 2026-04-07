import React, { useEffect } from 'react';
import { useCosmosStore } from '../utils/store';

export default function ProximityHUD() {
  const nearbyUsers = useCosmosStore((s) => s.nearbyUsers);
  const users = useCosmosStore((s) => s.users);
  const activeChatSocketId = useCosmosStore((s) => s.activeChatSocketId);
  const setActiveChat = useCosmosStore((s) => s.setActiveChat);
  const closeChat = useCosmosStore((s) => s.closeChat);
  const unreadCount = useCosmosStore((s) => s.unreadCount);

  // 'C' key → open chat with nearest user, or close if already open
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'c' || e.key === 'C') {
        // Don't trigger if user is typing in an input/textarea
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        const { nearbyUsers, activeChatSocketId } = useCosmosStore.getState();

        if (activeChatSocketId) {
          // Toggle: close if already open
          closeChat();
          return;
        }

        if (nearbyUsers.length === 0) return;

        // Open chat with the closest user (first in list = smallest distance)
        const closest = nearbyUsers.reduce((a, b) => a.distance < b.distance ? a : b);
        setActiveChat(closest.socketId);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
      {/* Nearby users pill */}
      <div className="animate-slide-in-up" style={{
        display: 'flex', gap: 8, alignItems: 'center',
        background: 'rgba(13,13,25,0.88)',
        backdropFilter: 'blur(16px)',
        border: '1px solid var(--cosmos-border)',
        borderRadius: 100,
        padding: '8px 16px',
        pointerEvents: 'auto',
      }}>
        {/* Live dot */}
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#6ef7a0',
          boxShadow: '0 0 8px #6ef7a088',
          flexShrink: 0,
        }} />

        <span style={{
          fontSize: 12, color: 'var(--cosmos-muted)',
          fontFamily: 'Space Mono', letterSpacing: '0.04em',
        }}>
          {nearbyUsers.length === 1 ? '1 person nearby' : `${nearbyUsers.length} people nearby`}
        </span>

        {/* Avatar buttons */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
          {nearbyUsers.map((u) => {
            const userData = users[u.socketId];
            const isActive = activeChatSocketId === u.socketId;
            return (
              <button
                key={u.socketId}
                onClick={() => isActive ? closeChat() : setActiveChat(u.socketId)}
                title={`Chat with ${u.username} (or press C)`}
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: userData?.color || 'var(--cosmos-accent)',
                  border: `2px solid ${isActive ? '#fff' : 'transparent'}`,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, transition: 'all 0.2s',
                  boxShadow: isActive ? `0 0 14px ${userData?.color || '#6ee7f7'}aa` : 'none',
                  position: 'relative',
                  transform: isActive ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {userData?.avatar || '🧑'}

                {/* Unread badge */}
                {!isActive && unreadCount > 0 && (
                  <div style={{
                    position: 'absolute', top: -3, right: -3,
                    width: 15, height: 15, borderRadius: '50%',
                    background: '#f76e6e', fontSize: 9,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700,
                    border: '2px solid var(--cosmos-bg)',
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* C key hint */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          marginLeft: 4, paddingLeft: 10,
          borderLeft: '1px solid var(--cosmos-border)',
        }}>
          <kbd style={{
            padding: '2px 7px',
            background: 'var(--cosmos-surface)',
            border: '1px solid var(--cosmos-border)',
            borderRadius: 5, fontSize: 11,
            color: 'var(--cosmos-accent)',
            fontFamily: 'Space Mono', fontWeight: 700,
            lineHeight: 1.6,
          }}>C</kbd>
          <span style={{ fontSize: 11, color: 'var(--cosmos-muted)', fontFamily: 'Space Mono' }}>
            {activeChatSocketId ? 'close' : 'chat'}
          </span>
        </div>
      </div>
    </div>
  );
}
