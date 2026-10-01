import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Drop Watcher",
    short_name: "Drops",
    description: "Restocks, Pokémon drops and hype, Edmonton",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0d10",
    theme_color: "#0d0d10",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
