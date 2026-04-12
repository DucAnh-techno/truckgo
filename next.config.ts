import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
    ],
    domains: [     
      "via.placeholder.com",
      "www.hyundaisg.vn"],
  },
};

export default nextConfig;
