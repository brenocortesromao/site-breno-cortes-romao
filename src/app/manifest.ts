import type { MetadataRoute } from "next";

/** Manifest do site. O nome nunca é abreviado. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Breno Côrtes Romão | Fractional Brand & Creative Director",
    short_name: "Breno Côrtes Romão",
    description: "Fractional Brand & Creative Director",
    start_url: "/pt",
    display: "browser",
    background_color: "#050505",
    theme_color: "#050505",
    icons: [
      { src: "/icone/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icone/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
