/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    outputFileTracingRoot: undefined,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig