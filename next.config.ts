import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compiler: {
    removeConsole: {
      exclude: ["error"], // console.error는 유지
    },
  },
};

export default nextConfig;
