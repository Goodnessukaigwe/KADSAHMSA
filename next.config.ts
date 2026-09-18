import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "./lib/security-headers";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["./prototype/**/*", "./content/**/*"],
  },
  serverExternalPackages: ["@napi-rs/canvas"],
    experimental: {
      serverActions: {
        bodySizeLimit: "85mb",
      },
      middlewareClientMaxBodySize: 85 * 1024 * 1024,
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
