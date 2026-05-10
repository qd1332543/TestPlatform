import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
};

if (process.env.VERCEL === "1") {
  nextConfig.turbopack = {
    root: __dirname.replace(/\/apps\/web$/, ""),
  };
} else {
  nextConfig.turbopack = {
    root: __dirname,
  };
}

export default nextConfig;
