import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: projectRoot,
  },
  // Note: API routes have a hard 4.5MB limit in Next.js App Router
  // This is a known limitation. For larger files, consider:
  // 1. Direct upload to cloud storage (S3, Cloudinary)
  // 2. Chunked/streaming uploads
  // 3. Custom server with body-parser configuration
  experimental: {
    // Increase body size limit for video uploads (100MB)
    // This applies to Server Actions, not API routes
    serverActions: {
      bodySizeLimit: '100mb',
    },
    // Increase proxy/middleware body size limit for video uploads (100MB)
    proxyClientMaxBodySize: '100mb',
  },
};

export default nextConfig;
