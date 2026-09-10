/**
 * Scroll-scrubbed camera timeline — pure math, no three.js (node:test friendly).
 * Ported from sen-3d-resume Scene.tsx: dwell remapping + anchor→station index +
 * smoothstep keyframe sampling over pos/look/focus channels.
 *
 * Station model: `anchors` are M DOM sections; `keys` has M+1 entries where
 * keys[0] is the opening shot (s=-1) and keys[i+1] parks at anchors[i] (s=i).
 * Continuous index s ∈ [-1, M-1].
 */

export type Vec3Tuple = [number, number, number];

export type TimelineKey = {
  id: string;
  pos: Vec3Tuple;
  look: Vec3Tuple;
  /** DoF autofocus target at this station (world space) */
  focus: Vec3Tuple;
};

export type TimelineSample = {
  pos: Vec3Tuple;
  look: Vec3Tuple;
  focus: Vec3Tuple;
};

export type StationIndexInput = {
  /** Document-space tops of the M anchor elements */
  tops: number[];
  scrollY: number;
  vh: number;
  /** Reference line in viewport px: scrollY + vh * refLineFrac */
  refLine: number;
  refLineFrac: number;
  /** Dwell fraction per segment, clamped to [0, 0.49] */
  dwell: number;
};

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}

function smoothstep(x: number): number {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
}

/**
 * Dwell remapping: hold at 0 near segment start, hold at 1 near segment end,
 * fast smoothstep transition through the middle. Camera "parks" at stations.
 */
export function dwellRemap(t: number, dwell: number): number {
  const c = clamp01(t);
  const d = Math.min(Math.max(dwell, 0), 0.49);
  if (d <= 0) return c;
  if (c < d) return 0;
  if (c > 1 - d) return 1;
  return smoothstep((c - d) / (1 - 2 * d));
}

/** Continuous station index from measured anchor tops (sen Scene.tsx:314-334). */
export function stationIndex({
  tops,
  scrollY,
  vh,
  refLine,
  refLineFrac,
  dwell,
}: StationIndexInput): number {
  const M = tops.length;
  if (M === 0) return 0;
  if (refLine <= tops[0]) {
    // Intro segment: s=-1 at the very top, s=0 when anchors[0] reaches the ref line
    const heroScroll = Math.max(1, tops[0] - vh * refLineFrac);
    return -1 + dwellRemap(scrollY / heroScroll, dwell);
  }
  if (refLine >= tops[M - 1]) return M - 1;
  for (let i = 0; i < M - 1; i++) {
    if (refLine <= tops[i + 1]) {
      const t = (refLine - tops[i]) / Math.max(1, tops[i + 1] - tops[i]);
      return i + dwellRemap(t, dwell);
    }
  }
  return M - 1;
}

/** Sample pos/look/focus at continuous index s ∈ [-1, M-1]; writes into `out`. */
export function sampleKeys(
  keys: TimelineKey[],
  s: number,
  out: TimelineSample,
): void {
  if (keys.length === 0) return;
  if (keys.length === 1) {
    const k = keys[0];
    for (let i = 0; i < 3; i++) {
      out.pos[i] = k.pos[i];
      out.look[i] = k.look[i];
      out.focus[i] = k.focus[i];
    }
    return;
  }
  const segments = keys.length - 1;
  const u = Math.min(Math.max(s + 1, 0), segments);
  const i = Math.min(Math.floor(u), segments - 1);
  const f = smoothstep(u - i);
  const a = keys[i];
  const b = keys[i + 1];
  for (let k = 0; k < 3; k++) {
    out.pos[k] = a.pos[k] + (b.pos[k] - a.pos[k]) * f;
    out.look[k] = a.look[k] + (b.look[k] - a.look[k]) * f;
    out.focus[k] = a.focus[k] + (b.focus[k] - a.focus[k]) * f;
  }
}
