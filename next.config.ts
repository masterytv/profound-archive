import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.youtube.com https://www.googletagmanager.com https://www.google-analytics.com https://static.cloudflareinsights.com https://*.kit.com https://*.convertkit.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://i.ytimg.com https://yt3.ggpht.com https://yt3.googleusercontent.com https://vnycavclrndjwmpaugju.supabase.co https://images.unsplash.com https://placehold.co https://picsum.photos https://*.filekitcdn.com https://unpkg.com",
              "font-src 'self' https://fonts.gstatic.com",
              "frame-src 'self' https://www.youtube.com",
              "connect-src 'self' https://vnycavclrndjwmpaugju.supabase.co wss://vnycavclrndjwmpaugju.supabase.co https://api.openai.com https://www.google-analytics.com https://region1.google-analytics.com https://cloudflareinsights.com https://cdn.jsdelivr.net",
              "media-src 'self' https://vnycavclrndjwmpaugju.supabase.co data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join('; '),
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: "/quiz", destination: "/compass", permanent: true },
      { source: "/quiz/types", destination: "/compass/types", permanent: true },
      { source: "/chat", destination: "/chat-compassionate", permanent: true },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
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
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "yt3.ggpht.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "yt3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        // Supabase Storage — hero images, media bucket
        protocol: "https",
        hostname: "vnycavclrndjwmpaugju.supabase.co",
        port: "",
        pathname: "/storage/v1/object/public/**",
      }
    ]
  }
};

export default nextConfig;
