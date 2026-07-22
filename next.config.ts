import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Off intentionally: the Requiem landing is served as its exact static HTML.
  reactStrictMode: false,
  typedRoutes: false,
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
