import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@showcase/core", "@showcase/three"],
  reactStrictMode: true,
};

export default nextConfig;
