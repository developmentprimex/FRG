import path from "node:path";
import { fileURLToPath } from "node:url";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default function nextConfig(phase) {
  return {
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    // A stray lockfile in the home directory made Next treat it as the workspace root.
    outputFileTracingRoot: projectRoot,
    turbopack: { root: projectRoot },
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
        ...["img", "jpg", "plans", "video", "product-info"].map((folder) => ({
          source: `/${folder}/:path*`,
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=86400, stale-while-revalidate=604800",
            },
          ],
        })),
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
