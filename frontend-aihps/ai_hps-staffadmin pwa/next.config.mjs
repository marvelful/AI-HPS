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
    const pipelineUrl = process.env.PIPELINE_API_URL || 'http://127.0.0.1:8020';
    const svc03Url = process.env.SVC03_API_URL || 'http://127.0.0.1:8003';
    const authUrl = process.env.AUTH_API_URL || 'http://127.0.0.1:8002';
    const analyticsUrl = process.env.ANALYTICS_API_URL || 'http://127.0.0.1:8005';
    const auditUrl = process.env.AUDIT_API_URL || 'http://127.0.0.1:8006';

    return [
      { source: '/api/pipeline/:path*', destination: `${pipelineUrl}/pipeline/:path*` },
      { source: '/api/svc03/:path*', destination: `${svc03Url}/:path*` },
      { source: '/api/auth/:path*', destination: `${authUrl}/auth/:path*` },
      { source: '/api/analytics/:path*', destination: `${analyticsUrl}/analytics/:path*` },
      { source: '/api/audit/:path*', destination: `${auditUrl}/audit/:path*` },
    ];
  },
};
export default nextConfig;
