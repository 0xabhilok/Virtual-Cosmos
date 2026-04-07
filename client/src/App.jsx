import React from 'react';
import { useCosmosStore } from './utils/store';
import { useSocket } from './hooks/useSocket';
import LobbyScreen from './components/LobbyScreen';
import CosmosCanvas from './components/CosmosCanvas';
import TopBar from './components/TopBar';
import ChatPanel from './components/ChatPanel';
import ProximityHUD from './components/ProximityHUD';
import ConnectionToast from './components/ConnectionToast';
import FriendsPanel from './components/FriendsPanel';
import CallModal from './components/modals/CallModal';

function CosmosApp() {
  useSocket();
  return (
    <div style={{ width:'100%',height:'100%',position:'relative' }}>
      <TopBar />
      <CosmosCanvas />
      <ChatPanel />
      <FriendsPanel />
      <ProximityHUD />
      <ConnectionToast />
      <CallModal />
      <div style={{ position:'fixed',bottom:8,right:8,fontSize:9,color:'var(--border)',fontFamily:'DM Mono',pointerEvents:'none',zIndex:10 }}>
        VIRTUAL COSMOS v2.0
      </div>
    </div>
  );
}

export default function App() {
  const phase = useCosmosStore(s => s.phase);
  return phase==='lobby' ? <LobbyScreen /> : <CosmosApp />;
}
