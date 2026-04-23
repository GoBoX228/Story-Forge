/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: ['lucide-react']
  },
  // Keep dev and production artifacts isolated to avoid chunk mismatch
  // when `next dev` and `next build` are run in the same container.
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev'
};

module.exports = nextConfig;
