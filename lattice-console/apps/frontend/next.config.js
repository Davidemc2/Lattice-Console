/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@lattice-console/trpc', '@lattice-console/utils'],
  async rewrites() {
    return [
      {
        source: '/api/trpc/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/trpc/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;