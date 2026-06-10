import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;