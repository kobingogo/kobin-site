import type { Metadata } from "next";
import { DemoStub } from "@/components/demos/DemoStub";
import { DEMOS } from "@/lib/demos";

const demo = DEMOS.find((d) => d.slug === "product-turntable")!;

export const metadata: Metadata = {
  title: demo.title,
  description: demo.pitch,
};

export default function ProductTurntablePage() {
  return <DemoStub demo={demo} />;
}
