
const dotenv = require('dotenv');
dotenv.config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  // productionBrowserSourceMaps: true,
  webpack: (config, { dev, isServer }) => {
    if (dev && isServer) {
      config.watchOptions = {
        ignored: /public/
      }
    }
    return config
  }
}

module.exports = nextConfig
