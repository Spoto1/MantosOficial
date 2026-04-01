import type { NextConfig } from "next";

import { buildAllowedDevOrigins, buildNextImageRemotePatterns } from "./lib/runtime-config";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  allowedDevOrigins: buildAllowedDevOrigins(),
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: buildNextImageRemotePatterns()
  },
  outputFileTracingRoot: process.cwd()
};

export default nextConfig;
