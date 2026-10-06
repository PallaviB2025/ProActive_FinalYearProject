import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: ["@proactive/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com", // Google profile avatars
      },
    ],
  },
  async rewrites() {
    const apiOrigin = process.env.API_ORIGIN ?? "http://127.0.0.1:4000";
    return [
      { source: "/api/auth/me", destination: `${apiOrigin}/auth/me` },
      { source: "/api/auth/login", destination: `${apiOrigin}/auth/login` },
      { source: "/api/auth/register", destination: `${apiOrigin}/auth/register` },
      { source: "/api/auth/logout", destination: `${apiOrigin}/auth/logout` },
      { source: "/api/auth/account", destination: `${apiOrigin}/auth/account` },
      { source: "/api/auth/webauthn", destination: `${apiOrigin}/auth/webauthn` },
      { source: "/api/auth/webauthn/:path*", destination: `${apiOrigin}/auth/webauthn/:path*` },
      {
        source: "/api/auth/:path*",
        destination: "/api/auth/:path*", // Keep NextAuth and bridge routes local
      },
      { source: "/api/:path*", destination: `${apiOrigin}/:path*` },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default config;
