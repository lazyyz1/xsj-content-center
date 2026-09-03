import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["jsdom"],
  turbopack: {},
  transpilePackages: [
    "@content-center/core",
    "@content-center/db",
    "@content-center/providers",
    "@content-center/ui",
    "@content-center/worker",
  ],
  webpack(config, { isServer }) {
    if (isServer) {
      const externals = Array.isArray(config.externals) ? config.externals : [];
      config.externals = [...externals, { jsdom: "commonjs jsdom" }];
    }
    return config;
  },
};

export default nextConfig;
