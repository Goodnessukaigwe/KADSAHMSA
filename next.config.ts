import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingExcludes: {
    "*": ["./prototype/**/*", "./content/**/*"],
  },
};

export default nextConfig;
