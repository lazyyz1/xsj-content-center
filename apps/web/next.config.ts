import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@content-center/core",
    "@content-center/db",
    "@content-center/providers",
    "@content-center/ui",
    "@content-center/worker",
  ],
};

export default nextConfig;
