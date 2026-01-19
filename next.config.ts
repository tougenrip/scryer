import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  webpack: (config, { isServer }) => {
    // Prevent AFRAME from being loaded (not needed for 2D graphs)
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'aframe': false,
        'react-force-graph-vr': false,
        'react-force-graph-ar': false,
      };
    }
    return config;
  },
};

export default nextConfig;
