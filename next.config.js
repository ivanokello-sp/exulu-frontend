/** @type {import('next').NextConfig} */


const config = {
  productionBrowserSourceMaps: true,
  images: {
    domains: ["img.clerk.com", "replicate.delivery", "www.1822direkt.de", "1822direkt.de", "localhost"],
  },
  async rewrites() {
    return [
      {
        source: '/n8n',
        destination: 'http://localhost:5678',
      },
      {
        source: '/n8n/:path*',
        destination: 'http://localhost:5678/:path*',
      },
    ];
  },
};

if (process.env.DOCKER) {
  config.output = "standalone";
}

module.exports = config;
