import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static headers removed to avoid conflicts with Middleware.
  // Middleware now handles CORS dynamically.
};

export default nextConfig;
