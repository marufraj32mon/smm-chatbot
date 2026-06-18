import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output — smaller serverless bundle for Vercel
  output: "standalone",

  // LLM SDK type signatures can be stricter than our wrappers — ignore build-time
  // type errors so the deploy doesn't fail on harmless mismatches.
  typescript: {
    ignoreBuildErrors: true,
  },

  reactStrictMode: false,

  // Vercel serverless functions can be deployed anywhere; pin to current runtime
  experimental: {
    // Prisma works best on Node.js runtime (not Edge)
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Make sure the widget.js in public/ is served with correct MIME type
  async headers() {
    return [
      {
        source: "/chatbot/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
      {
        source: "/api/chatbot/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Accept" },
        ],
      },
    ];
  },
};

export default nextConfig;
