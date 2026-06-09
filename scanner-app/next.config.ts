import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/Flutter_Shell",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
