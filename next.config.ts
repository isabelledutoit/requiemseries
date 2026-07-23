import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Off intentionally: the Requiem landing is served as its exact static HTML.
  reactStrictMode: false,
  typedRoutes: false,
  images: {
    // Portfolio images live in Vercel Blob; allow next/image to optimize them.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
    // Serve AVIF first (smallest), WebP fallback.
    formats: ["image/avif", "image/webp"],
  },
  async rewrites() {
    return {
      // Serve the byte-faithful Requiem landing at "/" (it lives in
      // public/requiem.html). Everything else is handled by the App Router.
      beforeFiles: [{ source: "/", destination: "/requiem.html" }],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
