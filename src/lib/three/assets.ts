/** GLB asset registry — single source of truth for 3D assets (url / budget / license). */

export type AssetCompression = "draco" | "meshopt" | "none";

export type AssetEntry = {
  id: string;
  /** public/-relative URL of the GLB */
  url: string;
  /** Hard size budget in bytes (post-compression file on disk) */
  budgetBytes: number;
  compression: AssetCompression;
  /** e.g. "self-made (Blender)" or "CC0 — <source url>" */
  license: string;
  source?: string;
};

/**
 * Public runtime assets. Source models remain under src/assets/models and are
 * never fetched by the browser.
 */
export const ASSETS: readonly AssetEntry[] = [
  {
    id: "orbital-lab-exterior-lod0",
    url: "/assets/exterior/orbital-lab-lod0.glb",
    budgetBytes: 8 * 1024 * 1024,
    compression: "meshopt",
    license: "self-made from user-provided Hunyuan generation; Blender optimized",
    source: "src/assets/models/orbital-lab-exterior-source.glb",
  },
  {
    id: "orbital-lab-exterior-lod1",
    url: "/assets/exterior/orbital-lab-lod1.glb",
    budgetBytes: 4 * 1024 * 1024,
    compression: "meshopt",
    license: "self-made from user-provided Hunyuan generation; Blender optimized",
    source: "src/assets/models/orbital-lab-exterior-source.glb",
  },
  {
    id: "orbital-lab-exterior-lod2",
    url: "/assets/exterior/orbital-lab-lod2.glb",
    budgetBytes: 2 * 1024 * 1024,
    compression: "meshopt",
    license: "self-made from user-provided Hunyuan generation; Blender optimized",
    source: "src/assets/models/orbital-lab-exterior-source.glb",
  },
];

export function getAsset(id: string): AssetEntry | undefined {
  return ASSETS.find((a) => a.id === id);
}

export function withinBudget(entry: AssetEntry, actualBytes: number): boolean {
  return actualBytes > 0 && actualBytes <= entry.budgetBytes;
}

export function budgetSlack(entry: AssetEntry, actualBytes: number): number {
  return entry.budgetBytes - actualBytes;
}
