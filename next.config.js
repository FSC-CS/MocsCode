/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    LIVEBLOCKS_PUBLIC_KEY: process.env.VITE_LIVEBLOCKS_PUBLIC_KEY,
    LIVEBLOCKS_SECRET_KEY: process.env.LIVEBLOCKS_SECRET_KEY,
  },
  async rewrites() {
    return [
      // Rewrite API requests to the correct endpoint
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
