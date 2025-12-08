import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false, // Deshabilitar para evitar doble montaje en desarrollo
  experimental: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'efiarbtzeotqfykaqpjq.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
    unoptimized: true,
  },
};

export default nextConfig;
