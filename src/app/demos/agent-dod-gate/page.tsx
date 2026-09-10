import type { Metadata } from "next";
import { DemoStub } from "@/components/demos/DemoStub";
import {
  DEMOS,
  DOD_DELIVERABLE_IDS,
  DOD_FALSE_COMPLETE_CRITERIA,
} from "@/lib/demos";

const demo = DEMOS.find((d) => d.slug === "agent-dod-gate")!;

export const metadata: Metadata = {
  title: demo.title,
  description: demo.pitch,
};

export default function AgentDodGatePage() {
  return (
    <DemoStub
      demo={demo}
      extra={
        <>
          <section className="mt-6 rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-6">
            <h2 className="font-mono text-sm text-cyan-300">
              Deliverable ID 列表（预留）
            </h2>
            <ul className="mt-4 space-y-2 font-mono text-xs text-zinc-300 sm:text-sm">
              {DOD_DELIVERABLE_IDS.map((id) => (
                <li
                  key={id}
                  className="rounded-md border border-white/10 bg-black/40 px-3 py-2"
                >
                  {id}
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-2xl border border-rose-500/25 bg-rose-950/20 p-6">
            <h2 className="font-mono text-sm text-rose-300">
              假完成口径（命中任一 → 不绿）
            </h2>
            <ul className="mt-4 space-y-4">
              {DOD_FALSE_COMPLETE_CRITERIA.map((c) => (
                <li key={c.id}>
                  <p className="font-medium text-zinc-100">
                    <span className="font-mono text-xs text-rose-300/80">
                      {c.id}
                    </span>{" "}
                    · {c.label}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">{c.desc}</p>
                </li>
              ))}
            </ul>
          </section>
        </>
      }
    />
  );
}
