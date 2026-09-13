"use client";

import { Component, type ReactNode } from "react";
import { DEMOS } from "@/lib/demos";

export class SceneErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section role="alert" className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-auto bg-slate-950 p-6 text-slate-100">
        <h1 className="text-2xl">轨道外景暂时无法加载</h1>
        <p>可以重试，或直接打开作品。</p>
        <button className="min-h-11 border border-cyan-300 px-5" onClick={() => window.location.reload()}>重新加载</button>
        <div className="grid gap-3 sm:grid-cols-2">
          {DEMOS.map((demo) => <a className="border border-white/20 p-3 underline" key={demo.slug} href={demo.href}>{demo.title}</a>)}
        </div>
      </section>
    );
  }
}
