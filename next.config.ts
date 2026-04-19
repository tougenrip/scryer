import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  cacheComponents: true,
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Local stub for the unpublished `dnd-icons` package.
      // Matches both bare `dnd-icons` and subpaths like `dnd-icons/ability`.
      "dnd-icons": path.resolve(__dirname, "lib/stubs/dnd-icons"),
    };

    // Prevent AFRAME from being loaded (not needed for 2D graphs)
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "aframe": false,
        "react-force-graph-vr": false,
        "react-force-graph-ar": false,
      };
    }
    return config;
  },
};

export default nextConfig;
