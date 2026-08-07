/** @type {import('next').NextConfig} */
const AGENT_UPSTREAM =
  process.env.AGENT_SERVICE_URL?.trim() || "http://127.0.0.1:8000";

const nextConfig = {
  reactStrictMode: true,
  // pdf-parse v2 / pdfjs-dist / mammoth 需在 Node 运行时加载，避免被打包进 edge bundle
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],

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
