import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Static headers removed to avoid conflicts with Middleware.
  // Middleware now handles CORS dynamically.
};

export default nextConfig;
