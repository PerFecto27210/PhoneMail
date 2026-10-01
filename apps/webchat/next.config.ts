import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@phonemail/ui"],
  output: "standalone",
};

export default nextConfig;
