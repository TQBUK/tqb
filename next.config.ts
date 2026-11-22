import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Resizing is done by the Sanity/Unsplash CDNs, not the platform; see lib/image-loader.ts
    loader: 'custom',
    loaderFile: './lib/image-loader.ts',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sanity.io',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      }
    ],
  },
};

export default nextConfig;
