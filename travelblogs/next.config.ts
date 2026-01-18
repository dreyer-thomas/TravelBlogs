import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  experimental: {
    // Increase body size limit for video uploads (100MB)
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;
