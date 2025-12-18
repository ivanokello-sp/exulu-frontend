/** @type {import('next').NextConfig} */


const config = {
  productionBrowserSourceMaps: true,
  images: {
    domains: ["img.clerk.com", "replicate.delivery", "www.1822direkt.de", "1822direkt.de", "localhost"],
  },
  experimental: {
    serverComponentsExternalPackages: [
      "sharp",
      "onnxruntime-node",
      "graphql",
      "mongoose",
      "graphql-compose-mongoose",
      "graphql-compose",
    ],
  }
};

if (process.env.DOCKER) {
  config.output = "standalone";
}

module.exports = config;
