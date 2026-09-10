"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { DEMOS } from "@/lib/demos";
import { COPY } from "@/lib/copy";
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
      <div className="pointer-events-none fixed inset-0 z-0">
        <HeroCanvasDynamic scrollProgress={progress} enabled={!!canvasEnabled} />
        {!canvasEnabled && (
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#164e63_0%,_#020617_60%)]" />
        )}
        {/* Soft vignette so HTML stays readable over Canvas */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(2,6,23,0.35)_55%,rgba(2,6,23,0.72)_100%)]"
        />
      </div>

      <div className="relative z-10">
        <section className="flex min-h-[88vh] flex-col justify-end px-4 pb-16 pt-24 sm:justify-center sm:pb-24">
          <div className="mx-auto max-w-6xl">
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="font-mono text-[11px] uppercase tracking-[0.28em] text-cyan-400/85"
            >
              {COPY.heroEyebrow}
            </motion.p>
            <motion.h1
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.04 }}
              className="mt-4 max-w-3xl text-[1.85rem] font-semibold leading-[1.2] tracking-tight text-white sm:text-4xl md:text-5xl md:leading-[1.15]"
            >
              {COPY.heroTitle}
            </motion.h1>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-zinc-300/95 sm:text-base"
            >
              {COPY.heroSub}
            </motion.p>
            {!canvasEnabled && (
              <p
                role="status"
                className="mt-4 max-w-xl rounded-lg border border-amber-500/30 bg-amber-950/40 px-3 py-2 text-sm text-amber-100"
              >
                {reduceMotion
                  ? COPY.degradeReducedMotion
                  : COPY.degradeNoWebGL}
              </p>
            )}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="#works"
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/35 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/55 hover:bg-cyan-500/15"
              >
                看 wave1 四个 demo
                <span aria-hidden>↓</span>
              </Link>
              <div className="h-1 w-36 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full bg-cyan-400/70 transition-[width] duration-150"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                  aria-hidden
                />
              </div>
              <p className="font-mono text-[10px] text-zinc-500">
                {COPY.scrollHint} {Math.round(progress * 100)}%
              </p>
            </div>
          </div>
        </section>

        <section
          id="about"
          className="border-t border-white/5 bg-slate-950/80 px-4 py-16 backdrop-blur-md sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/90">
              {COPY.aboutLabel}
            </h2>
            <p className="mt-4 max-w-2xl text-[1.05rem] leading-[1.75] text-zinc-300 sm:text-lg">
              {COPY.about}
            </p>
          </div>
        </section>

        <section
          id="works"
          className="border-t border-white/5 bg-black/75 px-4 py-16 backdrop-blur-md sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/90">
              {COPY.worksLabel}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-[0.95rem]">
              {COPY.worksIntro}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {DEMOS.map((demo) => {
                const cardCopy =
                  COPY.demoCards[demo.slug] ?? demo.pitch;
                return (
                  <Link
                    key={demo.slug}
                    href={demo.href}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/85 p-5 shadow-[0_0_0_1px_rgba(34,211,238,0.04)] transition hover:border-cyan-400/35 hover:bg-zinc-900/95 hover:shadow-[0_0_24px_-8px_rgba(34,211,238,0.25)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                        #{demo.order} · {demo.titleEn}
                      </span>
                      <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-300/90">
                        {COPY.evalBadge}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-medium tracking-tight text-zinc-50">
                      {demo.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                      {cardCopy}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-cyan-400/90 transition group-hover:text-cyan-300">
                      {COPY.openDemo}
                      <span
                        className="translate-x-0 transition group-hover:translate-x-0.5"
                        aria-hidden
                      >
                        →
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="contact"
          className="border-t border-white/5 bg-slate-950/90 px-4 py-16 backdrop-blur-md sm:py-20"
        >
          <div className="mx-auto max-w-6xl">
            <h2 className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-300/90">
              {COPY.contactLabel}
            </h2>
            <p className="mt-4 max-w-xl text-[0.95rem] leading-relaxed text-zinc-300">
              想聊合作或验收标准 →{" "}
              <a
                className="text-cyan-400 underline-offset-4 hover:underline"
                href={COPY.contactXHref}
                target="_blank"
                rel="noreferrer"
              >
                X {COPY.contactXHandle}
              </a>
              （邮箱位留给你之后填）。
            </p>
          </div>
        </section>

        <footer className="border-t border-white/5 px-4 py-8 text-center font-mono text-xs text-zinc-600">
          © {new Date().getFullYear()} {COPY.footer}
        </footer>
      </div>
    </div>
  );
}
