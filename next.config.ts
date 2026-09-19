import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination:
          process.env.BACKEND_URL ||
          'https://bisara-production.up.railway.app/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
