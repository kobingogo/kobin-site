/**
 * Generate a ≤20s portfolio-grade robot-arm reel (WebM).
 * Pure SVG frames + ffmpeg — no paid API / no sharp.
 *
 * Run: node scripts/generate-robot-arm-reel.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "public", "demos", "robot-arm");
const framesDir = path.join(root, ".reel-frames");
const outWebm = path.join(root, "reel.webm");

const W = 720;
const H = 720;
const FPS = 24;
const DURATION_S = 12; // ≤20s portfolio reel
const TOTAL = FPS * DURATION_S;

fs.mkdirSync(root, { recursive: true });
fs.mkdirSync(framesDir, { recursive: true });

/** Scripted pick-and-place storyboard phases across the reel */
function phaseAt(t) {
  // 0–1 normalized time
  if (t < 0.12) return { label: "复位", grasp: 0, yaw: 0, shoulder: -0.35, elbow: 0.9, cube: "left" };
  if (t < 0.28) return { label: "抓取左边", grasp: 0, yaw: 0.55, shoulder: 0.15, elbow: 0.55, cube: "left" };
  if (t < 0.36) return { label: "夹紧", grasp: 1, yaw: 0.55, shoulder: 0.15, elbow: 0.55, cube: "held" };
  if (t < 0.48) return { label: "抬起", grasp: 1, yaw: 0.25, shoulder: -0.25, elbow: 0.75, cube: "held" };
  if (t < 0.62) return { label: "放到右边", grasp: 1, yaw: -0.55, shoulder: 0.12, elbow: 0.52, cube: "held" };
  if (t < 0.7) return { label: "放下", grasp: 0, yaw: -0.55, shoulder: 0.12, elbow: 0.52, cube: "right" };
  if (t < 0.82) return { label: "抓取中间", grasp: 0, yaw: 0, shoulder: 0.1, elbow: 0.5, cube: "middle" };
  if (t < 0.9) return { label: "夹紧·抬起", grasp: 1, yaw: 0.1, shoulder: -0.2, elbow: 0.7, cube: "held2" };
  return { label: "放到左边", grasp: t < 0.96 ? 1 : 0, yaw: 0.55, shoulder: 0.1, elbow: 0.5, cube: t < 0.96 ? "held2" : "left" };
}

function lerp(a, b, u) {
  return a + (b - a) * u;
}

function renderFrame(i) {
  const t = i / (TOTAL - 1);
  const p = phaseAt(t);
  // Smooth within coarse phases via neighbor blend
  const t2 = Math.min(1, t + 0.02);
  const p2 = phaseAt(t2);
  const u = 0.35;
  const yaw = lerp(p.yaw, p2.yaw, u);
  const shoulder = lerp(p.shoulder, p2.shoulder, u);
  const elbow = lerp(p.elbow, p2.elbow, u);
  const grasp = lerp(p.grasp, p2.grasp, u);

  // 2D arm kinematics (side-ish isometric)
  const baseX = 360;
  const baseY = 470;
  const L1 = 150;
  const L2 = 130;
  const a1 = -Math.PI / 2 + shoulder;
  const a2 = a1 + elbow;
  const sx = baseX + Math.cos(yaw) * 8;
  const sy = baseY;
  const j1x = sx + Math.cos(a1) * L1;
  const j1y = sy + Math.sin(a1) * L1;
  const j2x = j1x + Math.cos(a2) * L2;
  const j2y = j1y + Math.sin(a2) * L2;
  const gap = 18 - grasp * 10;

  const slots = {
    left: { x: 220, y: 520, color: "#38bdf8" },
    middle: { x: 360, y: 530, color: "#a78bfa" },
    right: { x: 500, y: 520, color: "#f472b6" },
  };

  let cubes = [];
  if (p.cube === "left") {
    cubes = [
      { ...slots.left, id: "c" },
      { ...slots.middle, id: "m" },
    ];
  } else if (p.cube === "middle") {
    cubes = [
      { ...slots.right, id: "r", color: "#38bdf8" },
      { ...slots.middle, id: "m" },
    ];
  } else if (p.cube === "right") {
    cubes = [
      { ...slots.right, id: "c", color: "#38bdf8" },
      { ...slots.middle, id: "m" },
    ];
  } else if (p.cube === "held" || p.cube === "held2") {
    cubes = [
      { x: j2x, y: j2y + 28, color: p.cube === "held" ? "#38bdf8" : "#a78bfa", id: "h" },
      ...(p.cube === "held"
        ? [{ ...slots.middle, id: "m" }]
        : [{ ...slots.right, id: "r", color: "#38bdf8" }]),
    ];
  } else {
    cubes = [
      { ...slots.left, id: "c" },
      { ...slots.right, id: "r", color: "#a78bfa" },
    ];
  }

  const cubeSvg = cubes
    .map(
      (c) =>
        `<rect x="${c.x - 18}" y="${c.y - 18}" width="36" height="36" rx="4" fill="${c.color}" stroke="#0f172a" stroke-width="2"/>`,
    )
    .join("");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="g" cx="50%" cy="40%" r="60%">
      <stop offset="0%" stop-color="#0e7490" stop-opacity="0.4"/>
      <stop offset="55%" stop-color="#020617" stop-opacity="1"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="1"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <text x="${W / 2}" y="48" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif"
    font-size="22" fill="#a5f3fc" opacity="0.95">KobinFlow · 自然语言机械臂</text>
  <text x="${W / 2}" y="78" text-anchor="middle" font-family="ui-sans-serif,system-ui,sans-serif"
    font-size="16" fill="#94a3b8">${p.label} · robot-arm reel</text>

  <!-- table -->
  <ellipse cx="360" cy="540" rx="260" ry="48" fill="#0b1220" opacity="0.95"/>
  <rect x="120" y="500" width="480" height="28" rx="6" fill="#1e293b"/>
  <!-- slot rings -->
  <circle cx="220" cy="520" r="28" fill="none" stroke="#22d3ee" stroke-opacity="0.35" stroke-width="3"/>
  <circle cx="360" cy="530" r="28" fill="none" stroke="#22d3ee" stroke-opacity="0.35" stroke-width="3"/>
  <circle cx="500" cy="520" r="28" fill="none" stroke="#22d3ee" stroke-opacity="0.35" stroke-width="3"/>

  <!-- base -->
  <rect x="${sx - 36}" y="${sy - 10}" width="72" height="36" rx="8" fill="#0f172a" stroke="#155e75" stroke-width="2"/>
  <circle cx="${sx}" cy="${sy}" r="22" fill="#155e75"/>

  <!-- links -->
  <line x1="${sx}" y1="${sy}" x2="${j1x}" y2="${j1y}" stroke="#22d3ee" stroke-width="18" stroke-linecap="round"/>
  <line x1="${j1x}" y1="${j1y}" x2="${j2x}" y2="${j2y}" stroke="#67e8f9" stroke-width="14" stroke-linecap="round"/>
  <circle cx="${j1x}" cy="${j1y}" r="10" fill="#e2e8f0"/>
  <circle cx="${j2x}" cy="${j2y}" r="9" fill="#e2e8f0"/>

  <!-- gripper jaws -->
  <rect x="${j2x - gap - 6}" y="${j2y + 4}" width="10" height="28" rx="2" fill="#fbbf24"/>
  <rect x="${j2x + gap - 4}" y="${j2y + 4}" width="10" height="28" rx="2" fill="#fbbf24"/>

  ${cubeSvg}

  <text x="40" y="${H - 36}" font-family="ui-monospace,monospace" font-size="14" fill="#64748b">
    frame ${String(i).padStart(3, "0")}/${TOTAL} · ${DURATION_S}s · no paid API
  </text>
</svg>`;

  const framePath = path.join(framesDir, `frame-${String(i).padStart(5, "0")}.svg`);
  fs.writeFileSync(framePath, svg);
  return framePath;
}

console.log(`Rendering ${TOTAL} SVG frames @ ${FPS}fps (${DURATION_S}s)…`);
for (let i = 0; i < TOTAL; i++) {
  renderFrame(i);
  if (i % 24 === 0) console.log(`  frame ${i}/${TOTAL}`);
}

const pattern = path.join(framesDir, "frame-%05d.svg");
const ff = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-framerate",
    String(FPS),
    "-i",
    pattern,
    "-c:v",
    "libvpx-vp9",
    "-b:v",
    "1.0M",
    "-pix_fmt",
    "yuv420p",
    "-an",
    "-t",
    String(DURATION_S),
    outWebm,
  ],
  { encoding: "utf8" },
);

if (ff.status !== 0) {
  console.error(ff.stderr || ff.stdout);
  process.exit(ff.status ?? 1);
}

const st = fs.statSync(outWebm);
console.log(`Wrote ${outWebm} (${(st.size / 1024).toFixed(1)} KiB, ${DURATION_S}s)`);

for (const f of fs.readdirSync(framesDir)) {
  fs.unlinkSync(path.join(framesDir, f));
}
fs.rmdirSync(framesDir);

fs.writeFileSync(
  path.join(root, "README.txt"),
  [
    "KobinFlow robot-arm formal reel",
    "Generated locally — no paid API / no keys.",
    "reel.webm — formal ≤20s portfolio-grade pick/place reel (12s)",
    "Regen reel: node scripts/generate-robot-arm-reel.mjs",
    "",
  ].join("\n"),
);
console.log("Updated README.txt");
