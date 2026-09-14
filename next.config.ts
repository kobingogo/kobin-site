import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep production/e2e output isolated from a concurrently running `next dev`.
  // Next dev rewrites `.next`; without this switch it can corrupt a test server.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
