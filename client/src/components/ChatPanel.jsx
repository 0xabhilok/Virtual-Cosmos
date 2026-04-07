import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../utils/socket';
import { useCosmosStore } from '../utils/store';

function buildRoomId(a,b) { return [a,b].sort().join('::'); }

const CODE_EXTS = ['js','jsx','ts','tsx','py','cpp','c','java','go','rs','html','css','json','sh'];
function isCodeFile(name) { return CODE_EXTS.some(e => name?.endsWith('.'+e)); }

function FileMessage({ msg }) {
  const isImg = msg.fileType?.startsWith('image/');
  const isCode = isCodeFile(msg.fileName) || msg.type==='code';

  if (isImg) {
    return (
      <div>
        <img src={msg.fileData} alt={msg.fileName} style={{ maxWidth:200, maxHeight:160, borderRadius:8, display:'block', border:'1px solid var(--border)' }} />
        <div style={{ fontSize:10, color:'var(--muted)', marginTop:3 }}>{msg.fileName}</div>
      </div>
    );
  }
  if (isCode) {
    return (
      <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', maxWidth:240 }}>
        <div style={{ padding:'4px 10px', background:'var(--border)', fontSize:10, color:'var(--text2)', fontFamily:'DM Mono', display:'flex', justifyContent:'space-between' }}>
          <span>{msg.fileName||'code'}</span>
          <span style={{ cursor:'pointer', color:'var(--accent)' }} onClick={()=>navigator.clipboard.writeText(msg.text)}>copy</span>
        </div>
        <pre style={{ padding:'8px 10px', fontSize:11, fontFamily:'DM Mono', color:'var(--text)', overflowX:'auto', margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{msg.text}</pre>
      </div>
    );
  }
  // generic file
  return (
    <a href={msg.fileData} download={msg.fileName} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, textDecoration:'none', color:'var(--text)', maxWidth:220 }}>
      <span style={{ fontSize:20 }}>📎</span>
      <div>
        <div style={{ fontSize:12, fontWeight:500 }}>{msg.fileName}</div>
        <div style={{ fontSize:10, color:'var(--muted)' }}>Click to download</div>
      </div>
    </a>
  );
}

export default function ChatPanel() {
  const [text, setText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const bottomRef = useRef(null);
  const fileRef = useRef(null);

  const self = useCosmosStore(s => s.self);
  const activeChatSocketId = useCosmosStore(s => s.activeChatSocketId);
  const closeChat = useCosmosStore(s => s.closeChat);
  const users = useCosmosStore(s => s.users);
  const messages = useCosmosStore(s => s.messages);
  const nearbyUsers = useCosmosStore(s => s.nearbyUsers);
  const resetUnread = useCosmosStore(s => s.resetUnread);
  const setCallState = useCosmosStore(s => s.setCallState);
  const recordingActive = useCosmosStore(s => s.recordingActive);
  const setRecordingActive = useCosmosStore(s => s.setRecordingActive);

  const myId = self?.socketId || socket.id;
  const rid = myId && activeChatSocketId ? buildRoomId(myId, activeChatSocketId) : null;
  const roomMessages = rid ? (messages[rid]||[]) : [];
  const chatPartner = activeChatSocketId ? users[activeChatSocketId] : null;
  const isNear = nearbyUsers.some(u => u.socketId===activeChatSocketId);

  useEffect(() => { resetUnread(); }, [activeChatSocketId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [roomMessages.length]);
  useEffect(() => {
    if (activeChatSocketId && !isNear) {
      const t = setTimeout(closeChat, 900);
      return () => clearTimeout(t);
    }
  }, [isNear, activeChatSocketId]);

  const send = () => {
    if (!text.trim()||!activeChatSocketId) return;
    socket.emit('chat:send', { toSocketId:activeChatSocketId, text:text.trim(), type:'text' });
    setText('');
  };

  const sendFile = async file => {
    if (!file||!activeChatSocketId) return;
    const reader = new FileReader();
    reader.onload = e => {
      const isCode = isCodeFile(file.name);
      const isText = file.type.startsWith('text/') || isCode;
      if (isText) {
        const textReader = new FileReader();
        textReader.onload = ev => {
          socket.emit('chat:send', {
            toSocketId: activeChatSocketId,
            type: isCode ? 'code' : 'text',
            text: ev.target.result,
            fileName: file.name,
            fileType: file.type,
          });
        };
        textReader.readAsText(file);
      } else {
        socket.emit('chat:send', {
          toSocketId: activeChatSocketId,
          type: file.type.startsWith('image/') ? 'image' : 'file',
          fileData: e.target.result,
          fileName: file.name,
          fileType: file.type,
          text: '',
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const onDrop = e => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) sendFile(file);
  };

  const toggleRecording = () => {
    if (!recordingActive) {
      setRecordingActive(true);
      socket.emit('recording:start', { toSocketId: activeChatSocketId });
    } else {
      setRecordingActive(false);
      socket.emit('recording:stop', { toSocketId: activeChatSocketId });
    }
  };

  if (!activeChatSocketId) return null;

  return (
    <div className="anim-slide-right" style={{
      position:'fixed', right:0,top:0,bottom:0, width:340,
      background:'var(--surface)', borderLeft:'1px solid var(--border)',
      display:'flex', flexDirection:'column', zIndex:100,
      boxShadow:'-4px 0 20px rgba(0,0,0,0.06)',
    }}
      onDragOver={e=>{e.preventDefault();setDragOver(true)}}
      onDragLeave={()=>setDragOver(false)}
      onDrop={onDrop}
    >
      {dragOver && (
        <div style={{ position:'absolute',inset:0, background:'rgba(193,122,58,0.08)', border:'2px dashed var(--accent)', borderRadius:0, zIndex:10, display:'flex',alignItems:'center',justifyContent:'center', fontSize:14, color:'var(--accent)', fontWeight:600, pointerEvents:'none' }}>
          Drop file to send
        </div>
      )}

      {/* Header */}
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ position:'relative' }}>
          <div style={{ width:36,height:36,borderRadius:'50%', background:chatPartner?.color||'#c17a3a', display:'flex',alignItems:'center',justifyContent:'center', fontSize:18, border:'2px solid var(--border)' }}>
            {chatPartner?.avatar||'🧑'}
          </div>
          <div style={{ position:'absolute',bottom:0,right:0, width:9,height:9,borderRadius:'50%', background:isNear?'var(--green)':'var(--red)', border:'2px solid var(--surface)', transition:'background 0.4s' }}/>
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:600,fontSize:13,color:'var(--text)' }}>{chatPartner?.displayName||chatPartner?.username||'?'}</div>
          <div style={{ fontSize:10,color:'var(--muted)',fontFamily:'DM Mono' }}>{chatPartner?.permId||''}</div>
        </div>

        {/* Call buttons */}
        <button title="Voice call" onClick={()=>{ socket.emit('call:request',{toSocketId:activeChatSocketId,callType:'voice'}); setCallState({phase:'outgoing',peerSocketId:activeChatSocketId,peerName:chatPartner?.displayName,callType:'voice'}); }} style={{ ...iconBtn }}>🎤</button>
        <button title="Video call" onClick={()=>{ socket.emit('call:request',{toSocketId:activeChatSocketId,callType:'video'}); setCallState({phase:'outgoing',peerSocketId:activeChatSocketId,peerName:chatPartner?.displayName,callType:'video'}); }} style={{ ...iconBtn }}>📹</button>

        {/* Record */}
        <button title={recordingActive?'Stop recording':'Start recording'} onClick={toggleRecording} style={{ ...iconBtn, color: recordingActive?'var(--red)':'var(--text2)', animation: recordingActive?'record-pulse 1.2s infinite':'' }}>
          ⏺
        </button>

        <button onClick={closeChat} style={{ ...iconBtn, fontSize:16 }}>×</button>
      </div>

      {/* Out of range warning */}
      {!isNear && (
        <div className="anim-slide-up" style={{ margin:'10px 12px 0', padding:'8px 12px', background:'rgba(194,58,58,0.07)', border:'1px solid rgba(194,58,58,0.2)', borderRadius:8, fontSize:11, color:'var(--red)', display:'flex',alignItems:'center',gap:6 }}>
          ⚠ Moving out of range — chat will close
        </div>
      )}

      {/* Messages */}
      <div style={{ flex:1,overflowY:'auto', padding:'12px', display:'flex',flexDirection:'column',gap:8 }}>
        {roomMessages.length===0 && (
          <div style={{ textAlign:'center',margin:'auto',color:'var(--muted)',fontSize:13 }}>
            <div style={{ fontSize:26,marginBottom:6 }}>💬</div>
            <div>You're in range — say something!</div>
          </div>
        )}
        {roomMessages.map((msg,i) => {
          const mine = msg.senderSocketId === myId;
          return (
            <div key={i} className="anim-slide-up" style={{ display:'flex', flexDirection:mine?'row-reverse':'row', gap:7, alignItems:'flex-end' }}>
              {!mine && (
                <div style={{ width:26,height:26,borderRadius:'50%',flexShrink:0, background:msg.senderColor||'#c17a3a', display:'flex',alignItems:'center',justifyContent:'center',fontSize:13 }}>
                  {chatPartner?.avatar||'🧑'}
                </div>
              )}
              <div style={{ maxWidth:'76%' }}>
                {(msg.type==='image'||msg.type==='file'||msg.type==='code') ? (
                  <FileMessage msg={msg} />
                ) : (
                  <div style={{
                    padding:'8px 12px',
                    background: mine?'var(--accent)':'var(--bg2)',
                    borderRadius: mine?'14px 14px 3px 14px':'14px 14px 14px 3px',
                    color: mine?'#fff':'var(--text)',
                    fontSize:13, lineHeight:1.5,
                    border: mine?'none':'1px solid var(--border)',
                  }}>{msg.text}</div>
                )}
                <div style={{ fontSize:10,color:'var(--muted)',marginTop:2,textAlign:mine?'right':'left' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div style={{ padding:'10px 12px', borderTop:'1px solid var(--border)' }}>
        <div style={{ display:'flex',gap:6,background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:12,padding:'7px 10px',alignItems:'flex-end' }}>
          {/* File attach */}
          <button onClick={()=>fileRef.current?.click()} title="Attach file" style={{ ...iconBtn,fontSize:16,flexShrink:0 }}>📎</button>
          <input ref={fileRef} type="file" style={{ display:'none' }} onChange={e=>{ if(e.target.files[0]) sendFile(e.target.files[0]); e.target.value=''; }}/>

          <textarea rows={1} placeholder={isNear?'Message…':'Out of range…'}
            value={text} onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} }}
            disabled={!isNear}
            style={{ flex:1,background:'none',border:'none',outline:'none',color:'var(--text)',fontSize:13,fontFamily:'DM Sans',resize:'none',lineHeight:1.5,maxHeight:100,overflowY:'auto' }}
          />

          <button onClick={send} disabled={!text.trim()||!isNear} style={{
            background: text.trim()&&isNear?'var(--accent)':'transparent',
            border:'none',borderRadius:8,width:30,height:30,cursor:'pointer',
            color: text.trim()&&isNear?'#fff':'var(--muted)',
            fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',flexShrink:0,
          }}>↑</button>
        </div>
        <p style={{ fontSize:10,color:'var(--muted)',marginTop:5,textAlign:'center' }}>
          Enter to send · drag & drop files · {recordingActive && <span style={{ color:'var(--red)', animation:'record-pulse 1.2s infinite' }}>● Recording</span>}
        </p>
      </div>
    </div>
  );
}

const iconBtn = {
  background:'none', border:'1px solid var(--border)', borderRadius:7,
  width:28,height:28, cursor:'pointer', fontSize:13,
  display:'flex',alignItems:'center',justifyContent:'center',
  color:'var(--text2)', transition:'all 0.15s', flexShrink:0,
};
