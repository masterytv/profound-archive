import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    // Set the absolute path for the Turbopack root directory.
    root: '/home/user/studio',
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        port: "",
        pathname: "/**",
      },
    ],
  },
  allowedDevOrigins: [
    "https://9000-firebase-studio-1760015055395.cluster-j3txs2guavbhgth3nz5qsaq5gi.cloudworkstations.dev",
  ],
};

export default nextConfig;
