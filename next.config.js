/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Codespaces에서는 서버 모드로 실행
  output: process.env.CODESPACES ? 'standalone' : 'standalone',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig