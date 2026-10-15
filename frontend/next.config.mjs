import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

export default function nextConfig(phase) {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    devIndicators: false,
    serverExternalPackages: ["ip-location-api"],
    outputFileTracingIncludes: {
      "/api/admin/kitchen-specifications/*/pdf": ["./data/kitchen-specifications/pdfs/*.[pP][dD][fF]"],
    },
    async headers() {
      return [
        {
          source: "/product-images/:path*",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=86400, stale-while-revalidate=604800",
            },
          ],
        },
        {
          source: "/AVATAR/:path*",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=86400, stale-while-revalidate=604800",
            },
          ],
        },
      ];
    },
  };
}
