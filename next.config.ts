import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Avoid bundling node-only deps pulled by wallet libs
  serverExternalPackages: ["pino", "thread-stream"],
};

export default nextConfig;
