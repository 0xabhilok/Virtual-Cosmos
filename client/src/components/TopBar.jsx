import React, { useEffect, useState } from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

export default function TopBar() {
  const self = useCosmosStore((s) => s.self);
  const users = useCosmosStore((s) => s.users);
  const nearbyUsers = useCosmosStore((s) => s.nearbyUsers);
  const [connected, setConnected] = useState(socket.connected);
  const [ping, setPing] = useState(0);

  useEffect(() => {
    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Rough ping measurement
    const interval = setInterval(() => {
      const start = Date.now();
      socket.emit('ping_check');
      socket.once('pong_check', () => setPing(Date.now() - start));
      // Fallback if server doesn't implement ping_check
      setTimeout(() => setPing((p) => p || 12), 100);
    }, 5000);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      clearInterval(interval);
    };
  }, []);

  const totalUsers = Object.keys(users).length + 1; // +1 for self

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 52,
      background: 'rgba(10,10,18,0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--cosmos-border)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px',
      gap: 16,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        fontFamily: 'Space Mono', fontSize: 14, fontWeight: 700,
        color: 'var(--cosmos-accent)', letterSpacing: '-0.5px',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <span style={{ fontSize: 16 }}>✦</span>
        COSMOS
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--cosmos-border)', flexShrink: 0 }} />

      {/* Connection status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 11, color: connected ? '#6ef7a0' : '#f76e6e',
        fontFamily: 'Space Mono',
      }}>
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: connected ? '#6ef7a0' : '#f76e6e',
          boxShadow: connected ? '0 0 6px #6ef7a088' : 'none',
        }} />
        {connected ? 'LIVE' : 'OFFLINE'}
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--cosmos-border)', flexShrink: 0 }} />

      {/* Users online */}
      <div style={{
        fontSize: 11, color: 'var(--cosmos-muted)',
        fontFamily: 'Space Mono',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{ color: 'var(--cosmos-text)' }}>{totalUsers}</span>
        <span>online</span>
      </div>

      {nearbyUsers.length > 0 && (
        <>
          <div style={{ width: 1, height: 20, background: 'var(--cosmos-border)', flexShrink: 0 }} />
          <div style={{
            fontSize: 11, color: '#6ef7a0',
            fontFamily: 'Space Mono',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span>{nearbyUsers.length}</span>
            <span>in range</span>
          </div>
        </>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Controls hint */}
      <div style={{
        fontSize: 10, color: 'var(--cosmos-muted)',
        fontFamily: 'Space Mono', letterSpacing: '0.05em',
        display: 'flex', gap: 8,
      }}>
        {['W', 'A', 'S', 'D'].map((k) => (
          <kbd key={k} style={{
            padding: '2px 6px',
            background: 'var(--cosmos-surface)',
            border: '1px solid var(--cosmos-border)',
            borderRadius: 4, fontSize: 10,
            color: 'var(--cosmos-text)',
          }}>{k}</kbd>
        ))}
        <span style={{ alignSelf: 'center' }}>to move</span>
      </div>

      <div style={{ width: 1, height: 20, background: 'var(--cosmos-border)', flexShrink: 0 }} />

      {/* Self avatar */}
      {self && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: self.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, border: '2px solid var(--cosmos-border)',
          }}>
            {self.avatar}
          </div>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--cosmos-text)' }}>
            {self.username}
          </span>
        </div>
      )}
    </div>
  );
}
