import { imageHosts } from './image-hosts.config.mjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  outputFileTracingRoot: process.cwd(),
  distDir: process.env.DIST_DIR || '.next',

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
    qualities: [75, 85, 100],
  },

  async rewrites() {
    return [
      { source: '/api/pipeline/:path*', destination: 'http://127.0.0.1:8020/pipeline/:path*' },
      { source: '/api/svc03/:path*', destination: 'http://127.0.0.1:8003/:path*' },
      { source: '/api/auth/:path*', destination: 'http://127.0.0.1:8002/auth/:path*' },
      { source: '/api/analytics/:path*', destination: 'http://127.0.0.1:8005/analytics/:path*' },
      { source: '/api/audit/:path*', destination: 'http://127.0.0.1:8006/audit/:path*' },
    ];
  },
};
export default nextConfig;
