import type { Metadata } from "next";
import { DemoStub } from "@/components/demos/DemoStub";
import { DEMOS } from "@/lib/demos";

const demo = DEMOS.find((d) => d.slug === "robot-arm")!;

export const metadata: Metadata = {
  title: demo.title,
  description: demo.pitch,
};

export default function RobotArmPage() {
  return <DemoStub demo={demo} />;
}
