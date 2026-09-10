"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ProductTurntableCanvasDynamic } from "./ProductTurntableCanvasDynamic";
import {
  PRODUCT_SAMPLES,
  PROXY_FALLBACK_TEXTURE,
  REEL_ASSET_PATH,
  REEL_SECONDS,
  TTI_BUDGET_MS,
  UI_FAILURE_OPTIONS,
  buildReelGuidance,
  formatTti,
  shouldUseProxyFallback,
  type ProductSample,
  type RenderMode,
  type UiFailureKind,
} from "@/lib/product-turntable";
import { DEMOS } from "@/lib/demos";

const demo = DEMOS.find((d) => d.slug === "product-turntable")!;

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

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProductTurntableDemo() {
  const reduceMotion = useReducedMotion();
  const webglOk = useWebGLSupport();

  const [sampleId, setSampleId] = useState(PRODUCT_SAMPLES[0]!.id);
  const [mode, setMode] = useState<RenderMode>("sample");
  const [autoSpin, setAutoSpin] = useState(true);
  const [uiFailure, setUiFailure] = useState<UiFailureKind>("none");
  const [error, setError] = useState<string | null>(null);
  const [ttiMs, setTtiMs] = useState<number | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordHint, setRecordHint] = useState<string | null>(null);

  const mountAt = useRef<number>(
    typeof performance !== "undefined" ? performance.now() : 0,
  );
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sample: ProductSample = useMemo(
    () => PRODUCT_SAMPLES.find((p) => p.id === sampleId) ?? PRODUCT_SAMPLES[0]!,
    [sampleId],
  );

  const effectiveWebgl =
    webglOk && uiFailure !== "nowebgl" && !reduceMotion;
  const showEmpty = uiFailure === "empty";
  const showLoadFail = uiFailure === "load" || !!error;

  // Auto-proxy when recon/white-screen heuristics fire (demo + real fail path)
  const forceProxy = shouldUseProxyFallback({
    forceProxy: mode === "proxy",
    textureLoadFailed: !!error && mode !== "proxy",
  });
  const renderMode: RenderMode = forceProxy || mode === "proxy" ? "proxy" : "sample";

  const canvasBlocked =
    !effectiveWebgl || showEmpty || uiFailure === "load";

  const onInteractive = useCallback(() => {
    const ms = performance.now() - mountAt.current;
    setTtiMs(ms);
  }, []);

  const onTextureError = useCallback(() => {
    setError("产品贴图加载失败。已建议切到代理模 + 贴图兜底。");
    setMode("proxy");
  }, []);

  const switchSample = (id: string) => {
    setSampleId(id);
    setError(null);
    if (uiFailure === "empty" || uiFailure === "load") setUiFailure("none");
    mountAt.current = performance.now();
    setTtiMs(null);
  };

  const enableProxy = () => {
    setMode("proxy");
    setError(null);
    if (uiFailure === "load" || uiFailure === "empty") setUiFailure("none");
    mountAt.current = performance.now();
    setTtiMs(null);
  };

  const enableSample = () => {
    setMode("sample");
    setError(null);
    mountAt.current = performance.now();
    setTtiMs(null);
  };

  /** Simulate unrecognizable recon → must land on proxy + texture fallback */
  const simulateBadRecon = () => {
    setError("重建结果不可识别 / 有白屏风险 — 已切到代理模 + 贴图兜底（不硬推坏 recon）。");
    setMode("proxy");
    if (uiFailure !== "none") setUiFailure("none");
    mountAt.current = performance.now();
    setTtiMs(null);
  };

  const stopRecording = useCallback(() => {
    if (recordTimerRef.current) {
      clearTimeout(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
    recorderRef.current = null;
    setRecording(false);
  }, []);

  const startRecording = useCallback(() => {
    setRecordHint(null);
    const el = canvasElRef.current;
    if (!el || typeof el.captureStream !== "function") {
      setRecordHint(
        "当前浏览器无法从 Canvas 捕获流。请改用系统录屏：开自动旋转，录 10–15s 拖拽环视后导出。",
      );
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setRecordHint(
        "MediaRecorder 不可用。请用系统录屏按页内指引导出约 15s reel。",
      );
      return;
    }
    try {
      const stream = el.captureStream(30);
      const mimeCandidates = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ];
      const mime =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      chunksRef.current = [];
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mime || "video/webm",
        });
        if (blob.size > 0) {
          downloadBlob(
            `product-turntable-${sample.id}-${REEL_SECONDS}s.webm`,
            blob,
          );
          setRecordHint(`已导出约 ${REEL_SECONDS}s WebM（${sample.label}）。`);
        } else {
          setRecordHint("录制结束但无数据，请改用系统录屏指引。");
        }
        setRecording(false);
        recorderRef.current = null;
      };
      recorderRef.current = rec;
      rec.start(250);
      setRecording(true);
      setAutoSpin(true);
      recordTimerRef.current = setTimeout(() => {
        stopRecording();
      }, REEL_SECONDS * 1000);
    } catch {
      setRecordHint(
        "启动录制失败。请按「约 15s reel 指引」用系统录屏导出。",
      );
      setRecording(false);
    }
  }, [sample.id, sample.label, stopRecording]);

  useEffect(() => () => stopRecording(), [stopRecording]);

  const failureTip =
    UI_FAILURE_OPTIONS.find((o) => o.id === uiFailure)?.tip || (error ?? "");

  const reelTips = useMemo(() => buildReelGuidance(), []);

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
          {demo.pitch} 默认路径：3 张捆绑产品图驱动代理模转盘（无付费
          API）；拖拽 / 触控环视；认不出原物或白屏风险时切「代理模 +
          贴图兜底」，不硬推坏 recon。
        </p>
        <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-950/25 px-3 py-2 text-sm text-amber-100/90">
          <span className="font-mono text-amber-300">TODO（付费）</span>
          ：图生 3D / 重建服务 — 本脚手架不接 key，仅文档标注；默认走代理模。
        </p>
      </header>

      <p
        role="status"
        data-testid="turntable-mobile-tip"
        className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs leading-relaxed text-zinc-400 sm:text-sm"
      >
        移动端：深色底防白屏；单指拖拽环视（OrbitControls 触控），双指缩放距离。按钮 ≥44px。
        {reduceMotion
          ? " 已检测 prefers-reduced-motion：关闭 WebGL，改用清单降级。"
          : !webglOk
            ? " 当前无 WebGL：展示静态降级。"
            : null}{" "}
        <span
          data-testid="turntable-tti"
          data-tti-ms={ttiMs == null ? "" : String(Math.round(ttiMs))}
          data-tti-budget-ms={String(TTI_BUDGET_MS)}
          className="font-mono text-cyan-300/90"
        >
          TTI（挂载→控件/画布可交互）：{formatTti(ttiMs)}
          {ttiMs != null ? (
            <span className="ml-1 text-zinc-500">
              / 预算 {'<'}{TTI_BUDGET_MS / 1000}s
              {ttiMs < TTI_BUDGET_MS ? " · 达标" : " · 超预算"}
            </span>
          ) : null}
        </span>
      </p>

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
          <button
            type="button"
            data-testid="simulate-bad-recon"
            onClick={simulateBadRecon}
            className="min-h-11 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-100 ring-1 ring-amber-400/40 hover:bg-amber-500/25"
          >
            模拟认不出 / 白屏风险 → 代理兜底
          </button>
        </div>
      </section>

      {(failureTip || showLoadFail) && (
        <div
          role="alert"
          data-testid="turntable-failure-banner"
          className="rounded-xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100"
        >
          {failureTip || error}
          {renderMode !== "proxy" && (
            <button
              type="button"
              className="ml-3 inline-flex min-h-11 items-center rounded-md bg-white/10 px-3 text-xs text-white hover:bg-white/15"
              onClick={enableProxy}
            >
              切到代理模 + 贴图兜底
            </button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          {canvasBlocked ? (
            <div
              data-testid="product-turntable-fallback"
              className="flex h-[min(62vh,520px)] min-h-[280px] w-full flex-col justify-center gap-3 rounded-2xl border border-cyan-500/20 bg-[radial-gradient(ellipse_at_center,_#0e7490_0%,_#020617_55%,_#000_100%)] p-6"
            >
              <p className="font-mono text-sm text-cyan-200">
                {showEmpty
                  ? "空状态 · 无产品可渲染"
                  : !effectiveWebgl
                    ? "WebGL / 动效降级"
                    : "加载失败降级"}
              </p>
              <p className="max-w-md text-sm leading-relaxed text-zinc-300">
                3D 转盘未启用，但验收清单与 3
                个产品样例说明仍可读。可切代理模、恢复「正常」失败态，或换样例重试。
              </p>
              <ul className="mt-2 space-y-1 font-mono text-xs text-zinc-400">
                {PRODUCT_SAMPLES.map((p) => (
                  <li key={p.id}>
                    {p.label} · {p.labelEn} · {p.shape}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ProductTurntableCanvasDynamic
              sample={sample}
              mode={renderMode}
              autoSpin={autoSpin && !reduceMotion}
              onInteractive={onInteractive}
              onTextureError={onTextureError}
              canvasElRef={canvasElRef}
            />
          )}

          <div
            className="flex flex-wrap items-center gap-2"
            data-testid="turntable-mode-badge"
          >
            <span className="inline-flex min-h-9 items-center rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs text-zinc-300">
              当前：{sample.label}
            </span>
            <span
              className={`inline-flex min-h-9 items-center rounded-full px-3 py-1 text-xs ring-1 ${
                renderMode === "proxy"
                  ? "bg-violet-500/20 text-violet-100 ring-violet-400/40"
                  : "bg-cyan-500/15 text-cyan-100 ring-cyan-400/40"
              }`}
              data-testid="render-mode-badge"
            >
              {renderMode === "proxy" ? "代理模 + 贴图兜底" : "样例代理模 + 产品图"}
            </span>
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <h2 className="font-mono text-xs text-cyan-300">产品样例（3 图驱动）</h2>
            <p className="mt-1 text-xs text-zinc-500">
              每张产品图驱动转盘贴图；可拖拽环视。
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {PRODUCT_SAMPLES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  data-testid={`sample-${p.id}`}
                  aria-pressed={sampleId === p.id}
                  onClick={() => switchSample(p.id)}
                  className={`flex min-h-11 items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition ${
                    sampleId === p.id
                      ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/50"
                      : "bg-white/5 text-zinc-300 hover:bg-white/10"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.texturePath}
                    alt=""
                    className="h-11 w-11 shrink-0 rounded-md object-cover ring-1 ring-white/15"
                  />
                  <span>
                    {p.label}
                    <span className="mt-0.5 block text-xs text-zinc-500">
                      {p.labelEn} · {p.shape}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <h2 className="font-mono text-xs text-cyan-300">转盘控制</h2>
            <div className="mt-3 flex flex-col gap-2">
              <button
                type="button"
                data-testid="toggle-autospin"
                aria-pressed={autoSpin}
                onClick={() => setAutoSpin((v) => !v)}
                className={`min-h-11 rounded-lg px-3 text-sm ${
                  autoSpin
                    ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/50"
                    : "bg-white/5 text-zinc-300"
                }`}
              >
                自动旋转：{autoSpin ? "开" : "关"}
              </button>
              <button
                type="button"
                data-testid="mode-sample"
                aria-pressed={mode === "sample"}
                onClick={enableSample}
                className={`min-h-11 rounded-lg px-3 text-left text-sm ${
                  mode === "sample"
                    ? "bg-cyan-500/20 text-cyan-100 ring-1 ring-cyan-400/50"
                    : "bg-white/5 text-zinc-300"
                }`}
              >
                样例代理模
                <span className="mt-0.5 block text-xs text-zinc-500">
                  产品图贴在形状代理上（默认无付费）
                </span>
              </button>
              <button
                type="button"
                data-testid="mode-proxy"
                aria-pressed={mode === "proxy"}
                onClick={enableProxy}
                className={`min-h-11 rounded-lg px-3 text-left text-sm ${
                  mode === "proxy"
                    ? "bg-violet-500/20 text-violet-100 ring-1 ring-violet-400/50"
                    : "bg-white/5 text-zinc-300"
                }`}
              >
                代理模 + 贴图兜底
                <span className="mt-0.5 block text-xs text-zinc-500">
                  认不出 / 白屏风险时强制盒体 +{" "}
                  <span className="font-mono">proxy-fallback.png</span>
                </span>
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                renderMode === "proxy"
                  ? PROXY_FALLBACK_TEXTURE
                  : sample.texturePath
              }
              alt="当前贴图预览"
              data-testid="texture-preview"
              className="mt-3 aspect-square max-h-36 w-full rounded-xl object-cover ring-1 ring-white/10"
            />
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-4">
            <h2 className="font-mono text-xs text-cyan-300">
              约 {REEL_SECONDS}s 录制 / 导出
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              页内可尝试 Canvas → WebM；不支持时按下方指引用系统录屏。正式作品集 reel：
              <a
                href={REEL_ASSET_PATH}
                data-testid="reel-asset-link"
                className="ml-1 text-cyan-400 underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                public/demos/product-turntable/reel.webm（12s）
              </a>
            </p>
            <video
              data-testid="reel-asset-video"
              className="mt-2 aspect-square w-full max-h-40 rounded-lg object-cover ring-1 ring-white/10"
              src={REEL_ASSET_PATH}
              muted
              playsInline
              loop
              controls
              preload="metadata"
            />
            <div className="mt-3 flex flex-col gap-2">
              {!recording ? (
                <button
                  type="button"
                  data-testid="record-reel"
                  disabled={canvasBlocked}
                  onClick={startRecording}
                  className="min-h-11 rounded-lg bg-cyan-500/15 text-sm text-cyan-100 ring-1 ring-cyan-400/40 hover:bg-cyan-500/25 disabled:opacity-50"
                >
                  录制约 {REEL_SECONDS}s 并导出
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="stop-reel"
                  onClick={stopRecording}
                  className="min-h-11 rounded-lg bg-rose-500/20 text-sm text-rose-100 ring-1 ring-rose-400/50"
                >
                  停止录制
                </button>
              )}
            </div>
            {recordHint && (
              <p
                data-testid="record-hint"
                className="mt-2 text-xs text-amber-100/90"
              >
                {recordHint}
              </p>
            )}
            <ul
              data-testid="reel-guidance"
              className="mt-3 list-disc space-y-1.5 pl-4 text-xs leading-relaxed text-zinc-400"
            >
              {reelTips.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>
        </aside>
      </div>

      <section className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
        <h2 className="font-mono text-sm text-cyan-300">Hard acceptance</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-300">
          {demo.acceptance.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>
            当前样例：{sample.label}（{sample.labelEn}）· 模式：
            {renderMode === "proxy" ? "代理兜底" : "样例"}
          </li>
          <li>
            实测 TTI：{formatTti(ttiMs)}（预算 {'<'}{TTI_BUDGET_MS / 1000}s；CI：
            <span className="font-mono">npm run test:e2e:turntable</span>）
          </li>
          <li>
            正式 reel：
            <a href={REEL_ASSET_PATH} className="text-cyan-400 hover:underline">
              {REEL_ASSET_PATH}
            </a>
          </li>
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
