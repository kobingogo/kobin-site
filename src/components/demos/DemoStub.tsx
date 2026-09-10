import type { ReactNode } from "react";
import Link from "next/link";
import type { DemoMeta } from "@/lib/demos";

type Props = {
  demo: DemoMeta;
  extra?: ReactNode;
};

export function DemoStub({ demo, extra }: Props) {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-4 py-10">
      <p className="mb-2 font-mono text-xs uppercase tracking-widest text-cyan-400/80">
        Demo · 状态「{demo.status}」· 实现顺序 #{demo.order}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
        {demo.title}
      </h1>
      <p className="mt-2 text-sm text-zinc-500">{demo.titleEn}</p>
      <p className="mt-6 text-lg leading-relaxed text-zinc-300">{demo.pitch}</p>

      <section className="mt-10 rounded-2xl border border-white/10 bg-zinc-900/60 p-6">
        <h2 className="font-mono text-sm text-cyan-300">Hard acceptance</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-300">
          {demo.acceptance.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-950/20 p-6">
        <h2 className="font-mono text-sm text-amber-300">Paid API / TODO</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-zinc-300">
          {demo.paidApiNotes.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      {extra}

      <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-6">
        <h2 className="font-mono text-sm text-zinc-400">Failure / mobile skeleton</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-400">
          <li>· 加载失败：展示可读错误 + 重试，不白屏</li>
          <li>· WebGL 不可用 / prefers-reduced-motion：静态说明 + 验收清单仍可读</li>
          <li>· 窄屏：单列布局，导航可横滑，触控目标 ≥44px 预留</li>
        </ul>
      </section>

      <p className="mt-10">
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
