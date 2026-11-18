import { type CSSProperties, useEffect, useId, useRef, useState } from "react";
import { type Cell, spawnCells, stepCells } from "./cells";

// Two-tone cell palette: ink + sky blue. Each sprite fills with currentColor, so
// one path yields any number of colors.
const DEFAULT_PALETTE = ["#231e1e", "#D7E7F5"];

// Base footprint of one cell (px). Natural ratio is 466:309 ≈ 1.5. Every cell
// renders at this size × the field's sizeScale — no per-cell size variance, so
// the whole swarm reads as one consistent scale (per the designer note).
const CELL_W = 46;
const CELL_H = 31;

// Cells turn to face their travel direction. atan2(vy,vx) measures motion from
// the +x axis; the 90° offset aims a pointy-top hexagon along it.
const ROT_OFFSET = 90;
// Below this speed (px/s) we hold the last facing rather than snapping to a
// meaningless angle when a cell is nearly stationary.
const ROT_MIN_SPEED = 6;
const INTRO_MS = 1050;
const TAU = Math.PI * 2;

// One compound path (outer hexagon minus inner cell) renders each sprite
// without an SVG mask, which Safari struggles to animate at this count.
const CELL_SPRITE_PATH = [
  "M233 4.5 L362.9 79.5 L362.9 229.5 L233 304.5 L103.1 229.5 L103.1 79.5 Z",
  "M233 58.5 L316.1 106.5 L316.1 202.5 L233 250.5 L149.9 202.5 L149.9 106.5 Z",
].join(" ");

// Deterministic per-index tint so SSR and client agree (no Math.random). The
// sine-hash seed is independent of the cell's position seed (R2 in cells.ts) so
// same-color cells don't line up into diagonal streaks. Rotation and size are no
// longer per-cell (velocity-driven rotation + uniform size), so this is tint-only.
const hash = (i: number, seed: number) => {
  const v = Math.sin((i + 1) * seed) * 43758.5453;
  return v - Math.floor(v); // fractional part → [0, 1)
};
function tintOf(i: number, paletteLen: number) {
  return Math.floor(hash(i, 12.9898) * paletteLen);
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

export function CellField({
  count = 24,
  repel = true,
  palette = DEFAULT_PALETTE,
  sizeScale = 1,
  bleed = 0,
  zIndex,
  clip = true,
}: {
  count?: number;
  repel?: boolean;
  palette?: string[];
  // Global multiplier on every cell's rendered size. The footer packs many more
  // cells, so it renders them smaller (sizeScale < 1) to match the dense field.
  sizeScale?: number;
  // Extra simulation space beyond the visible field. Cells are still clipped by
  // the section, but they can partially leave the viewport instead of banking
  // exactly at the edge.
  bleed?: number;
  // Stacking order of the field. Sections pass a value to place the swarm above
  // or below the wordmark — the hero runs two fields (behind + in front of the
  // "Buzz" text) for depth.
  zIndex?: number;
  // When false, the field doesn't clip its cells at its own bounds — paired with a
  // non-clipping parent section, cells drift past the edge (up to `bleed`px) so the
  // swarm bridges into the neighbouring section instead of hard-cropping.
  clip?: boolean;
}) {
  const maskPrefix = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const wrap = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // SSR + initial client render = count, matching the statically-exported HTML
  // (no hydration mismatch). The effect then halves it on narrow screens. This
  // is the single source of truth for both rendered cells and spawned cells.
  const [n, setN] = useState(count);
  useEffect(() => {
    const updateCount = () => {
      setN(window.innerWidth < 640 ? Math.ceil(count / 2) : count);
    };
    const raf = requestAnimationFrame(updateCount);
    window.addEventListener("resize", updateCount);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updateCount);
    };
  }, [count]);

  // Per-cell render data, recomputed when count or palette changes.
  const renderedCells = Array.from({ length: n }, (_, i) => ({
    key: `${maskPrefix}-cell-${i}`,
    tint: tintOf(i, palette.length),
  }));

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    // Source the cell nodes directly from the committed DOM (the rendered spans
    // are el's children) rather than from ref callbacks — ref timing relative to
    // this effect is fragile, and getting it wrong leaves every cell stacked at
    // the origin instead of spread across the field.
    const cellNodes = Array.from(el.children) as HTMLElement[];
    const bleedPx = Math.max(0, bleed);
    let w = el.clientWidth + bleedPx * 2,
      h = el.clientHeight + bleedPx * 2;
    let cells: Cell[] = spawnCells(n, w, h, bleedPx);
    const introFrom = cells.map((b, i) => {
      const angle = b.seed * TAU + i * 0.37;
      return {
        x: w / 2 + Math.cos(angle) * (w * 0.7 + bleedPx + CELL_W),
        y: h / 2 + Math.sin(angle) * (h * 0.7 + bleedPx + CELL_H),
      };
    });
    // Smoothed facing angle (deg) per cell, so cells bank toward their heading
    // instead of snapping. Seeded from the initial wander heading.
    const rot = cells.map((b) => (b.heading * 180) / Math.PI + ROT_OFFSET);
    let pointer: { x: number; y: number } | null = null;
    // Listen on WINDOW, not `el`: the wrapper is pointer-events:none (so it never
    // blocks clicks on the content beneath it), which means pointer events never
    // reach it — listening on `el` left repel permanently dead. We translate the
    // global cursor into field-local coordinates via the live bounding rect.
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer = {
        x: e.clientX - r.left + bleedPx,
        y: e.clientY - r.top + bleedPx,
      };
    };
    const onLeave = () => {
      pointer = null;
    };
    if (repel && !reduce) {
      window.addEventListener("pointermove", onMove, { passive: true });
      // Clear when the cursor leaves the document entirely.
      document.addEventListener("pointerleave", onLeave);
    }
    const paint = (introProgress = 1) =>
      cellNodes.forEach((node, i) => {
        const b = cells[i];
        if (node && b) {
          const easedIntro = 1 - (1 - introProgress) ** 3;
          const from = introFrom[i];
          const displayX = from ? from.x + (b.x - from.x) * easedIntro : b.x;
          const displayY = from ? from.y + (b.y - from.y) * easedIntro : b.y;
          node.style.transform = `translate(${displayX - bleedPx}px, ${displayY - bleedPx}px) rotate(${rot[i]}deg) scale(${sizeScale})`;
        }
      });
    let introProgress = reduce ? 1 : 0;
    const observer = new ResizeObserver(() => {
      const nextW = el.clientWidth + bleedPx * 2;
      const nextH = el.clientHeight + bleedPx * 2;
      if (nextW <= 0 || nextH <= 0 || (nextW === w && nextH === h)) return;
      const scaleX = nextW / Math.max(1, w);
      const scaleY = nextH / Math.max(1, h);
      cells = cells.map((cell) => ({
        ...cell,
        x: cell.x * scaleX,
        y: cell.y * scaleY,
        homeX: (cell.homeX ?? w / 2) * scaleX,
        homeY: (cell.homeY ?? h / 2) * scaleY,
      }));
      for (const from of introFrom) {
        from.x *= scaleX;
        from.y *= scaleY;
      }
      w = nextW;
      h = nextH;
      pointer = null;
      paint(introProgress);
    });
    observer.observe(el);
    if (reduce) {
      paint();
      return () => observer.disconnect();
    } // freeze
    paint(0);
    let last = performance.now();
    const t0 = last;
    let raf = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      // Elapsed seconds drive each cell's independent wander heading.
      cells = stepCells(
        cells,
        pointer,
        dt,
        w,
        h,
        repel,
        (t - t0) / 1000,
        bleedPx,
      );
      // Rotate each cell toward its travel direction (shortest-arc lerp).
      cells.forEach((b, i) => {
        const speed = Math.hypot(b.vx, b.vy);
        if (speed > ROT_MIN_SPEED) {
          const target = (Math.atan2(b.vy, b.vx) * 180) / Math.PI + ROT_OFFSET;
          const diff = ((target - rot[i] + 540) % 360) - 180;
          rot[i] += diff * 0.18;
        }
      });
      introProgress = Math.min(1, (t - t0) / INTRO_MS);
      paint(introProgress);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [n, repel, reduce, sizeScale, bleed]);

  return (
    <div
      ref={wrap}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        overflow: clip ? "hidden" : "visible",
        pointerEvents: "none",
        zIndex,
      }}
    >
      {renderedCells.map(({ key, tint }) => (
        <span
          key={key}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: CELL_W,
            height: CELL_H,
            color: palette[tint],
            transformOrigin: "center",
            willChange: "transform",
          }}
        >
          <svg
            className="cell-sprite"
            viewBox="0 0 466 309"
            aria-hidden
            width={CELL_W}
            height={CELL_H}
            style={
              {
                display: "block",
                overflow: "visible",
              } as CSSProperties
            }
            focusable="false"
          >
            <title>Honeycomb cell</title>
            <path
              d={CELL_SPRITE_PATH}
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
            />
          </svg>
        </span>
      ))}
    </div>
  );
}
