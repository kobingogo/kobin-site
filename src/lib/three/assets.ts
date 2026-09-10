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
 * W1: intentionally empty. W2 registers home-world (≤8MB Draco);
 * W3 registers demo models after license verification (oss-picker).
 */
export const ASSETS: readonly AssetEntry[] = [];

export function getAsset(id: string): AssetEntry | undefined {
  return ASSETS.find((a) => a.id === id);
}

export function withinBudget(entry: AssetEntry, actualBytes: number): boolean {
  return actualBytes > 0 && actualBytes <= entry.budgetBytes;
}

export function budgetSlack(entry: AssetEntry, actualBytes: number): number {
  return entry.budgetBytes - actualBytes;
}
