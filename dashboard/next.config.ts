import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow embedding DistrictDx on portfolio (and self)
  // CSP frame-ancestors controls who can embed via <iframe>
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            // Allow self + portfolio domain to embed via iframe
            key: "Content-Security-Policy",
            value: [
              "frame-ancestors 'self' https://www.sourabhpradhan.in https://sourabhpradhan.in https://districtdx.sourabhpradhan.in",
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https:",
              "connect-src 'self' https:",
              "frame-src 'self' https://www.sourabhpradhan.in https://sourabhpradhan.in",
            ].join("; "),
          },
          // Override default X-Frame-Options to allow portfolio embedding
          // Next.js defaults to SAMEORIGIN — we explicitly allow embedding on portfolio
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "credentialless",
          },
        ],
      },
      // Cache static data assets for performance (SEO Core Web Vitals)
      {
        source: "/data/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "https://www.sourabhpradhan.in",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, OPTIONS",
          },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          {
            key: "Content-Type",
            value: "text/plain; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
  // Redirect old vercel.app domain if accessed via custom middleware? Keep SEO-friendly
  async redirects() {
    return [
      // www -> apex canonical handled by hosting, but keep Next-side fallback
    ];
  },
  // Image optimization (OG images, icon)
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "districtdx.sourabhpradhan.in",
      },
      {
        protocol: "https",
        hostname: "www.sourabhpradhan.in",
      },
    ],
  },
  // Compression & performance
  compress: true,
  poweredByHeader: false,
  // Allow trailing slash flexibility for embedding
  trailingSlash: false,
};

export default nextConfig;
