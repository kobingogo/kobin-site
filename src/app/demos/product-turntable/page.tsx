import type { Metadata } from "next";
import { ProductTurntableDemo } from "@/components/demos/ProductTurntableDemo";
import { DEMOS } from "@/lib/demos";

const demo = DEMOS.find((d) => d.slug === "product-turntable")!;

export const metadata: Metadata = {
  title: demo.title,
  description: demo.pitch,
};

export default function ProductTurntablePage() {
  return <ProductTurntableDemo />;
}
