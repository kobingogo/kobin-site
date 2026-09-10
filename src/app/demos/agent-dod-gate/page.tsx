import type { Metadata } from "next";
import { AgentDodGateDemo } from "@/components/demos/AgentDodGateDemo";
import { DEMOS } from "@/lib/demos";

const demo = DEMOS.find((d) => d.slug === "agent-dod-gate")!;

export const metadata: Metadata = {
  title: demo.title,
  description: demo.pitch,
};

export default function AgentDodGatePage() {
  return <AgentDodGateDemo />;
}
