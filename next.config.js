/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  images: {
    unoptimized: true,
  },
  // GitHub Pages를 위한 설정
  basePath: process.env.NODE_ENV === 'production' ? '/online-text-battle' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/online-text-battle' : '',
}

module.exports = nextConfig