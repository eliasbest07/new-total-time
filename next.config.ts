import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Deshabilitar para evitar doble montaje en desarrollo
  experimental: {},
  images: {
    domains: ['efiarbtzeotqfykaqpjq.supabase.co'],
    unoptimized: true,
  },
};

export default nextConfig;
