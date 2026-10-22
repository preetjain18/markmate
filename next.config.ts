import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Make sure the catalog, rubric and question JSON files are bundled with the server code on Vercel.
  outputFileTracingIncludes: {
    "/api/**/*": ["./data/catalog.json", "./data/rubrics/**/*", "./data/questions/**/*"],
    "/practice": ["./data/catalog.json", "./data/rubrics/**/*", "./data/questions/**/*"],
  },
};

export default nextConfig;
