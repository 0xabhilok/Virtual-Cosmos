import React, { useEffect } from 'react';
import { useCosmosStore } from './utils/store';
import { useSocket } from './hooks/useSocket';
import LobbyScreen from './components/LobbyScreen';
import CosmosCanvas from './components/CosmosCanvas';
import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import ProximityHUD from './components/ProximityHUD';
import ConnectionToast from './components/ConnectionToast';

function CosmosApp() {
  useSocket();

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <TopBar />
      <CosmosCanvas />
      <ChatPanel />
      <ProximityHUD />
      <ConnectionToast />

      {/* Corner watermark */}
      <div style={{
        position: 'fixed',
        bottom: 14,
        right: 14,
        fontSize: 10,
        color: 'var(--cosmos-border)',
        fontFamily: 'Space Mono',
        letterSpacing: '0.05em',
        zIndex: 10,
        pointerEvents: 'none',
      }}>
        VIRTUAL COSMOS v1.0
      </div>
    </div>
  );
}

export default function App() {
  const phase = useCosmosStore((s) => s.phase);

  return phase === 'lobby' ? <LobbyScreen /> : <CosmosApp />;
}
