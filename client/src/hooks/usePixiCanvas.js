import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useCosmosStore } from '../utils/store';
import { socket } from '../utils/socket';

const SPEED = 3;
const PROXIMITY_RADIUS = 150;
const AVATAR_RADIUS = 22;

// Throttle position emits
function throttle(fn, ms) {
  let last = 0;
  return (...args) => {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn(...args); }
  };
}

const emitMove = throttle((x, y) => socket.emit('move', { x, y }), 50);

export function usePixiCanvas(containerRef) {
  const appRef = useRef(null);
  const avatarsRef = useRef({}); // socketId → { container, label, ring }
  const selfContainerRef = useRef(null);
  const keysRef = useRef({});
  const selfPosRef = useRef({ x: 500, y: 300 });
  const tickerRef = useRef(null);

  const { self, users, nearbyUsers } = useCosmosStore.getState();

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: 0x0a0a12,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    containerRef.current.appendChild(app.view);
    appRef.current = app;

    // ── Grid background ──────────────────────────────────────────────────────
    const grid = new PIXI.Graphics();
    drawGrid(grid, app.screen.width, app.screen.height);
    app.stage.addChild(grid);

    // ── World container (for future camera pan) ──────────────────────────────
    const world = new PIXI.Container();
    app.stage.addChild(world);

    // ── Keyboard ─────────────────────────────────────────────────────────────
    const onKeyDown = (e) => { keysRef.current[e.key] = true; };
    const onKeyUp = (e) => { keysRef.current[e.key] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // ── Draw self ─────────────────────────────────────────────────────────────
    const storeState = useCosmosStore.getState();
    const selfData = storeState.self;
    if (selfData) {
      selfPosRef.current = { x: selfData.x, y: selfData.y };
    }

    const selfContainer = createAvatar(selfData || { username: 'You', color: '#6ee7f7', avatar: '🧑' }, true);
    selfContainer.x = selfPosRef.current.x;
    selfContainer.y = selfPosRef.current.y;
    world.addChild(selfContainer);
    selfContainerRef.current = selfContainer;

    // ── Draw other users ──────────────────────────────────────────────────────
    const initialUsers = useCosmosStore.getState().users;
    for (const [sid, user] of Object.entries(initialUsers)) {
      const container = createAvatar(user);
      container.x = user.x;
      container.y = user.y;
      world.addChild(container);
      avatarsRef.current[sid] = container;
    }

    // ── Subscribe to store changes ────────────────────────────────────────────
    const unsub = useCosmosStore.subscribe((state, prev) => {
      // New user joined
      for (const [sid, user] of Object.entries(state.users)) {
        if (!avatarsRef.current[sid]) {
          const container = createAvatar(user);
          container.x = user.x;
          container.y = user.y;
          world.addChild(container);
          avatarsRef.current[sid] = container;
        }
      }
      // User left
      for (const sid of Object.keys(avatarsRef.current)) {
        if (!state.users[sid]) {
          world.removeChild(avatarsRef.current[sid]);
          avatarsRef.current[sid].destroy({ children: true });
          delete avatarsRef.current[sid];
        }
      }
      // Update positions
      for (const [sid, user] of Object.entries(state.users)) {
        const c = avatarsRef.current[sid];
        if (c) {
          // Smooth lerp
          c.x += (user.x - c.x) * 0.12;
          c.y += (user.y - c.y) * 0.12;
        }
      }
      // Proximity rings
      const nearIds = new Set(state.nearbyUsers.map((u) => u.socketId));
      for (const [sid, c] of Object.entries(avatarsRef.current)) {
        const ring = c.getChildByName('ring');
        if (ring) ring.visible = nearIds.has(sid);
        const label = c.getChildByName('label');
        if (label) {
          label.style.fill = nearIds.has(sid) ? '#6ee7f7' : '#e8e8f0';
        }
      }
    });

    // ── Game loop ─────────────────────────────────────────────────────────────
    const ticker = app.ticker.add(() => {
      const keys = keysRef.current;
      let dx = 0, dy = 0;
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) dx -= SPEED;
      if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += SPEED;
      if (keys['ArrowUp'] || keys['w'] || keys['W']) dy -= SPEED;
      if (keys['ArrowDown'] || keys['s'] || keys['S']) dy += SPEED;

      if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }

      if (dx !== 0 || dy !== 0) {
        const newX = Math.max(AVATAR_RADIUS, Math.min(app.screen.width - AVATAR_RADIUS, selfPosRef.current.x + dx));
        const newY = Math.max(AVATAR_RADIUS, Math.min(app.screen.height - AVATAR_RADIUS, selfPosRef.current.y + dy));
        selfPosRef.current = { x: newX, y: newY };
        if (selfContainerRef.current) {
          selfContainerRef.current.x = newX;
          selfContainerRef.current.y = newY;
        }
        emitMove(newX, newY);
      }

      // Smooth remote positions
      for (const [sid, user] of Object.entries(useCosmosStore.getState().users)) {
        const c = avatarsRef.current[sid];
        if (c) {
          c.x += (user.x - c.x) * 0.1;
          c.y += (user.y - c.y) * 0.1;
        }
      }
    });

    tickerRef.current = ticker;

    // ── Resize handler ────────────────────────────────────────────────────────
    const onResize = () => {
      if (!containerRef.current) return;
      app.renderer.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      grid.clear();
      drawGrid(grid, app.screen.width, app.screen.height);
    };
    window.addEventListener('resize', onResize);

    return () => {
      unsub();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      app.destroy(true, { children: true });
      appRef.current = null;
    };
  }, []);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function drawGrid(g, w, h) {
  g.lineStyle(1, 0xffffff, 0.04);
  const step = 60;
  for (let x = 0; x < w; x += step) { g.moveTo(x, 0); g.lineTo(x, h); }
  for (let y = 0; y < h; y += step) { g.moveTo(0, y); g.lineTo(w, y); }
}

function hexColor(cssColor) {
  // Convert hsl() or #hex to PIXI-friendly hex number
  if (cssColor.startsWith('#')) {
    return parseInt(cssColor.replace('#', ''), 16);
  }
  // For hsl colors, draw with full string using PIXI Text style approach
  // We'll approximate with a fallback blue
  return 0x6ee7f7;
}

function createAvatar(user, isSelf = false) {
  const container = new PIXI.Container();
  container.sortableChildren = true;

  // Parse color
  const colorHex = user.color
    ? parseInt(user.color.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).padEnd(6, '0'), 16)
    : 0x6ee7f7;

  // ── Proximity ring (animated via CSS, here we use a semi-transparent circle) ──
  const ring = new PIXI.Graphics();
  ring.name = 'ring';
  ring.lineStyle(2, colorHex, 0.5);
  ring.drawCircle(0, 0, 150);
  ring.visible = false;
  ring.zIndex = 0;
  container.addChild(ring);

  // ── Shadow ──────────────────────────────────────────────────────────────────
  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.3);
  shadow.drawEllipse(0, AVATAR_RADIUS + 4, AVATAR_RADIUS * 0.8, 5);
  shadow.endFill();
  shadow.zIndex = 1;
  container.addChild(shadow);

  // ── Body circle ──────────────────────────────────────────────────────────────
  const body = new PIXI.Graphics();
  body.zIndex = 2;
  if (isSelf) {
    // Self: glowing border
    body.lineStyle(3, 0x6ee7f7, 1);
    body.beginFill(colorHex, 0.9);
  } else {
    body.lineStyle(2, colorHex, 0.6);
    body.beginFill(colorHex, 0.75);
  }
  body.drawCircle(0, 0, AVATAR_RADIUS);
  body.endFill();
  container.addChild(body);

  // ── Emoji / Avatar ──────────────────────────────────────────────────────────
  const emojiText = new PIXI.Text(user.avatar || '🧑', {
    fontSize: 20,
    align: 'center',
  });
  emojiText.anchor.set(0.5);
  emojiText.zIndex = 3;
  container.addChild(emojiText);

  // ── Self indicator ──────────────────────────────────────────────────────────
  if (isSelf) {
    const dot = new PIXI.Graphics();
    dot.beginFill(0x6ee7f7, 1);
    dot.drawCircle(0, 0, 5);
    dot.endFill();
    dot.y = -AVATAR_RADIUS - 8;
    dot.zIndex = 4;
    container.addChild(dot);
  }

  // ── Username label ──────────────────────────────────────────────────────────
  const label = new PIXI.Text(
    isSelf ? `${user.username} (you)` : user.username,
    {
      fontFamily: 'DM Sans',
      fontSize: 12,
      fill: isSelf ? '#6ee7f7' : '#e8e8f0',
      align: 'center',
      fontWeight: isSelf ? '600' : '400',
    }
  );
  label.name = 'label';
  label.anchor.set(0.5, 0);
  label.y = AVATAR_RADIUS + 6;
  label.zIndex = 4;
  container.addChild(label);

  return container;
}
