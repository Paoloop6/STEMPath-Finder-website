import { useCallback, useRef, useState } from 'react';

/**
 * Weighted grade donut.
 *
 * Each grading section owns an arc proportional to its share of the 100-point
 * total (Course Completion 30% · Challenge Performance 40% · Final Project
 * 30%), so slice sizes always sum to exactly 100%. Within its arc, the colored
 * sweep is proportional to earned points over a muted track; an ungraded
 * section renders track-only and reports "not yet graded" on hover. Hovering a
 * slice (with a hit area wider than the mark) shows the section name, earned
 * points out of its maximum, and its percentage share of the grade; the center
 * carries the total score in ink, never in a series color.
 *
 * Colors are the validated dark-surface categorical slots (see dataviz palette;
 * validated against this site's surface, worst pair ΔE 8.4, all >= 3:1).
 */

export interface DonutSegment {
  key: string;
  label: string;
  color: string;
  /** Earned points, or null for "not yet graded". */
  points: number | null;
  /** Section maximum — also the slice's share of the ring (30/40/30). */
  maxPoints: number;
  /** Optional hover detail line under the score. */
  detail?: string;
}

/** Fixed series colors — dark-mode categorical slots 1-3. */
export const DONUT_COLORS = {
  completion: '#3987e5',
  challenge: '#d95926',
  final: '#199e70',
} as const;

const TRACK = 'rgba(255,255,255,0.10)';
const GAP_DEG = 8; // reads as the 2px surface gap at this radius
const START_DEG = -90; // first slice starts at 12 o'clock

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** SVG arc path from startDeg to endDeg (clockwise, degrees). Exported for tests. */
export function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const [x1, y1] = polar(cx, cy, r, startDeg);
  const [x2, y2] = polar(cx, cy, r, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(3)} ${y2.toFixed(3)}`;
}

function weightPct(seg: DonutSegment, totalMax: number): number {
  return Math.round((seg.maxPoints / totalMax) * 100);
}

interface Tooltip {
  x: number;
  y: number;
  label: string;
  value: string;
  detail?: string;
}

export function ScoreDonut({
  segments,
  center,
  centerCaption = 'total',
  size = 84,
}: {
  segments: DonutSegment[];
  /** Number shown in the middle (the total score out of 100). */
  center: number;
  centerCaption?: string;
  size?: number;
}) {
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const half = size / 2;
  const stroke = Math.max(8, size * 0.13);
  const r = half - stroke / 2 - 1;
  const totalMax = segments.reduce((sum, s) => sum + s.maxPoints, 0) || 1;

  const show = useCallback(
    (e: React.MouseEvent, seg: DonutSegment) => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      setTooltip({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        label: `${seg.label} · ${weightPct(seg, totalMax)}%`,
        value: seg.points === null ? 'Not yet graded' : `${seg.points}/${seg.maxPoints} pts`,
        detail: seg.detail,
      });
    },
    [totalMax],
  );

  const aria = segments
    .map(
      (s) =>
        `${s.label} (${weightPct(s, totalMax)}% of grade): ${
          s.points === null ? 'not yet graded' : `${s.points} out of ${s.maxPoints}`
        }`,
    )
    .join(', ');

  let cursor = START_DEG;

  return (
    <div ref={rootRef} className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`Grade breakdown — total ${center} of 100. ${aria}`}
      >
        {segments.map((seg) => {
          const span = (seg.maxPoints / totalMax) * 360 - GAP_DEG;
          const start = cursor + GAP_DEG / 2;
          cursor += span + GAP_DEG;
          const filled = seg.points === null ? 0 : Math.max(0, Math.min(1, seg.points / seg.maxPoints)) * span;
          return (
            <g key={seg.key}>
              <title>{`${seg.label} (${weightPct(seg, totalMax)}%): ${
                seg.points === null ? 'not yet graded' : `${seg.points}/${seg.maxPoints} pts`
              }`}</title>
              {/* track */}
              <path d={arcPath(half, half, r, start, start + span)} stroke={TRACK} strokeWidth={stroke} fill="none" />
              {/* value sweep */}
              {filled > 0.5 && (
                <path
                  d={arcPath(half, half, r, start, start + filled)}
                  stroke={seg.color}
                  strokeWidth={stroke}
                  strokeLinecap="round"
                  fill="none"
                />
              )}
              {/* hit area wider than the mark */}
              <path
                d={arcPath(half, half, r, start, start + span)}
                stroke="transparent"
                strokeWidth={stroke + 10}
                fill="none"
                className="cursor-default"
                onMouseMove={(e) => show(e, seg)}
                onMouseLeave={() => setTooltip(null)}
              />
            </g>
          );
        })}
      </svg>

      {/* center figure — ink, never a series color */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[16px] font-semibold leading-none text-foreground">{center}</span>
        <span className="mt-0.5 text-[8px] uppercase tracking-[0.08em] text-muted-foreground">{centerCaption}</span>
      </div>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-20 w-max max-w-[220px] rounded-[8px] border border-border bg-[rgba(10,12,15,0.96)] px-2.5 py-1.5 shadow-lg"
          style={{
            left: Math.min(tooltip.x + 10, size - 10),
            top: tooltip.y - 8,
            transform: tooltip.x > size / 2 ? 'translateX(-100%)' : undefined,
          }}
        >
          <p className="text-[11px] font-medium text-foreground">{tooltip.label}</p>
          <p className="text-[11px] tabular-nums text-[var(--brand-muted-1)]">{tooltip.value}</p>
          {tooltip.detail && <p className="mt-0.5 text-[10px] text-muted-foreground">{tooltip.detail}</p>}
        </div>
      )}
    </div>
  );
}

/** Shared legend so slice identity is never carried by color alone. */
export function DonutLegend({ items }: { items: Array<{ label: string; color: string; pct?: number }> }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
          {item.label}
          {typeof item.pct === 'number' && <span className="tabular-nums text-foreground/60">{item.pct}%</span>}
        </span>
      ))}
    </div>
  );
}
