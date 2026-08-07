/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // pdf-parse v2 / pdfjs-dist / mammoth 需在 Node 运行时加载，避免被打包进 edge bundle
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "mammoth"],
};

module.exports = nextConfig;
