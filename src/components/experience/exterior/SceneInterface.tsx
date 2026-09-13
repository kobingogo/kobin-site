"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { COPY } from "@/lib/copy";
import { DEMOS } from "@/lib/demos";
import type { SceneView } from "./types";

const VIEWS: { id: SceneView; index: string; label: string }[] = [
  { id: "home", index: "00", label: "HOME" },
  { id: "about", index: "01", label: "ABOUT" },
  { id: "works", index: "02", label: "WORKS" },
  { id: "contact", index: "03", label: "CONTACT" },
];

function Brackets({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden className="text-cyan-300/55">[</span>
      {children}
      <span aria-hidden className="text-cyan-300/55">]</span>
    </span>
  );
}

export function SceneInterface({
  view,
  activationCount,
  hoveredProject,
  eclipseActive,
  onViewChange,
  onProjectHover,
}: {
  view: SceneView;
  activationCount: number;
  hoveredProject: number | null;
  eclipseActive: boolean;
  onViewChange: (view: SceneView) => void;
  onProjectHover: (index: number | null) => void;
}) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      if (event.target instanceof HTMLElement && event.target.closest("input, textarea, select, [contenteditable=true]")) return;
      if (event.key === "Escape") onViewChange("home");
      const index = Number(event.key) - 1;
      if (index >= 0 && index < VIEWS.length) onViewChange(VIEWS[index].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onViewChange]);

  return (
      <div data-testid="scene-interface" data-eclipse={eclipseActive ? "active" : "idle"} className="pointer-events-none absolute inset-0 z-20 select-none overflow-hidden text-zinc-100">
        <div aria-hidden className={`eclipse-vignette ${eclipseActive ? "eclipse-vignette--active" : ""}`} />
        <div
          aria-live="polite"
          aria-hidden={!eclipseActive}
          className={`absolute left-1/2 top-7 -translate-x-1/2 border-x border-amber-300/30 px-5 py-1.5 font-mono text-[9px] tracking-[0.28em] text-amber-100 transition duration-700 ${eclipseActive ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"}`}
        >
          ORBITAL ECLIPSE · ALIGNMENT LOCKED
        </div>
        <div className="orbital-brand absolute left-4 top-4 flex items-center gap-3 font-mono text-[10px] tracking-[0.25em] text-cyan-200 sm:left-8 sm:top-7">
          <span className="h-1.5 w-1.5 motion-safe:animate-pulse rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />
          KOBINFLOW / ORBITAL NODE
        </div>

        {view === "home" ? null : <div className="orbital-status absolute right-4 top-4 hidden text-right font-mono text-[9px] leading-5 tracking-[0.18em] text-slate-500 sm:right-8 sm:top-7 sm:block">
          <div className={activationCount > 0 ? "text-cyan-200" : undefined}>
            CORE {activationCount > 0 ? "ONLINE" : "STANDBY"} · LINK 07-A
          </div>
          <div className={activationCount >= 3 ? "text-fuchsia-300" : "text-amber-200/70"}>
            {eclipseActive
              ? "CORONA EVENT · 06.8 SEC"
              : activationCount >= 3
                ? "ANOMALY DETECTED · VECTOR 03"
                : "拖拽环视 · 滚轮缩放"}
          </div>
        </div>}

        <div
          className={view === "home"
            ? "orbital-home-copy pointer-events-auto absolute left-5 right-5 top-[14vh] px-1 sm:left-[7vw] sm:right-auto sm:top-[17.5vh] sm:w-[min(38rem,48vw)]"
            : "scene-panel-shell pointer-events-auto absolute left-4 right-4 top-[38%] max-h-[calc(62%-6rem)] touch-pan-y overflow-y-auto overscroll-contain px-5 py-4 sm:left-[7vw] sm:right-auto sm:top-[18vh] sm:max-h-[calc(82%-6rem)] sm:w-[min(30rem,43vw)] sm:px-7 sm:py-6"}
          data-testid="scene-panel"
        >
          {view === "home" ? null : (
            <div className="mb-3 flex items-center gap-3 font-mono text-[10px] tracking-[0.24em] text-cyan-300/70">
              <span>{VIEWS.find((item) => item.id === view)?.index}</span>
              <span className="h-px flex-1 bg-cyan-300/20" />
              <span>{view.toUpperCase()}</span>
            </div>
          )}

          {view === "home" ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-cyan-300/85 sm:text-[11px]">
                {COPY.heroEyebrow}
              </p>
              <h1 className="orbital-home-title mt-4 max-w-2xl text-[2.05rem] font-medium leading-[1.08] tracking-[-0.045em] text-white sm:mt-5 sm:text-[clamp(2.6rem,4.4vw,4.6rem)]">
                {COPY.heroTitle}
              </h1>
              <p className="mt-4 max-w-md text-[13px] leading-6 text-slate-400 sm:mt-5 sm:text-[15px] sm:leading-7">
                {COPY.heroSub}
              </p>
              <button
                type="button"
                onClick={() => onViewChange("works")}
                data-cursor-label="ENTER"
                className="orbital-entry mt-5 inline-flex items-center py-2 font-mono text-[10px] tracking-[0.22em] text-cyan-200 transition hover:text-white focus:outline-none focus:ring-1 focus:ring-cyan-300 sm:mt-7 sm:text-[11px]"
              >
                <span aria-hidden className="mr-4 h-px w-10 bg-cyan-300/70 transition-all duration-300" />
                探索作品轨道 <span aria-hidden className="ml-3 text-cyan-300">→</span>
              </button>
            </div>
          ) : null}

          {view === "about" ? (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">关于我</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300 sm:mt-5 sm:text-base sm:leading-7">
                {COPY.about}
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[10px] tracking-wider text-cyan-100/75 sm:mt-6 sm:text-xs">
                <span className="border-t border-cyan-300/25 pt-2">AI AGENT</span>
                <span className="border-t border-cyan-300/25 pt-2">EVAL</span>
                <span className="border-t border-cyan-300/25 pt-2">HCI</span>
              </div>
            </div>
          ) : null}

          {view === "works" ? (
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white sm:text-3xl">作品轨道</h1>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
                {DEMOS.map((demo, index) => (
                  <button
                    key={demo.slug}
                    type="button"
                    onClick={() => router.push(demo.href)}
                    onPointerEnter={() => onProjectHover(index)}
                    onPointerLeave={() => onProjectHover(null)}
                    data-cursor-label="OPEN"
                    className={`group min-h-[4.5rem] border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-300 sm:min-h-[6.2rem] sm:p-4 ${
                      hoveredProject === index
                        ? "-translate-y-0.5 border-amber-300/55 bg-amber-950/20"
                        : "border-white/10 bg-slate-950/75 hover:-translate-y-0.5 hover:border-cyan-300/45 hover:bg-cyan-950/35"
                    }`}
                  >
                    <span className="font-mono text-[9px] tracking-[0.16em] text-cyan-300/65 sm:text-[10px]">
                      NODE 0{demo.order}
                    </span>
                    <span className="mt-1 block text-xs font-medium leading-4 text-zinc-100 sm:mt-2 sm:text-sm">
                      {demo.title}
                    </span>
                    <span className="mt-1 hidden font-mono text-[9px] text-emerald-300/70 sm:block">
                      EVAL VERIFIED · OPEN ↗
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {view === "contact" ? (
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-4xl">建立通讯</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300 sm:mt-5 sm:text-base">
                想聊合作、Agent 产品或验收标准，可以从 X 发来一条信号。
              </p>
              <a
                href={COPY.contactXHref}
                target="_blank"
                rel="noreferrer"
                data-cursor-label="TRANSMIT"
                className="mt-5 inline-flex border border-amber-300/40 bg-amber-300/10 px-4 py-2.5 font-mono text-xs tracking-[0.13em] text-amber-100 transition hover:border-amber-200 hover:bg-amber-300/20 focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <Brackets>X {COPY.contactXHandle} ↗</Brackets>
              </a>
            </div>
          ) : null}
        </div>

        <nav
          aria-label="场景导航"
          data-testid="scene-nav"
          className="orbital-nav pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 px-1 sm:bottom-7 sm:left-auto sm:right-[6vw] sm:translate-x-0"
        >
          {VIEWS.map((item) => {
            const active = item.id === view;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => onViewChange(item.id)}
                data-cursor-label="NAV"
                className={`orbital-nav__item relative min-w-[4.4rem] px-2 py-2 text-left font-mono transition focus:outline-none focus:ring-1 focus:ring-inset focus:ring-cyan-200 sm:min-w-[5.7rem] sm:px-3 ${
                  active
                    ? "text-cyan-100"
                    : "text-slate-500 hover:text-slate-200"
                }`}
              >
                <span className="block text-[8px] text-cyan-300/50 sm:text-[9px]">{item.index}</span>
                <span className="block text-[10px] tracking-[0.1em] sm:text-[11px] sm:tracking-[0.18em]">{item.label}</span>
                <span aria-hidden className={`orbital-nav__signal ${active ? "orbital-nav__signal--active" : ""}`} />
              </button>
            );
          })}
        </nav>

        <div aria-hidden className="absolute bottom-0 left-0 h-px w-[18vw] bg-cyan-300/35" />
        <div aria-hidden className="absolute bottom-0 right-0 h-px w-[18vw] bg-cyan-300/35" />
      </div>
  );
}
