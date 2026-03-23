import type { MetadataRoute } from "next";

import { APP_META } from "@/lib/app-meta";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_META.displayName,
    short_name: APP_META.shortName,
    description: APP_META.description,
    start_url: "/",
    display: "standalone",
    background_color: "#0f0f0f",
    theme_color: "#0f0f0f",
    categories: ["productivity", "developer", "business"],
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
