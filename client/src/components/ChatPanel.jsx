import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

function roomId(a, b) {
  return [a, b].sort().join('::');
}

export default function ChatPanel() {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  const self = useCosmosStore((s) => s.self);
  const activeChatSocketId = useCosmosStore((s) => s.activeChatSocketId);
  const closeChat = useCosmosStore((s) => s.closeChat);
  const users = useCosmosStore((s) => s.users);
  const messages = useCosmosStore((s) => s.messages);
  const nearbyUsers = useCosmosStore((s) => s.nearbyUsers);
  const resetUnread = useCosmosStore((s) => s.resetUnread);

  const rid = self && activeChatSocketId ? roomId(self.socketId, activeChatSocketId) : null;
  const roomMessages = rid ? (messages[rid] || []) : [];
  const chatPartner = activeChatSocketId ? users[activeChatSocketId] : null;
  const isStillNear = nearbyUsers.some((u) => u.socketId === activeChatSocketId);

  useEffect(() => {
    resetUnread();
  }, [activeChatSocketId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages.length]);

  // Auto-close chat when user walks away
  useEffect(() => {
    if (activeChatSocketId && !isStillNear) {
      // Small delay so the disconnect feels natural
      const t = setTimeout(closeChat, 800);
      return () => clearTimeout(t);
    }
  }, [isStillNear, activeChatSocketId]);

  const send = () => {
    if (!text.trim() || !activeChatSocketId) return;
    socket.emit('chat:send', { toSocketId: activeChatSocketId, text: text.trim() });
    setText('');
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!activeChatSocketId) return null;

  return (
    <div className="animate-slide-in-right" style={{
      position: 'fixed',
      right: 0, top: 0, bottom: 0,
      width: 320,
      background: 'rgba(13,13,25,0.92)',
      backdropFilter: 'blur(20px)',
      borderLeft: '1px solid var(--cosmos-border)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 20px',
        borderBottom: '1px solid var(--cosmos-border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: chatPartner?.color || 'var(--cosmos-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, border: '2px solid var(--cosmos-border)',
          }}>
            {chatPartner?.avatar || '🧑'}
          </div>
          <div style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 10, height: 10, borderRadius: '50%',
            background: isStillNear ? '#6ef7a0' : '#f76e6e',
            border: '2px solid var(--cosmos-surface)',
            transition: 'background 0.4s',
          }} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--cosmos-text)' }}>
            {chatPartner?.username || 'Unknown'}
          </div>
          <div style={{
            fontSize: 11, color: isStillNear ? '#6ef7a0' : 'var(--cosmos-muted)',
            transition: 'color 0.4s',
          }}>
            {isStillNear ? '● In range' : '○ Moving away…'}
          </div>
        </div>

        <button onClick={closeChat} style={{
          background: 'none', border: 'none',
          color: 'var(--cosmos-muted)', cursor: 'pointer',
          fontSize: 20, lineHeight: 1, padding: 4,
          borderRadius: 6, transition: 'color 0.15s',
        }}
          onMouseEnter={(e) => e.target.style.color = 'var(--cosmos-text)'}
          onMouseLeave={(e) => e.target.style.color = 'var(--cosmos-muted)'}
        >×</button>
      </div>

      {/* Proximity warning */}
      {!isStillNear && (
        <div className="animate-slide-in-up" style={{
          margin: '12px 16px 0',
          padding: '10px 14px',
          background: 'rgba(247,110,110,0.1)',
          border: '1px solid rgba(247,110,110,0.25)',
          borderRadius: 10,
          fontSize: 12,
          color: '#f79e9e',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>⚠</span>
          <span>You're moving out of range. Chat will close.</span>
        </div>
      )}

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {roomMessages.length === 0 && (
          <div style={{
            textAlign: 'center', marginTop: 'auto', marginBottom: 'auto',
            color: 'var(--cosmos-muted)', fontSize: 13,
          }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            <div>You're in range!</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Say something…</div>
          </div>
        )}

        {roomMessages.map((msg, i) => {
          const isMine = msg.senderSocketId === self?.socketId;
          return (
            <div key={i} className="animate-slide-in-up" style={{
              display: 'flex',
              flexDirection: isMine ? 'row-reverse' : 'row',
              gap: 8, alignItems: 'flex-end',
            }}>
              {!isMine && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  background: msg.senderColor || 'var(--cosmos-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14,
                }}>
                  {chatPartner?.avatar || '🧑'}
                </div>
              )}
              <div style={{ maxWidth: '72%' }}>
                <div style={{
                  padding: '9px 13px',
                  background: isMine
                    ? 'linear-gradient(135deg, var(--cosmos-accent), var(--cosmos-accent2))'
                    : 'rgba(255,255,255,0.06)',
                  borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  color: isMine ? '#0a0a12' : 'var(--cosmos-text)',
                  fontSize: 13, lineHeight: 1.5,
                  border: isMine ? 'none' : '1px solid var(--cosmos-border)',
                }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: 10, color: 'var(--cosmos-muted)',
                  marginTop: 3,
                  textAlign: isMine ? 'right' : 'left',
                }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--cosmos-border)',
      }}>
        <div style={{
          display: 'flex', gap: 8,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--cosmos-border)',
          borderRadius: 12, padding: '8px 12px',
          alignItems: 'flex-end',
        }}>
          <textarea
            rows={1}
            placeholder={isStillNear ? 'Send a message…' : 'Moving out of range…'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            disabled={!isStillNear}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--cosmos-text)', fontSize: 13,
              fontFamily: 'DM Sans', resize: 'none', lineHeight: 1.5,
              maxHeight: 100, overflowY: 'auto',
            }}
          />
          <button onClick={send} disabled={!text.trim() || !isStillNear} style={{
            background: text.trim() && isStillNear
              ? 'linear-gradient(135deg, var(--cosmos-accent), var(--cosmos-accent2))'
              : 'transparent',
            border: 'none', borderRadius: 8,
            width: 32, height: 32, cursor: 'pointer',
            color: text.trim() && isStillNear ? '#0a0a12' : 'var(--cosmos-muted)',
            fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s', flexShrink: 0,
          }}>↑</button>
        </div>
        <p style={{
          fontSize: 10, color: 'var(--cosmos-muted)',
          marginTop: 6, textAlign: 'center',
        }}>Enter to send · Stay in range to chat</p>
      </div>
    </div>
  );
}
