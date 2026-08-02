import { useEffect, useRef } from 'react';

/**
 * Generative flow-field background: many closely spaced, smoothly curving white
 * streamlines that all follow ONE shared global vector field (layered Perlin
 * noise). The look is fingerprint / topographic contour abstraction — crisp
 * graphic linework, not fibers, nodes, particles, or glow.
 *
 * Streamlines are placed by even-spacing integration (Jobard–Lefebvre style):
 * candidate seeds on a world grid are integrated through the field in both
 * directions with RK2 steps, and a separation test against a spatial hash keeps
 * neighbouring lines an even ~11–14px apart. Geometry lives in WORLD space and
 * is cached for a vertical band, so scrolling just re-blits with a translate;
 * the band is only recomputed when the viewport nears its edges. The pointer
 * gently parts the lines and brightens the ones it passes near.
 */

const FLOW = {
  separation: 12, // target world px between neighbouring streamlines
  step: 8, // world px per integration step
  maxSteps: 210, // per direction
  minPoints: 7, // discard stubs shorter than this
  maxLines: 720, // safety cap per band
  bandMargin: 0.7, // extra world height above+below viewport (× viewport height)
  recomputeMargin: 0.28, // recompute when the viewport comes within this of a band edge
  sidePad: 60, // world px integrated beyond left/right edges
  // Field frequencies (see getFieldAngle)
  broadFreq: 0.0014,
  detailFreq: 0.0035,
  // Opacity tiers — clustered into "formations" by a low-frequency noise.
  primaryOpacity: 0.5,
  secondaryOpacity: 0.3,
  quietOpacity: 0.12,
  interactiveOpacity: 0.82,
  primaryWidth: 1.15,
  secondaryWidth: 1.0,
  quietWidth: 0.85,
  influenceRadius: 150,
  maxDisplacement: 16,
} as const;

const BASE_SEED = 18427;

function seededRandom(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic 2D Perlin gradient noise in ~[-1, 1]; smooth and infinite. */
function makePerlin(seed: number) {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i += 1) p[i] = i;
  const rand = seededRandom(seed);
  for (let i = 255; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i += 1) perm[i] = p[i & 255];

  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + t * (b - a);
  function grad(h: number, x: number, y: number) {
    switch (h & 7) {
      case 0: return x + y;
      case 1: return -x + y;
      case 2: return x - y;
      case 3: return -x - y;
      case 4: return x;
      case 5: return -x;
      case 6: return y;
      default: return -y;
    }
  }

  return function noise2(x: number, y: number) {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const X = xi & 255;
    const Y = yi & 255;
    const xf = x - xi;
    const yf = y - yi;
    const u = fade(xf);
    const v = fade(yf);
    const aa = perm[perm[X] + Y];
    const ab = perm[perm[X] + Y + 1];
    const ba = perm[perm[X + 1] + Y];
    const bb = perm[perm[X + 1] + Y + 1];
    const x1 = lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u);
    const x2 = lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u);
    return lerp(x1, x2, v);
  };
}

interface FlowLine {
  pts: number[]; // flat world coords [x0,y0,x1,y1,...]
  op: number; // base tier opacity
  w: number; // line width
  dash: [number, number] | null;
}

export function InteractiveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const noise = makePerlin(BASE_SEED);

    let width = window.innerWidth;
    let height = window.innerHeight;
    let scrollY = window.scrollY;

    let frameId = 0;
    let frameRequested = false;
    let pageVisible = !document.hidden;
    let dirty = true;

    // Cached band geometry (world space).
    let lines: FlowLine[] = [];
    let bandTop = 0;
    let bandBottom = 0;

    const pointer = { x: -9999, y: -9999, active: false };
    const smooth = { x: -9999, y: -9999 };

    /** Line orientation at a world coordinate — the one shared global field. */
    function getFieldAngle(x: number, y: number) {
      const broad = noise(x * FLOW.broadFreq, y * FLOW.broadFreq);
      const detail = noise(x * FLOW.detailFreq + 200, y * FLOW.detailFreq + 200);
      return broad * Math.PI * 2.3 + detail * Math.PI * 0.35;
    }

    // ---- Even-spacing spatial hash (cell = separation) ----
    const cell = FLOW.separation;
    let grid = new Map<number, number[]>(); // cellKey → flat [x,y,...] of registered points
    const keyOf = (gx: number, gy: number) => gx * 73856093 + gy * 19349663;

    function tooClose(x: number, y: number, minDist: number) {
      const gx = Math.floor(x / cell);
      const gy = Math.floor(y / cell);
      const min2 = minDist * minDist;
      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oy = -1; oy <= 1; oy += 1) {
          const arr = grid.get(keyOf(gx + ox, gy + oy));
          if (!arr) continue;
          for (let i = 0; i < arr.length; i += 2) {
            const dx = arr[i] - x;
            const dy = arr[i + 1] - y;
            if (dx * dx + dy * dy < min2) return true;
          }
        }
      }
      return false;
    }
    function register(x: number, y: number) {
      const k = keyOf(Math.floor(x / cell), Math.floor(y / cell));
      let arr = grid.get(k);
      if (!arr) {
        arr = [];
        grid.set(k, arr);
      }
      arr.push(x, y);
    }

    /** Integrate one half of a streamline from (x,y); orientation-aligned so it never backtracks. */
    function trace(x: number, y: number, sign: number, out: number[], sepStop: number) {
      let cx = x;
      let cy = y;
      let pdx: number | null = null;
      let pdy = 0;
      for (let s = 0; s < FLOW.maxSteps; s += 1) {
        const a = getFieldAngle(cx, cy);
        let dx = Math.cos(a);
        let dy = Math.sin(a);
        if (pdx === null) {
          if (sign < 0) { dx = -dx; dy = -dy; }
        } else if (dx * pdx + dy * pdy < 0) {
          dx = -dx; dy = -dy;
        }
        // RK2 midpoint
        const mx = cx + dx * FLOW.step * 0.5;
        const my = cy + dy * FLOW.step * 0.5;
        const a2 = getFieldAngle(mx, my);
        let dx2 = Math.cos(a2);
        let dy2 = Math.sin(a2);
        if (dx2 * dx + dy2 * dy < 0) { dx2 = -dx2; dy2 = -dy2; }
        const nx = cx + dx2 * FLOW.step;
        const ny = cy + dy2 * FLOW.step;

        if (ny < bandTop - FLOW.step || ny > bandBottom + FLOW.step || nx < -FLOW.sidePad || nx > width + FLOW.sidePad) break;
        if (tooClose(nx, ny, sepStop)) break;

        out.push(nx, ny);
        pdx = dx2;
        pdy = dy2;
        cx = nx;
        cy = ny;
      }
    }

    function computeBand() {
      const bm = FLOW.bandMargin * height;
      bandTop = scrollY - bm;
      bandBottom = scrollY + height + bm;
      grid = new Map();
      lines = [];

      const sepStop = FLOW.separation * 0.82;
      const seedStep = FLOW.separation;
      const gx0 = Math.floor(-FLOW.sidePad / seedStep);
      const gx1 = Math.ceil((width + FLOW.sidePad) / seedStep);
      const gy0 = Math.floor(bandTop / seedStep);
      const gy1 = Math.ceil(bandBottom / seedStep);

      for (let gy = gy0; gy <= gy1 && lines.length < FLOW.maxLines; gy += 1) {
        for (let gx = gx0; gx <= gx1 && lines.length < FLOW.maxLines; gx += 1) {
          const jr = seededRandom(BASE_SEED + gx * 92821 + gy * 53987);
          const sx = (gx + 0.15 + jr() * 0.7) * seedStep;
          const sy = (gy + 0.15 + jr() * 0.7) * seedStep;
          if (tooClose(sx, sy, FLOW.separation * 0.9)) continue;

          const fwd: number[] = [];
          const bwd: number[] = [];
          trace(sx, sy, +1, fwd, sepStop);
          trace(sx, sy, -1, bwd, sepStop);

          const pts: number[] = [];
          for (let i = bwd.length - 2; i >= 0; i -= 2) pts.push(bwd[i], bwd[i + 1]);
          pts.push(sx, sy);
          for (let i = 0; i < fwd.length; i += 2) pts.push(fwd[i], fwd[i + 1]);

          if (pts.length < FLOW.minPoints * 2) continue;

          // Register this line so later lines keep their distance.
          for (let i = 0; i < pts.length; i += 2) register(pts[i], pts[i + 1]);

          // Tier by a low-frequency field so bright/quiet lines cluster into formations.
          const mid = (pts.length >> 2) * 2;
          const cluster = noise(pts[mid] * 0.0011 + 70, pts[mid + 1] * 0.0011 + 70);
          let op: number = FLOW.quietOpacity;
          let w: number = FLOW.quietWidth;
          if (cluster > 0.34) { op = FLOW.primaryOpacity; w = FLOW.primaryWidth; }
          else if (cluster > -0.12) { op = FLOW.secondaryOpacity; w = FLOW.secondaryWidth; }

          // Some lines are broken into rounded dashes (interrupted segments).
          const dash: [number, number] | null = jr() < 0.34 ? [12 + jr() * 16, 6 + jr() * 7] : null;

          lines.push({ pts, op, w, dash });
        }
      }
      dirty = false;
    }

    function ensureBand() {
      const rm = FLOW.recomputeMargin * height;
      if (dirty || scrollY - rm < bandTop || scrollY + height + rm > bandBottom) {
        computeBand();
      }
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = width < 768 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas!.width = Math.round(width * dpr);
      canvas!.height = Math.round(height * dpr);
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.lineCap = 'round';
      ctx!.lineJoin = 'round';
      dirty = true;
      requestFrame();
    }

    function requestFrame() {
      if (!pageVisible || frameRequested) return;
      frameRequested = true;
      frameId = window.requestAnimationFrame(render);
    }

    function render() {
      frameRequested = false;

      let settling = false;
      if (pointer.active && !reduced) {
        smooth.x += (pointer.x - smooth.x) * 0.16;
        smooth.y += (pointer.y - smooth.y) * 0.16;
        if (Math.hypot(pointer.x - smooth.x, pointer.y - smooth.y) > 0.5) settling = true;
      }

      ensureBand();
      ctx!.clearRect(0, 0, width, height);

      const warp = pointer.active && !reduced;
      const R = FLOW.influenceRadius;
      const topClip = -40;
      const botClip = height + 40;

      for (const line of lines) {
        const pts = line.pts;
        let maxInfl = 0;
        ctx!.beginPath();
        let started = false;
        let anyVisible = false;

        for (let i = 0; i < pts.length; i += 2) {
          let sx = pts[i];
          let sy = pts[i + 1] - scrollY;

          if (warp) {
            const dx = sx - smooth.x;
            const dy = sy - smooth.y;
            const d = Math.hypot(dx, dy);
            if (d < R && d > 0.001) {
              const infl = 1 - d / R;
              if (infl > maxInfl) maxInfl = infl;
              const push = infl * infl * FLOW.maxDisplacement;
              sx += (dx / d) * push;
              sy += (dy / d) * push;
            }
          }

          if (sy > topClip && sy < botClip) anyVisible = true;
          if (!started) {
            ctx!.moveTo(sx, sy);
            started = true;
          } else {
            ctx!.lineTo(sx, sy);
          }
        }

        if (!anyVisible) continue;

        const op = line.op + (FLOW.interactiveOpacity - line.op) * (maxInfl * maxInfl);
        ctx!.strokeStyle = `rgba(255,255,255,${op})`;
        ctx!.lineWidth = line.w + maxInfl * 0.25;
        if (line.dash) ctx!.setLineDash(line.dash);
        ctx!.stroke();
        if (line.dash) ctx!.setLineDash([]);
      }

      if (settling) requestFrame();
    }

    function onScroll() {
      scrollY = window.scrollY;
      requestFrame();
    }
    function onMove(e: PointerEvent) {
      const target = e.target as HTMLElement | null;
      const overControl = target?.closest("button, a, input, textarea, select, [role='button']");
      if (!pointer.active) {
        smooth.x = e.clientX;
        smooth.y = e.clientY;
      }
      pointer.active = !overControl;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      requestFrame();
    }
    function onLeave() {
      pointer.active = false;
      requestFrame();
    }
    function onVisibility() {
      pageVisible = !document.hidden;
      if (!pageVisible) {
        window.cancelAnimationFrame(frameId);
        frameRequested = false;
        return;
      }
      scrollY = window.scrollY;
      requestFrame();
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('resize', resize, { passive: true });

    resize();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('resize', resize);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'fixed', top: 0, left: 0, zIndex: 0, pointerEvents: 'none', display: 'block' }}
    />
  );
}

/** Custom ring+dot cursor for fine pointers only; falls back to the system cursor everywhere else. */
export function CustomCursor() {
  const ringRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches || reduced.matches) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    if (!ring || !dot) return;

    const target = { x: -300, y: -300 };
    const disp = { x: -300, y: -300 };
    let visible = false;
    let overLink = false;
    let overText = false;
    let clicking = false;
    let afId = 0;

    const styleEl = document.createElement('style');
    styleEl.textContent = `
      * { cursor: none !important; }
      textarea, input, [contenteditable] { cursor: text !important; }
    `;
    document.head.appendChild(styleEl);

    function frame() {
      disp.x += (target.x - disp.x) * 0.16;
      disp.y += (target.y - disp.y) * 0.16;

      ring!.style.transform = `translate(${disp.x}px,${disp.y}px) translate(-50%,-50%)`;
      dot!.style.transform = `translate(${target.x}px,${target.y}px) translate(-50%,-50%)`;

      const sz = clicking ? 19 : overLink ? 40 : 26;
      ring!.style.width = `${sz}px`;
      ring!.style.height = `${sz}px`;
      ring!.style.background = overLink ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)';

      const show = visible && !overText;
      ring!.style.opacity = show ? (overLink ? '0.95' : '0.85') : '0';
      dot!.style.opacity = visible ? '1' : '0';

      afId = requestAnimationFrame(frame);
    }

    function onMove(e: PointerEvent) {
      target.x = e.clientX;
      target.y = e.clientY;
      visible = true;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      overLink = !!el?.closest('button,a,[role="button"]');
      overText = !!el?.closest('textarea,input,[contenteditable]');
    }
    function onLeave() {
      visible = false;
    }
    function onDown() {
      clicking = true;
    }
    function onUp() {
      clicking = false;
    }
    function onVisibility() {
      if (document.hidden) visible = false;
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('visibilitychange', onVisibility);
    afId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(afId);
      styleEl.remove();
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 110, pointerEvents: 'none',
          width: '26px', height: '26px',
          border: '1.5px solid rgba(255,255,255,0.92)',
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          boxShadow: '0 0 14px rgba(255,255,255,0.20)',
          opacity: 0,
          transition: 'width 100ms ease, height 100ms ease, background 120ms ease, opacity 120ms ease',
        }}
      />
      <div
        ref={dotRef}
        aria-hidden="true"
        style={{
          position: 'fixed', top: 0, left: 0, zIndex: 111, pointerEvents: 'none',
          width: '4px', height: '4px', borderRadius: '50%',
          background: '#ffffff',
          opacity: 0,
          transition: 'opacity 120ms ease',
        }}
      />
    </>
  );
}

/** Convenience wrapper mounting both the flow field and the custom cursor together. */
export function InteractiveField() {
  return (
    <>
      <InteractiveCanvas />
      <CustomCursor />
    </>
  );
}
