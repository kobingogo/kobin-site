"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { DEMOS } from "@/lib/demos";
import { HeroCanvasDynamic } from "./HeroCanvasDynamic";

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

export function HomeExperience() {
  const [progress, setProgress] = useState(0);
  const reduceMotion = useReducedMotion();
  const webglOk = useWebGLSupport();
  const canvasEnabled = webglOk && !reduceMotion;

  const onScroll = useCallback(() => {
    const el = document.documentElement;
    const max = el.scrollHeight - el.clientHeight;
    const p = max > 0 ? el.scrollTop / max : 0;
    setProgress(Math.min(1, Math.max(0, p)));
  }, []);

  useEffect(() => {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  return (
    <div className="relative min-h-screen">
      {/* Fixed full-viewport R3F layer (client-only via dynamic ssr:false) */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <HeroCanvasDynamic scrollProgress={progress} enabled={!!canvasEnabled} />
        {!canvasEnabled && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#164e63_0%,_#020617_60%)]" />
        )}
      </div>

      {/* Scrollable HTML overlay */}
      <div className="relative z-10">
        <section className="flex min-h-[88vh] flex-col justify-end px-4 pb-16 pt-24 sm:justify-center sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="font-mono text-xs uppercase tracking-[0.25em] text-cyan-400/90"
            >
              KobinFlow · Personal lab
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.05 }}
              className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl md:text-6xl"
            >
              jin kobin
              <span className="block text-2xl font-normal text-zinc-400 sm:text-3xl">
                3D × Agent 工作流实验场
              </span>
            </motion.h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-zinc-300 sm:text-lg">
              脚手架阶段：滚动驱动简易相机 scrub（后续接入 sen-style baked
              CameraAction GLB）。无 WebGL / 减少动效时内容仍可读。
            </p>
            {!canvasEnabled && (
              <p
                role="status"
                className="mt-4 max-w-xl rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
              >
                {reduceMotion
                  ? "已检测 prefers-reduced-motion：关闭 3D 画布，保留静态渐变背景。"
                  : "当前环境无 WebGL：使用静态降级背景，下方文案与作品卡片仍可浏览。"}
              </p>
            )}
            <div className="mt-8 h-1 w-40 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-cyan-400/80 transition-[width] duration-150"
                style={{ width: `${Math.round(progress * 100)}%` }}
                aria-hidden
              />
            </div>
            <p className="mt-2 font-mono text-[10px] text-zinc-500">
              scroll → camera scrub {Math.round(progress * 100)}%
            </p>
          </div>
        </section>

        <section id="about" className="border-t border-white/5 bg-black/55 px-4 py-20 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-mono text-sm text-cyan-300">About</h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">
              我是 jin kobin。KobinFlow 聚焦 Agent 交付闸门、材质 / 产品 3D
              预览与自然语言机械臂仿真。本站为个人作品与实验脚手架——先把路由、降级与验收口径钉死，再按
              DoD → material-spheres → turntable → robot-arm 顺序填实。
            </p>
          </div>
        </section>

        <section id="works" className="border-t border-white/5 bg-black/70 px-4 py-20 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-mono text-sm text-cyan-300">Works</h2>
            <p className="mt-2 text-sm text-zinc-500">
              实现顺序：3 → 4 → 1 → 2（见 README）；验收硬指标见各 demo。
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {DEMOS.map((demo) => (
                <Link
                  key={demo.slug}
                  href={demo.href}
                  className="group rounded-2xl border border-white/10 bg-zinc-950/80 p-5 transition hover:border-cyan-400/40 hover:bg-zinc-900/90"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                      #{demo.order} · {demo.status}
                    </span>
                    <span className="text-cyan-400 opacity-0 transition group-hover:opacity-100">
                      →
                    </span>
                  </div>
                  <h3 className="mt-3 text-lg font-medium text-zinc-50">
                    {demo.title}
                  </h3>
                  <p className="mt-1 text-xs text-zinc-500">{demo.titleEn}</p>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {demo.pitch}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="border-t border-white/5 bg-black/80 px-4 py-20 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl">
            <h2 className="font-mono text-sm text-cyan-300">Contact</h2>
            <p className="mt-4 max-w-xl text-zinc-300">
              占位：GitHub{" "}
              <a
                className="text-cyan-400 underline-offset-4 hover:underline"
                href="https://github.com/kobingogo"
                target="_blank"
                rel="noreferrer"
              >
                @kobingogo
              </a>
              。邮件 / 社媒链接后续补全（无表单、无付费 API）。
            </p>
          </div>
        </section>

        <footer className="border-t border-white/5 px-4 py-8 text-center font-mono text-xs text-zinc-600">
          © {new Date().getFullYear()} KobinFlow / jin kobin · scaffold MVP
        </footer>
      </div>
    </div>
  );
}
