import React, { useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';
import { useCosmosStore } from '../utils/store';
import { socket } from '../utils/socket';

function throttle(fn, ms) { let t=0; return (...a) => { const n=Date.now(); if(n-t>=ms){t=n;fn(...a);} }; }
const emitMove = throttle((x,y,walking) => socket.emit('move',{x,y,walking}), 48);

const AVATAR_R = 20;
const PROXIMITY_R = 150;

// ── Parse color helper ────────────────────────────────────────────────────────
function toHex(css) {
  if (!css) return 0xc17a3a;
  if (css.startsWith('#')) return parseInt(css.slice(1).padEnd(6,'0').slice(0,6), 16);
  const m = css.match(/hsl\((\d+)/);
  if (m) {
    const h=parseInt(m[1])/360, s=0.7, l=0.55;
    const q = l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
    const hue2=(p,q,t)=>{if(t<0)t+=1;if(t>1)t-=1;if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;};
    return (Math.round(hue2(p,q,h+1/3)*255)<<16)|(Math.round(hue2(p,q,h)*255)<<8)|Math.round(hue2(p,q,h-1/3)*255);
  }
  return 0xc17a3a;
}

// ── Draw Among-Us style character ────────────────────────────────────────────
function drawAmongUs(g, color, facing='right') {
  g.clear();
  const c = color;
  const dark = darken(c, 0.25);

  // body
  g.beginFill(c); g.drawRoundedRect(-13, -4, 26, 20, 8); g.endFill();
  // head
  g.beginFill(c); g.drawEllipse(0, -16, 13, 12); g.endFill();
  // visor
  g.beginFill(0xaaddff, 0.85);
  if (facing === 'right') g.drawRoundedRect(1, -22, 10, 9, 3);
  else g.drawRoundedRect(-11, -22, 10, 9, 3);
  g.endFill();
  // backpack
  g.beginFill(dark); g.drawRoundedRect(facing==='right'?-17:-3, 0, 8, 14, 4); g.endFill();
  // bottom crease
  g.beginFill(dark); g.drawRoundedRect(-11, 13, 9, 5, 2); g.endFill();
  g.beginFill(dark); g.drawRoundedRect(2, 13, 9, 5, 2); g.endFill();
}

function darken(hex, amt) {
  const r=Math.max(0,((hex>>16)&0xff)-Math.round(((hex>>16)&0xff)*amt));
  const g=Math.max(0,((hex>>8)&0xff)-Math.round(((hex>>8)&0xff)*amt));
  const b=Math.max(0,(hex&0xff)-Math.round((hex&0xff)*amt));
  return (r<<16)|(g<<8)|b;
}

// ── Leg animation state ───────────────────────────────────────────────────────
// Each avatar has a walkPhase [0..1]
const walkPhases = {};

function createCharContainer(user, isSelf) {
  const container = new PIXI.Container();
  container.sortableChildren = true;

  const color = toHex(user?.color);

  // Proximity ring
  const ring = new PIXI.Graphics();
  ring.name = 'ring';
  ring.lineStyle(1.5, color, 0.3);
  ring.beginFill(color, 0.05);
  ring.drawCircle(0, 0, PROXIMITY_R);
  ring.endFill();
  ring.visible = false;
  ring.zIndex = 0;
  container.addChild(ring);

  // Self ring always visible
  if (isSelf) { ring.visible = true; }

  // Legs (two PIXI.Graphics, animated)
  const legL = new PIXI.Graphics(); legL.name='legL'; legL.zIndex=1;
  const legR = new PIXI.Graphics(); legR.name='legR'; legR.zIndex=1;
  drawLeg(legL, color, false);
  drawLeg(legR, color, false);
  legL.x = -6; legL.y = 14; legL.pivot.set(0, 0);
  legR.x =  6; legR.y = 14; legR.pivot.set(0, 0);
  container.addChild(legL);
  container.addChild(legR);

  // Among-Us body
  const body = new PIXI.Graphics();
  body.name = 'body'; body.zIndex = 2;
  drawAmongUs(body, color, 'right');
  container.addChild(body);

  // Self indicator dot
  if (isSelf) {
    const dot = new PIXI.Graphics();
    dot.beginFill(0x3a6fb5);
    dot.drawCircle(0, 0, 4);
    dot.endFill();
    dot.y = -34; dot.zIndex = 5;
    container.addChild(dot);
  }

  // Recording badge
  const recBadge = new PIXI.Text('⏺', { fontSize:12 });
  recBadge.name='recBadge'; recBadge.zIndex=6; recBadge.visible=false;
  recBadge.anchor.set(0.5);
  recBadge.y = -36;
  container.addChild(recBadge);

  // Name label
  const label = new PIXI.Text(
    isSelf ? `${user?.displayName||'You'} (you)` : (user?.displayName||'?'),
    { fontFamily:'DM Sans', fontSize:11, fill: isSelf ? 0x3a6fb5 : 0x1a1612,
      fontWeight: isSelf?'700':'400',
      dropShadow:true, dropShadowColor:0xffffff, dropShadowDistance:1, dropShadowAlpha:0.8 }
  );
  label.name='label'; label.anchor.set(0.5,0); label.y=18; label.zIndex=5;
  container.addChild(label);

  // Emote bubble
  const emoteBubble = new PIXI.Text('', { fontSize:22 });
  emoteBubble.name='emote'; emoteBubble.anchor.set(0.5,1);
  emoteBubble.y=-30; emoteBubble.zIndex=7; emoteBubble.visible=false;
  container.addChild(emoteBubble);

  // PermId label (tiny, below name)
  if (!isSelf) {
    const pid = new PIXI.Text(user?.permId||'', { fontFamily:'DM Mono', fontSize:8, fill:0x9a9080 });
    pid.name='permId'; pid.anchor.set(0.5,0); pid.y=30; pid.zIndex=4;
    container.addChild(pid);
  }

  return container;
}

function drawLeg(g, color, bent) {
  g.clear();
  const c = darken(color, 0.18);
  g.beginFill(c);
  if (bent) g.drawRoundedRect(-3, 0, 6, 10, 3);
  else g.drawRoundedRect(-3, 0, 6, 12, 3);
  g.endFill();
}

function drawGrid(g, w, h) {
  g.clear();
  g.lineStyle(1, 0xd0c8b8, 0.6);
  const step = 60;
  for (let x=0; x<=w; x+=step) { g.moveTo(x,0); g.lineTo(x,h); }
  for (let y=0; y<=h; y+=step) { g.moveTo(0,y); g.lineTo(w,y); }
}

export default function CosmosCanvas() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const worldRef = useRef(null);
  const selfContainerRef = useRef(null);
  const avatarsRef = useRef({});
  const keysRef = useRef({});
  const selfPosRef = useRef({ x:500, y:300 });
  const facingRef = useRef('right');
  const walkFrameRef = useRef(0);

  const activeChatSocketId = useCosmosStore(s => s.activeChatSocketId);

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application({
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
      backgroundColor: 0xede8df,
      antialias: true,
      resolution: window.devicePixelRatio||1,
      autoDensity: true,
    });
    canvasRef.current.appendChild(app.view);
    appRef.current = app;

    const grid = new PIXI.Graphics();
    drawGrid(grid, app.screen.width, app.screen.height);
    app.stage.addChild(grid);

    const world = new PIXI.Container();
    world.sortableChildren = true;
    app.stage.addChild(world);
    worldRef.current = world;

    // Self
    const st = useCosmosStore.getState();
    const selfData = st.self;
    selfPosRef.current = { x: selfData?.x||500, y: selfData?.y||300 };
    const selfC = createCharContainer(selfData, true);
    selfC.x = selfPosRef.current.x;
    selfC.y = selfPosRef.current.y;
    world.addChild(selfC);
    selfContainerRef.current = selfC;

    // Other users
    for (const [sid, u] of Object.entries(st.users)) {
      const c = createCharContainer(u, false);
      c.x=u.x; c.y=u.y;
      world.addChild(c);
      avatarsRef.current[sid] = c;
    }

    // Store subscription
    const unsub = useCosmosStore.subscribe(state => {
      if (!worldRef.current) return;
      // add new
      for (const [sid,u] of Object.entries(state.users)) {
        if (!avatarsRef.current[sid]) {
          const c = createCharContainer(u, false);
          c.x=u.x; c.y=u.y;
          worldRef.current.addChild(c);
          avatarsRef.current[sid] = c;
        }
      }
      // remove left
      for (const sid of Object.keys(avatarsRef.current)) {
        if (!state.users[sid]) {
          try { worldRef.current.removeChild(avatarsRef.current[sid]); avatarsRef.current[sid].destroy({children:true}); } catch {}
          delete avatarsRef.current[sid];
        }
      }
      // update labels (rename)
      for (const [sid,u] of Object.entries(state.users)) {
        const c = avatarsRef.current[sid];
        if (!c) continue;
        const lbl = c.getChildByName('label');
        if (lbl && lbl.text !== (u.displayName||u.username)) lbl.text = u.displayName||u.username;
        // emote
        const eb = c.getChildByName('emote');
        if (eb) {
          if (u.emote) { eb.text=u.emote; eb.visible=true; } 
          else eb.visible=false;
        }
        // recording badge
        const rec = c.getChildByName('recBadge');
        if (rec) rec.visible = !!state.nearbyUsers.find(n=>n.socketId===sid)?.isRecording;
      }
      // proximity rings
      const nearIds = new Set(state.nearbyUsers.map(u=>u.socketId));
      for (const [sid,c] of Object.entries(avatarsRef.current)) {
        const ring = c.getChildByName('ring');
        if (ring) ring.visible = nearIds.has(sid);
      }
      // self recording
      const selfRecBadge = selfContainerRef.current?.getChildByName('recBadge');
      if (selfRecBadge) selfRecBadge.visible = state.recordingActive;
    });

    // Keyboard
    const onKeyDown = e => {
      // Block movement keys if focused on input/textarea
      const tag = document.activeElement?.tagName;
      if (tag==='INPUT'||tag==='TEXTAREA') return;
      keysRef.current[e.key] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    };
    const onKeyUp = e => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Game loop
    app.ticker.add(delta => {
      const keys = keysRef.current;
      const tag = document.activeElement?.tagName;
      const chatOpen = tag==='INPUT'||tag==='TEXTAREA';

      let dx=0, dy=0;
      if (!chatOpen) {
        const spd = useCosmosStore.getState().selfSpeed||3;
        if (keys['ArrowLeft']||keys['a']||keys['A']) { dx-=spd; facingRef.current='left'; }
        if (keys['ArrowRight']||keys['d']||keys['D']) { dx+=spd; facingRef.current='right'; }
        if (keys['ArrowUp']||keys['w']||keys['W']) dy-=spd;
        if (keys['ArrowDown']||keys['s']||keys['S']) dy+=spd;
        if (dx&&dy) { dx*=0.7071; dy*=0.7071; }
      }

      const walking = (dx!==0||dy!==0);

      if (walking) {
        const W=app.screen.width, H=app.screen.height;
        selfPosRef.current.x = Math.max(20, Math.min(W-20, selfPosRef.current.x+dx));
        selfPosRef.current.y = Math.max(40, Math.min(H-20, selfPosRef.current.y+dy));
        const sc = selfContainerRef.current;
        if (sc) { sc.x=selfPosRef.current.x; sc.y=selfPosRef.current.y; }

        // Facing
        const selfBody = selfContainerRef.current?.getChildByName('body');
        if (selfBody) drawAmongUs(selfBody, toHex(useCosmosStore.getState().self?.color), facingRef.current);

        emitMove(selfPosRef.current.x, selfPosRef.current.y, true);
      } else {
        // stationary — no emit needed
      }

      // Walk animation for self
      const sc = selfContainerRef.current;
      if (sc) {
        const legL = sc.getChildByName('legL');
        const legR = sc.getChildByName('legR');
        if (legL && legR) {
          if (walking) {
            walkFrameRef.current = (walkFrameRef.current + delta*0.18) % (Math.PI*2);
            legL.rotation = Math.sin(walkFrameRef.current) * 0.45;
            legR.rotation = Math.sin(walkFrameRef.current + Math.PI) * 0.45;
          } else {
            legL.rotation *= 0.8;
            legR.rotation *= 0.8;
          }
        }
      }

      // Remote avatar lerp + walk anim
      for (const [sid,u] of Object.entries(useCosmosStore.getState().users)) {
        const c = avatarsRef.current[sid];
        if (!c) continue;
        const prevX = c.x, prevY = c.y;
        c.x += (u.x - c.x)*0.12;
        c.y += (u.y - c.y)*0.12;
        const isWalking = u.walking || (Math.abs(u.x-prevX)>0.5||Math.abs(u.y-prevY)>0.5);

        if (!walkPhases[sid]) walkPhases[sid] = 0;
        const legL = c.getChildByName('legL');
        const legR = c.getChildByName('legR');
        if (legL && legR) {
          if (isWalking) {
            walkPhases[sid] = (walkPhases[sid] + delta*0.18) % (Math.PI*2);
            legL.rotation = Math.sin(walkPhases[sid]) * 0.45;
            legR.rotation = Math.sin(walkPhases[sid]+Math.PI) * 0.45;
            // facing
            const body = c.getChildByName('body');
            if (body) drawAmongUs(body, toHex(u.color), c.x > prevX+0.1 ? 'right' : c.x < prevX-0.1 ? 'left' : 'right');
          } else {
            legL.rotation *= 0.8;
            legR.rotation *= 0.8;
          }
        }
      }
    });

    const onResize = () => {
      if (!canvasRef.current||!appRef.current) return;
      const w=canvasRef.current.clientWidth, h=canvasRef.current.clientHeight;
      appRef.current.renderer.resize(w,h);
      drawGrid(grid,w,h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      unsub();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      try { app.destroy(true,{children:true}); } catch {}
      appRef.current = null;
    };
  }, []);

  return (
    <div ref={canvasRef} style={{
      position:'fixed', top:52, left:0,
      right: activeChatSocketId ? 340 : 0,
      bottom:0, overflow:'hidden', cursor:'default',
      transition:'right 0.3s cubic-bezier(0.16,1,0.3,1)',
    }} />
  );
}
