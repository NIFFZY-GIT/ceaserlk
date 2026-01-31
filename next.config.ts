import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      // Add other common image providers that might be used
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.shopify.com',
        port: '',
        pathname: '/**',
      },
      // Add Replicate delivery domain for AI-generated images
      {
        protocol: 'https',
        hostname: 'replicate.delivery',
        port: '',
        pathname: '/**',
      },
      // Production domain
      {
        protocol: 'https',
        hostname: 'www.inceasar.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'inceasar.com',
        port: '',
        pathname: '/**',
      },
      // Add localhost for development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3001',
        pathname: '/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/**',
      },
    ],
    // Allow blob: URLs for image previews before upload
    dangerouslyAllowSVG: false,
    contentDispositionType: 'inline',
    // Increase timeout for slower VPS connections
    minimumCacheTTL: 60,
  },
  // Increase body size limit for file uploads on VPS
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    proxyClientMaxBodySize: 100 * 1024 * 1024, // 100MB for uploads
  },
};

export default nextConfig;
