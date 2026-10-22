import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the rubric JSON files are bundled with the API routes on Vercel.
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/rubrics/**/*"],
  },
};

export default nextConfig;
