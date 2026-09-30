import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: monorepoRoot,
  allowedDevOrigins: ["192.168.1.42"],
  turbopack: {
    root: monorepoRoot,
  },
};

export default nextConfig;
