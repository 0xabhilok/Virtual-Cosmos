import React, { useEffect, useState } from 'react';
import { useCosmosStore } from '../utils/store';

export default function ConnectionToast() {
  const [toasts, setToasts] = useState([]);
  const nearbyUsers = useCosmosStore((s) => s.nearbyUsers);
  const users = useCosmosStore((s) => s.users);
  const prevNearRef = React.useRef([]);

  useEffect(() => {
    const prevIds = new Set(prevNearRef.current.map((u) => u.socketId));
    const currIds = new Set(nearbyUsers.map((u) => u.socketId));

    // Newly entered range
    for (const u of nearbyUsers) {
      if (!prevIds.has(u.socketId)) {
        const userData = users[u.socketId];
        addToast({
          id: `${u.socketId}-in-${Date.now()}`,
          type: 'connect',
          avatar: userData?.avatar || '🧑',
          name: u.username,
          color: userData?.color || '#6ee7f7',
        });
      }
    }

    // Left range
    for (const u of prevNearRef.current) {
      if (!currIds.has(u.socketId)) {
        const userData = users[u.socketId];
        addToast({
          id: `${u.socketId}-out-${Date.now()}`,
          type: 'disconnect',
          avatar: userData?.avatar || '🧑',
          name: u.username,
          color: userData?.color || '#6b6b8a',
        });
      }
    }

    prevNearRef.current = nearbyUsers;
  }, [nearbyUsers]);

  function addToast(toast) {
    setToasts((t) => [...t, toast]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== toast.id));
    }, 3000);
  }

  return (
    <div style={{
      position: 'fixed',
      top: 68, left: 20,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 60, pointerEvents: 'none',
    }}>
      {toasts.map((toast) => (
        <div key={toast.id} className="animate-slide-in-up" style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(13,13,25,0.9)',
          backdropFilter: 'blur(16px)',
          border: `1px solid ${toast.type === 'connect' ? 'rgba(110,247,160,0.3)' : 'rgba(107,107,138,0.3)'}`,
          borderRadius: 12,
          padding: '10px 14px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          minWidth: 200,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: toast.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>
            {toast.avatar}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--cosmos-text)' }}>
              {toast.name}
            </div>
            <div style={{
              fontSize: 11,
              color: toast.type === 'connect' ? '#6ef7a0' : 'var(--cosmos-muted)',
            }}>
              {toast.type === 'connect' ? '✦ Entered your range' : '○ Left your range'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
