import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost:3000"],
  devIndicators: { position: "bottom-right" },
  serverExternalPackages: ["@react-email/components", "@react-email/render", "zxcvbn", "qrcode"],
  productionBrowserSourceMaps: false,
  images: {
    localPatterns: [
      {
        pathname: "/api/storage/**",
      },
      {
        pathname: "/images/**",
      },
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
};

export default withNextIntl(nextConfig);
