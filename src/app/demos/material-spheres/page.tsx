import type { Metadata } from "next";
import { MaterialSpheresDemo } from "@/components/demos/MaterialSpheresDemo";
import { DEMOS } from "@/lib/demos";

const demo = DEMOS.find((d) => d.slug === "material-spheres")!;

export const metadata: Metadata = {
  title: demo.title,
  description: demo.pitch,
};

export default function MaterialSpheresPage() {
  return <MaterialSpheresDemo />;
}
