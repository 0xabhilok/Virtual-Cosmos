import React, { useRef, useEffect } from 'react';
import * as PIXI from 'pixi.js';
import { useCosmosStore } from '../utils/store';
import { socket } from '../utils/socket';

const SPEED = 3;
const AVATAR_RADIUS = 22;
const PROXIMITY_RADIUS = 150;

function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

const emitMove = throttle((x, y) => socket.emit('move', { x, y }), 50);

function drawGrid(g, w, h) {
  g.clear();
  g.lineStyle(1, 0xffffff, 0.035);
  const step = 60;
  for (let x = 0; x <= w; x += step) { g.moveTo(x, 0); g.lineTo(x, h); }
  for (let y = 0; y <= h; y += step) { g.moveTo(0, y); g.lineTo(w, y); }
}

function parseColor(cssColor) {
  if (!cssColor) return 0x6ee7f7;
  if (cssColor.startsWith('#')) {
    return parseInt(cssColor.slice(1).padEnd(6, '0').slice(0, 6), 16);
  }
  // hsl: extract hue and approximate
  const hslMatch = cssColor.match(/hsl\((\d+)/);
  if (hslMatch) {
    const h = parseInt(hslMatch[1]) / 360;
    // Convert HSL (s=0.8, l=0.65) to approximate hex
    const s = 0.8, l = 0.65;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const r = Math.round(hue2rgb(p, q, h + 1/3) * 255);
    const g = Math.round(hue2rgb(p, q, h) * 255);
    const b = Math.round(hue2rgb(p, q, h - 1/3) * 255);
    return (r << 16) | (g << 8) | b;
  }
  return 0x6ee7f7;
}

function createAvatarContainer(user, isSelf = false) {
  const container = new PIXI.Container();
  container.sortableChildren = true;

  const colorHex = parseColor(user?.color);

  // Proximity detection ring (large, semi-transparent)
  const ring = new PIXI.Graphics();
  ring.name = 'ring';
  ring.lineStyle(1.5, colorHex, 0.35);
  ring.beginFill(colorHex, 0.04);
  ring.drawCircle(0, 0, PROXIMITY_RADIUS);
  ring.endFill();
  ring.visible = false;
  ring.zIndex = 0;
  container.addChild(ring);

  // Shadow
  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.25);
  shadow.drawEllipse(0, AVATAR_RADIUS + 3, AVATAR_RADIUS * 0.75, 4);
  shadow.endFill();
  shadow.zIndex = 1;
  container.addChild(shadow);

  // Outer glow (self only)
  if (isSelf) {
    const glow = new PIXI.Graphics();
    glow.beginFill(colorHex, 0.12);
    glow.drawCircle(0, 0, AVATAR_RADIUS + 10);
    glow.endFill();
    glow.zIndex = 2;
    container.addChild(glow);
  }

  // Main body
  const body = new PIXI.Graphics();
  body.zIndex = 3;
  body.lineStyle(isSelf ? 2.5 : 1.5, colorHex, isSelf ? 1 : 0.7);
  body.beginFill(colorHex, isSelf ? 0.9 : 0.75);
  body.drawCircle(0, 0, AVATAR_RADIUS);
  body.endFill();
  container.addChild(body);

  // Emoji
  const emoji = new PIXI.Text(user?.avatar || '🧑', { fontSize: 19, align: 'center' });
  emoji.anchor.set(0.5, 0.5);
  emoji.zIndex = 4;
  container.addChild(emoji);

  // "You" dot indicator
  if (isSelf) {
    const indicator = new PIXI.Graphics();
    indicator.beginFill(0x6ee7f7, 1);
    indicator.drawCircle(0, 0, 4);
    indicator.endFill();
    indicator.y = -(AVATAR_RADIUS + 9);
    indicator.zIndex = 5;
    container.addChild(indicator);
  }

  // Username label
  const label = new PIXI.Text(
    isSelf ? `${user?.username || 'You'} (you)` : (user?.username || 'User'),
    {
      fontFamily: 'DM Sans, sans-serif',
      fontSize: 11,
      fill: isSelf ? 0x6ee7f7 : 0xe8e8f0,
      align: 'center',
      fontWeight: isSelf ? '700' : '400',
      dropShadow: true,
      dropShadowColor: 0x000000,
      dropShadowDistance: 2,
      dropShadowAlpha: 0.8,
    }
  );
  label.name = 'label';
  label.anchor.set(0.5, 0);
  label.y = AVATAR_RADIUS + 5;
  label.zIndex = 5;
  container.addChild(label);

  return container;
}

export default function CosmosCanvas() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const worldRef = useRef(null);
  const selfContainerRef = useRef(null);
  const avatarsRef = useRef({});
  const keysRef = useRef({});
  const selfPosRef = useRef({ x: 500, y: 300 });
  const activeChatSocketId = useCosmosStore((s) => s.activeChatSocketId);

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new PIXI.Application({
      width: canvasRef.current.clientWidth,
      height: canvasRef.current.clientHeight,
      backgroundColor: 0x0a0a12,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    canvasRef.current.appendChild(app.view);
    appRef.current = app;

    // Grid
    const grid = new PIXI.Graphics();
    drawGrid(grid, app.screen.width, app.screen.height);
    app.stage.addChild(grid);

    // World container
    const world = new PIXI.Container();
    world.sortableChildren = true;
    app.stage.addChild(world);
    worldRef.current = world;

    // Init self avatar
    const storeState = useCosmosStore.getState();
    const selfData = storeState.self;
    if (selfData) {
      selfPosRef.current = { x: selfData.x, y: selfData.y };
    }
    const selfC = createAvatarContainer(selfData, true);
    selfC.x = selfPosRef.current.x;
    selfC.y = selfPosRef.current.y;
    world.addChild(selfC);
    selfContainerRef.current = selfC;

    // Init other users
    for (const [sid, user] of Object.entries(storeState.users)) {
      const c = createAvatarContainer(user, false);
      c.x = user.x; c.y = user.y;
      world.addChild(c);
      avatarsRef.current[sid] = c;
    }

    // Subscribe to store
    const unsub = useCosmosStore.subscribe((state) => {
      const world = worldRef.current;
      if (!world) return;

      // Add newly joined users
      for (const [sid, user] of Object.entries(state.users)) {
        if (!avatarsRef.current[sid]) {
          const c = createAvatarContainer(user, false);
          c.x = user.x; c.y = user.y;
          world.addChild(c);
          avatarsRef.current[sid] = c;
        }
      }
      // Remove disconnected users
      for (const sid of Object.keys(avatarsRef.current)) {
        if (!state.users[sid]) {
          try { world.removeChild(avatarsRef.current[sid]); avatarsRef.current[sid].destroy({ children: true }); } catch {}
          delete avatarsRef.current[sid];
        }
      }

      // Proximity rings + label colors
      const nearIds = new Set(state.nearbyUsers.map((u) => u.socketId));
      for (const [sid, c] of Object.entries(avatarsRef.current)) {
        const ring = c.getChildByName('ring');
        if (ring) ring.visible = nearIds.has(sid);
      }
    });

    // Show self proximity ring always
    const selfRing = selfC.getChildByName('ring');
    if (selfRing) selfRing.visible = true;

    // Keyboard
    const onKeyDown = (e) => {
      keysRef.current[e.key] = true;
      // Prevent page scroll
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Game loop
    app.ticker.add(() => {
      const keys = keysRef.current;
      let dx = 0, dy = 0;
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= SPEED;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += SPEED;
      if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= SPEED;
      if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += SPEED;
      // Normalize diagonal
      if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

      if (dx !== 0 || dy !== 0) {
        const W = app.screen.width;
        const H = app.screen.height;
        const newX = Math.max(AVATAR_RADIUS + 5, Math.min(W - AVATAR_RADIUS - 5, selfPosRef.current.x + dx));
        const newY = Math.max(AVATAR_RADIUS + 20, Math.min(H - AVATAR_RADIUS - 5, selfPosRef.current.y + dy));
        selfPosRef.current = { x: newX, y: newY };
        if (selfContainerRef.current) {
          selfContainerRef.current.x = newX;
          selfContainerRef.current.y = newY;
        }
        emitMove(newX, newY);
      }

      // Lerp remote avatars
      for (const [sid, user] of Object.entries(useCosmosStore.getState().users)) {
        const c = avatarsRef.current[sid];
        if (c) {
          c.x += (user.x - c.x) * 0.1;
          c.y += (user.y - c.y) * 0.1;
        }
      }
    });

    // Resize
    const onResize = () => {
      if (!canvasRef.current || !appRef.current) return;
      const w = canvasRef.current.clientWidth;
      const h = canvasRef.current.clientHeight;
      appRef.current.renderer.resize(w, h);
      drawGrid(grid, w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      unsub();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      try { app.destroy(true, { children: true }); } catch {}
      appRef.current = null;
    };
  }, []);

  return (
    <div
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 52, left: 0,
        right: activeChatSocketId ? 320 : 0,
        bottom: 0,
        overflow: 'hidden',
        transition: 'right 0.35s cubic-bezier(0.16,1,0.3,1)',
        cursor: 'none',
      }}
    />
  );
}
