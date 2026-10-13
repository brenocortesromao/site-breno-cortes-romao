import type { MetadataRoute } from "next";

/** Manifest do site (ícones gerados por scripts/build-og.mjs). O nome nunca é abreviado. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Breno Côrtes Romão | Fractional Brand & Creative Director",
    short_name: "Breno Côrtes Romão",
    description: "Fractional Brand & Creative Director",
    start_url: "/pt",
    display: "browser",
    background_color: "#050506",
    theme_color: "#050506",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
