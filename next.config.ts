import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "./lib/security-headers";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["./prototype/**/*", "./content/**/*"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "85mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS.map(({ key, value }) => ({
          key,
          value,
        })),
      },
    ];
  },
};

export default nextConfig;
