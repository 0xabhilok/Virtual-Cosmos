import React, { useRef, useEffect, useState } from 'react';
import { socket } from '../../utils/socket';
import { useCosmosStore } from '../../utils/store';

export default function CallModal() {
  const callState = useCosmosStore(s => s.callState);
  const setCallState = useCosmosStore(s => s.setCallState);

  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);

  const [micOn, setMicOn]       = useState(true);
  const [camOn, setCamOn]       = useState(true);
  const [screenOn, setScreenOn] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const isActive   = callState?.phase === 'active';
  const isIncoming = callState?.phase === 'incoming';
  const isOutgoing = callState?.phase === 'outgoing';
  const isVideo    = callState?.callType === 'video';

  // Call duration timer
  useEffect(() => {
    if (!isActive) { setCallDuration(0); return; }
    const t = setInterval(() => setCallDuration(d => d+1), 1000);
    return () => clearInterval(t);
  }, [isActive]);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  // WebRTC setup when call becomes active
  useEffect(() => {
    if (!isActive) return;
    startWebRTC();
    return () => cleanupWebRTC();
  }, [isActive]);

  // Listen for WebRTC signals
  useEffect(() => {
    socket.on('webrtc:offer',  async ({ fromSocketId, offer }) => {
      if (!pcRef.current) await startWebRTC(false);
      await pcRef.current.setRemoteDescription(offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socket.emit('webrtc:answer', { toSocketId: fromSocketId, answer });
    });

    socket.on('webrtc:answer', async ({ answer }) => {
      await pcRef.current?.setRemoteDescription(answer);
    });

    socket.on('webrtc:ice', async ({ candidate }) => {
      try { await pcRef.current?.addIceCandidate(candidate); } catch {}
    });

    return () => {
      socket.off('webrtc:offer');
      socket.off('webrtc:answer');
      socket.off('webrtc:ice');
    };
  }, [callState]);

  async function startWebRTC(initiator = true) {
    const pc = new RTCPeerConnection({ iceServers:[{urls:'stun:stun.l.google.com:19302'}] });
    pcRef.current = pc;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });
      localStreamRef.current = stream;
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      if (localVideoRef.current && isVideo) localVideoRef.current.srcObject = stream;
    } catch (e) { console.warn('Media error:', e); }

    pc.ontrack = e => {
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0];
    };

    pc.onicecandidate = e => {
      if (e.candidate && callState?.peerSocketId) {
        socket.emit('webrtc:ice', { toSocketId: callState.peerSocketId, candidate: e.candidate });
      }
    };

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc:offer', { toSocketId: callState?.peerSocketId, offer });
    }
  }

  function cleanupWebRTC() {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current = null;
  }

  const endCall = () => {
    socket.emit('call:end', { toSocketId: callState?.peerSocketId });
    cleanupWebRTC();
    setCallState(null);
  };

  const accept = () => {
    socket.emit('call:accept', { toSocketId: callState?.peerSocketId, callType: callState?.callType });
    const cs = useCosmosStore.getState().callState; setCallState(cs ? { ...cs, phase:'active' } : null);
  };

  const reject = () => {
    socket.emit('call:reject', { toSocketId: callState?.peerSocketId });
    setCallState(null);
  };

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMicOn(v=>!v); }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (track) { track.enabled = !track.enabled; setCamOn(v=>!v); }
  };

  const shareScreen = async () => {
    if (screenOn) {
      const camStream = await navigator.mediaDevices.getUserMedia({ video:true });
      const sender = pcRef.current?.getSenders().find(s=>s.track?.kind==='video');
      sender?.replaceTrack(camStream.getVideoTracks()[0]);
      if (localVideoRef.current) localVideoRef.current.srcObject = camStream;
      setScreenOn(false);
    } else {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video:true });
      const sender = pcRef.current?.getSenders().find(s=>s.track?.kind==='video');
      sender?.replaceTrack(screen.getVideoTracks()[0]);
      if (localVideoRef.current) localVideoRef.current.srcObject = screen;
      screen.getVideoTracks()[0].onended = () => setScreenOn(false);
      setScreenOn(true);
    }
  };

  if (!callState) return null;

  return (
    <div style={{ position:'fixed',inset:0,zIndex:300, background:'rgba(26,22,18,0.5)', backdropFilter:'blur(6px)', display:'flex',alignItems:'center',justifyContent:'center' }}>
      <div className="anim-pop" style={{
        background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:20, padding:0, width: isActive&&isVideo ? 600 : 360,
        overflow:'hidden', boxShadow:'0 32px 80px rgba(0,0,0,0.2)',
      }}>
        {/* Video area */}
        {isActive && isVideo && (
          <div style={{ position:'relative', background:'#111', height:300 }}>
            <video ref={remoteVideoRef} autoPlay playsInline style={{ width:'100%',height:'100%',objectFit:'cover' }}/>
            <video ref={localVideoRef}  autoPlay playsInline muted style={{
              position:'absolute', bottom:12,right:12, width:100,height:75,
              objectFit:'cover', borderRadius:8, border:'2px solid #fff',
            }}/>
            <div style={{ position:'absolute',top:12,left:12, background:'rgba(0,0,0,0.5)', color:'#fff', padding:'4px 10px', borderRadius:20, fontSize:12, fontFamily:'DM Mono' }}>
              {fmt(callDuration)}
            </div>
          </div>
        )}

        {/* Audio only */}
        {isActive && !isVideo && (
          <video ref={remoteVideoRef} autoPlay playsInline style={{ display:'none' }}/>
        )}

        <div style={{ padding:'24px' }}>
          {/* State header */}
          {(isIncoming||isOutgoing) && (
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <div style={{ fontSize:40, marginBottom:12 }}>{isVideo?'📹':'🎤'}</div>
              <div style={{ fontFamily:'Fraunces', fontSize:18, fontWeight:600, color:'var(--text)', marginBottom:4 }}>
                {isIncoming ? `${callState.peerName} is calling…` : `Calling ${callState.peerName}…`}
              </div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>{isVideo?'Video':'Voice'} call</div>
            </div>
          )}

          {isActive && (
            <div style={{ textAlign:'center', marginBottom:16 }}>
              <div style={{ fontFamily:'Fraunces', fontSize:16, fontWeight:600, color:'var(--text)' }}>
                {callState.peerName}
              </div>
              {!isVideo && (
                <div style={{ fontFamily:'DM Mono', fontSize:13, color:'var(--muted)', marginTop:4 }}>
                  {fmt(callDuration)}
                </div>
              )}
            </div>
          )}

          {/* Controls */}
          <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
            {isIncoming && (
              <>
                <CallBtn color="var(--green)" onClick={accept} label="Accept">✓</CallBtn>
                <CallBtn color="var(--red)"   onClick={reject} label="Reject">✕</CallBtn>
              </>
            )}
            {isOutgoing && (
              <CallBtn color="var(--red)" onClick={endCall} label="Cancel">✕</CallBtn>
            )}
            {isActive && (
              <>
                <CallBtn color={micOn?'var(--bg2)':'var(--red)'} onClick={toggleMic} label={micOn?'Mute':'Unmute'} border>{micOn?'🎤':'🔇'}</CallBtn>
                {isVideo && <CallBtn color={camOn?'var(--bg2)':'var(--red)'} onClick={toggleCam} label={camOn?'Cam off':'Cam on'} border>{camOn?'📹':'📵'}</CallBtn>}
                {isVideo && <CallBtn color={screenOn?'var(--accent)':'var(--bg2)'} onClick={shareScreen} label={screenOn?'Stop share':'Share screen'} border>🖥</CallBtn>}
                <CallBtn color="var(--red)" onClick={endCall} label="End">📵</CallBtn>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CallBtn({ color, onClick, label, children, border }) {
  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:5 }}>
      <button onClick={onClick} style={{
        width:48,height:48,borderRadius:'50%',
        background:color, border:border?'1px solid var(--border)':'none',
        cursor:'pointer',fontSize:20,display:'flex',alignItems:'center',justifyContent:'center',
        transition:'all 0.2s', boxShadow:'0 2px 8px rgba(0,0,0,0.1)',
      }}>{children}</button>
      <span style={{ fontSize:10,color:'var(--muted)',fontFamily:'DM Mono' }}>{label}</span>
    </div>
  );
}
