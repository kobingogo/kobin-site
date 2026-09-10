"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { MaterialSpheresCanvasDynamic } from "./MaterialSpheresCanvasDynamic";
import {
  buildTexturePackManifest,
  CURATED_MATERIALS,
  getLightPreset,
  HOMEPAGE_READY_PATH,
  LIGHT_PRESETS,
  materialsFromColors,
  SAMPLE_REF_PATH,
  sampleDominantColors,
  TEXTURE_PACK_PATH,
  type LightPresetId,
  type Rgb,
  type SphereMaterialSpec,
} from "@/lib/material-spheres";
import { createStoreZip } from "@/lib/zip-store";
import { DEMOS } from "@/lib/demos";

const demo = DEMOS.find((d) => d.slug === "material-spheres")!;

type UiFailureKind = "none" | "load" | "empty" | "nowebgl";
type Mode = "procedural" | "curated";

const UI_FAILURE_OPTIONS: {
  id: UiFailureKind;
  label: string;
  tip: string;
}[] = [
  { id: "none", label: "正常", tip: "" },
  {
    id: "load",
    label: "加载失败",
    tip: "参考图加载失败。请换一张图重试，或切换「精选手调静态墙」继续验收。",
  },
  {
    id: "empty",
    label: "空状态",
    tip: "尚未选择参考图，也未启用静态球墙。请上传 / 选用样例，或打开精选手调静态墙。",
  },
  {
    id: "nowebgl",
    label: "无 WebGL",
    tip: "当前环境无法创建 WebGL 上下文。下方保留可读验收说明与材质清单，不白屏。",
  },
];

function useWebGLSupport() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setOk(!!gl);
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image-load-failed"));
    img.src = src;
  });
}

function sampleImageColors(img: HTMLImageElement): Rgb[] {
  const maxSide = 192;
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas-2d-unavailable");
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return sampleDominantColors(data, w, h, 6);
}


function hexFillCanvas(color: string, size = 64): Uint8Array {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-2d-unavailable");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  const dataUrl = canvas.toDataURL("image/png");
  const b64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function downloadBlob(filename: string, data: Uint8Array, mime: string) {
  // Copy into a fresh ArrayBuffer-backed view for BlobPart typing (TS 5 / DOM lib).
  const bytes = new Uint8Array(data.byteLength);
  bytes.set(data);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function MaterialSpheresDemo() {
  const reduceMotion = useReducedMotion();
  const webglOk = useWebGLSupport();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("procedural");
  const [lightId, setLightId] = useState<LightPresetId>("studio");
  const [previewUrl, setPreviewUrl] = useState<string | null>(SAMPLE_REF_PATH);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [materials, setMaterials] = useState<SphereMaterialSpec[]>(
    () => materialsFromColors([{ r: 34, g: 180, b: 200 }, { r: 180, g: 120, b: 60 }, { r: 120, g: 140, b: 180 }, { r: 220, g: 210, b: 200 }], 6),
  );
  const [palette, setPalette] = useState<Rgb[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uiFailure, setUiFailure] = useState<UiFailureKind>("none");
  const [booted, setBooted] = useState(false);

  const light = useMemo(() => getLightPreset(lightId), [lightId]);

  const effectiveWebgl =
    webglOk && uiFailure !== "nowebgl" && !reduceMotion;
  const showEmpty = uiFailure === "empty";
  const showLoadFail = uiFailure === "load" || !!error;

  const activeMaterials = useMemo(() => {
    if (mode === "curated") return CURATED_MATERIALS;
    return materials;
  }, [mode, materials]);

  const revokeObjectUrl = useCallback(() => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      setObjectUrl(null);
    }
  }, [objectUrl]);

  const applyFromSrc = useCallback(async (src: string) => {
    setBusy(true);
    setError(null);
    try {
      const img = await loadImageElement(src);
      const colors = sampleImageColors(img);
      setPalette(colors);
      setMaterials(materialsFromColors(colors, 6));
      setMode("procedural");
      setPreviewUrl(src);
      if (uiFailure === "load" || uiFailure === "empty") setUiFailure("none");
    } catch {
      setError("参考图加载或采样失败。可切换「精选手调静态墙」继续验收。");
      setMode("curated");
    } finally {
      setBusy(false);
    }
  }, [uiFailure]);

  useEffect(() => {
    if (booted) return;
    setBooted(true);
    void applyFromSrc(SAMPLE_REF_PATH);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booted]);

  useEffect(() => () => revokeObjectUrl(), [revokeObjectUrl]);

  const onPickSample = () => {
    revokeObjectUrl();
    void applyFromSrc(SAMPLE_REF_PATH);
  };

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("请上传图片文件（PNG / JPG / WebP 等）。");
      return;
    }
    revokeObjectUrl();
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    void applyFromSrc(url);
  };

  const exportTexturePack = useCallback(() => {
    try {
      const manifest = buildTexturePackManifest(activeMaterials, {
        source: mode === "curated" ? "curated-static-wall" : "procedural-from-ref",
        lightPresetId: lightId,
      });
      const enc = new TextEncoder();
      const entries: { name: string; data: Uint8Array }[] = [
        {
          name: "materials.json",
          data: enc.encode(JSON.stringify(manifest, null, 2)),
        },
        {
          name: "README.txt",
          data: enc.encode(
            "KobinFlow material-spheres 贴图包\n" +
              "本地导出：materials.json + swatches/*.png（无付费 API）\n" +
              `正式资产目录：${TEXTURE_PACK_PATH}\n` +
              `首页预览：${HOMEPAGE_READY_PATH}\n`,
          ),
        },
      ];
      for (const m of activeMaterials) {
        entries.push({
          name: `swatches/${m.id}.png`,
          data: hexFillCanvas(m.color, 64),
        });
      }
      const zip = createStoreZip(entries);
      downloadBlob("material-spheres-texture-pack.zip", zip, "application/zip");
    } catch {
      setError("贴图包导出失败。可改用仓库内 public/demos/material-spheres/texture-pack/。");
    }
  }, [activeMaterials, mode, lightId]);

  const failureTip =
    UI_FAILURE_OPTIONS.find((o) => o.id === uiFailure)?.tip ||
    (error ?? "");

  // uiFailure=load must unmount Canvas (do not keep rendering behind overlay)
  const canvasBlocked =
    !effectiveWebgl || showEmpty || uiFailure === "load";

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:py-10">
      <header>
        <p className="mb-2 font-mono text-xs uppercase tracking-widest text-cyan-400/80">
          Demo · 状态「{demo.status}」· 实现顺序 #{demo.order}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
          {demo.title}
        </h1>
        <p className="mt-2 text-sm text-zinc-500">{demo.titleEn}</p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-zinc-300 sm:text-lg">
          {demo.pitch} 默认：上传或样例图 → Canvas 采样主色 → 程序化
          metalness / roughness 变体（≥4 球）。图糊 / 失败时用精选手调静态墙仍可验收。
        </p>
        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/25 px-3 py-2 text-sm text-amber-100/90">
          <span className="font-mono text-amber-300">TODO（付费）</span>
          ：图像 / 材质生成 API — 本脚手架不接 key，仅文档标注。
        </p>
      </header>

      {/* Mobile / degrade tip */}
      <p
        role="status"
        data-testid="material-mobile-tip"
        className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs leading-relaxed text-zinc-400 sm:text-sm"
      >
        移动端：深色底防白屏；触控可拖拽环视球墙。窄屏控件单列，按钮 ≥44px。
        {reduceMotion
          ? " 已检测 prefers-reduced-motion：关闭 WebGL，改用清单降级。"
          : !webglOk
            ? " 当前无 WebGL：展示静态降级。"
            : null}
      </p>

      {/* Failure demo switcher */}
      <section
        aria-label="失败态演示"
        className="rounded-2xl border border-white/10 bg-zinc-900/50 p-4"
      >
        <h2 className="font-mono text-xs text-zinc-400">失败态演示</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {UI_FAILURE_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              data-testid={`ui-failure-${opt.id}`}
              aria-pressed={uiFailure === opt.id}
              onClick={() => setUiFailure(opt.id)}
              className={`min-h-11 rounded-lg px-3 py-2 text-sm transition ${
                uiFailure === opt.id
                  ? "bg-rose-500/20 text-rose-100 ring-1 ring-rose-400/50"
                  : "bg-white/5 text-zinc-300 hover:bg-white/10"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      {(failureTip || showLoadFail) && (
        <div
          role="alert"
          data-testid="material-failure-banner"
          className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
        >
          {failureTip || error}
          {mode !== "curated" && (
            <button
              type="button"
              className="ml-3 inline-flex min-h-11 items-center rounded-md bg-white/10 px-3 text-xs text-white hover:bg-white/15"
              onClick={() => {
                setUiFailure("none");
                setError(null);
                setMode("curated");
              }}
            >
              切到精选手调静态墙
            </button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {canvasBlocked ? (
            <div
              data-testid="material-spheres-fallback"
              className="flex h-[min(62vh,520px)] min-h-[280px] w-full flex-col justify-center gap-3 rounded-2xl border border-cyan-500/20 bg-[radial-gradient(ellipse_at_center,_#0e7490_0%,_#020617_55%,_#000_100%)] p-6"
            >
              <p className="font-mono text-sm text-cyan-200">
                {showEmpty
                  ? "空状态 · 无球墙可渲染"
                  : !effectiveWebgl
                    ? "WebGL / 动效降级"
                    : "加载失败降级"}
              </p>
              <p className="max-w-md text-sm leading-relaxed text-zinc-300">
                3D 画布未启用，但验收清单与材质参数仍可读。可切换灯光预设文案对照、打开精选手调静态墙，或恢复「正常」失败态。
              </p>
              <ul className="mt-2 space-y-1 font-mono text-xs text-zinc-400">
                {activeMaterials.slice(0, 6).map((m) => (
                  <li key={m.id}>
                    <span
                      className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle"
                      style={{ background: m.color }}
                    />
                    {m.label} · M{m.metalness.toFixed(2)} R{m.roughness.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <MaterialSpheresCanvasDynamic
              materials={activeMaterials}
              light={light}
            />
          )}

          {/* Sphere labels under canvas for clarity */}
          <div
            className="flex flex-wrap gap-2"
            data-testid="material-sphere-labels"
          >
            {activeMaterials.map((m) => (
              <span
                key={m.id}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-zinc-300"
              >
                <span
                  className="h-3 w-3 rounded-full ring-1 ring-white/30"
                  style={{ background: m.color }}
                  aria-hidden
                />
                {m.label}
              </span>
            ))}
          </div>
        </div>

        <aside className="space-y-4">
          {/* Source */}
          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <h2 className="font-mono text-xs text-cyan-300">参考图</h2>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-black/50">
              {previewUrl && !showEmpty ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="参考图预览"
                  className="aspect-square max-h-48 w-full object-cover"
                  data-testid="ref-preview"
                />
              ) : (
                <div className="flex aspect-square max-h-48 items-center justify-center text-xs text-zinc-500">
                  无预览
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                data-testid="pick-sample"
                disabled={busy}
                onClick={onPickSample}
                className="min-h-11 rounded-lg bg-cyan-500/15 text-sm text-cyan-100 ring-1 ring-cyan-400/40 hover:bg-cyan-500/25 disabled:opacity-50"
              >
                使用捆绑样例图
              </button>
              <button
                type="button"
                data-testid="upload-ref"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="min-h-11 rounded-lg bg-white/5 text-sm text-zinc-200 ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
              >
                上传参考图
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                data-testid="upload-input"
                onChange={(e) => onFile(e.target.files?.[0])}
              />
            </div>
            {palette.length > 0 && mode === "procedural" && (
              <div className="mt-3">
                <p className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                  采样主色
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {palette.slice(0, 6).map((c, i) => (
                    <span
                      key={i}
                      className="h-6 w-6 rounded-md ring-1 ring-white/20"
                      style={{
                        background: `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`,
                      }}
                      title={`rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`}
                    />
                  ))}
                </div>
              </div>
            )}
            {busy && (
              <p className="mt-2 font-mono text-xs text-zinc-500">采样中…</p>
            )}
          </section>

          {/* Mode */}
          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <h2 className="font-mono text-xs text-cyan-300">球墙模式</h2>
            <div className="mt-3 grid grid-cols-1 gap-2">
              <button
                type="button"
                data-testid="mode-procedural"
                aria-pressed={mode === "procedural"}
                onClick={() => setMode("procedural")}
                className={`min-h-11 rounded-lg px-3 text-left text-sm ${
                  mode === "procedural"
                    ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/50"
                    : "bg-white/5 text-zinc-300"
                }`}
              >
                图生程序化变体
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Canvas 主色 → ≥4 PBR 球
                </span>
              </button>
              <button
                type="button"
                data-testid="mode-curated"
                aria-pressed={mode === "curated"}
                onClick={() => {
                  setMode("curated");
                  if (uiFailure === "empty" || uiFailure === "load") {
                    setUiFailure("none");
                    setError(null);
                  }
                }}
                className={`min-h-11 rounded-lg px-3 text-left text-sm ${
                  mode === "curated"
                    ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/50"
                    : "bg-white/5 text-zinc-300"
                }`}
              >
                精选手调静态墙
                <span className="mt-0.5 block text-xs text-zinc-500">
                  Chrome / Gold / Ceramic… 验收兜底
                </span>
              </button>
            </div>
          </section>

          {/* Lights */}
          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <h2 className="font-mono text-xs text-cyan-300">灯光切换</h2>
            <p className="mt-1 text-xs text-zinc-500">
              Studio / Rim / Warm — 拉开金属与非金属差异
            </p>
            <div className="mt-3 flex flex-col gap-2" role="group" aria-label="灯光预设">
              {LIGHT_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`light-${p.id}`}
                  aria-pressed={lightId === p.id}
                  onClick={() => setLightId(p.id)}
                  className={`min-h-11 rounded-lg px-3 text-left text-sm transition ${
                    lightId === p.id
                      ? "bg-amber-500/20 text-amber-50 ring-1 ring-amber-400/50"
                      : "bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {p.label}
                  <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">
                    key {p.key.intensity.toFixed(2)} · env {p.envIntensity.toFixed(2)}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Texture pack / homepage assets */}
          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <h2 className="font-mono text-xs text-cyan-300">贴图包 / 首页预览</h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              导出当前球墙参数 + 色板 PNG（zip）。仓库已提交 curated 贴图包与 homepage-ready 预览图。
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                data-testid="export-texture-pack"
                onClick={exportTexturePack}
                className="min-h-11 rounded-lg bg-cyan-500/15 text-sm text-cyan-100 ring-1 ring-cyan-400/40 hover:bg-cyan-500/25"
              >
                导出贴图包
              </button>
              <a
                href={`${TEXTURE_PACK_PATH}materials.json`}
                data-testid="texture-pack-link"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white/5 text-sm text-zinc-200 ring-1 ring-white/10 hover:bg-white/10"
              >
                打开仓库贴图包目录
              </a>
              <a
                href={HOMEPAGE_READY_PATH}
                data-testid="homepage-ready-link"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-white/5 text-sm text-zinc-200 ring-1 ring-white/10 hover:bg-white/10"
              >
                查看 homepage-ready 预览
              </a>
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
        <h2 className="font-mono text-sm text-cyan-300">Hard acceptance</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-300">
          {demo.acceptance.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>当前球数：{activeMaterials.length}（模式：{mode === "curated" ? "精选手调" : "程序化"}）</li>
          <li>灯光预设：{light.label}</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-6">
        <h2 className="font-mono text-sm text-amber-300">Paid API / TODO</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-300">
          {demo.paidApiNotes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <p className="pb-6">
        <Link
          href="/"
          className="text-sm text-cyan-400 underline-offset-4 hover:underline"
        >
          ← 返回 Home
        </Link>
      </p>
    </main>
  );
}
