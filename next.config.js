
const dotenv = require('dotenv');
dotenv.config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { dev, isServer }) => {
    if (dev && isServer) {
      config.watchOptions = {
        ignored: /public/
      }
    }
    config.resolve.fallback = { fs: false };
    return config
  }
}

module.exports = nextConfig
