/** @type {import('next').NextConfig} */
const AGENT_UPSTREAM =
  process.env.AGENT_SERVICE_URL?.trim() || "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  // Keep native PDF/Word libs out of the webpack graph (Vercel + Node runtime)
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],

  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // pdf-parse v2 worker ESM has no webpack-friendly entry
      "pdf-parse/worker": false,
    };
    return config;
  },

  /**
   * Browser → /api/agent/* → local Agent (avoids HTTPS→HTTP mixed content)
   * e.g. /api/agent/health → http://127.0.0.1:8000/health
   */
  async rewrites() {
    const base = AGENT_UPSTREAM.replace(/\/$/, "");
    return [
      {
        source: "/api/agent",
        destination: `${base}/`,
      },
      {
        source: "/api/agent/:path*",
        destination: `${base}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

  /**
   * Browser → /api/agent/* → local Agent (avoids HTTPS→HTTP mixed content)
   * e.g. /api/agent/health → http://127.0.0.1:8000/health
   */
  async rewrites() {
    const base = AGENT_UPSTREAM.replace(/\/$/, "");
    return [
      {
        source: "/api/agent",
        destination: `${base}/`,
      },
      {
        source: "/api/agent/:path*",
        destination: `${base}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
