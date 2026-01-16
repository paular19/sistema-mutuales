/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config, { isServer }) => {
    // Excluir templates de PDF del bundle del cliente
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@/lib/utils/pdf-templates': false,
        '@/lib/utils/documento-credito': false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
