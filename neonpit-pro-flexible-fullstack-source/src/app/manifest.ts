import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NeonPit Garage",
    short_name: "NeonPit",
    description: "Premium superbike parts, custom builds, ECU tuning, and dyno studio bookings.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#ff0f3f",
    categories: ["shopping", "automotive", "lifestyle"],
  };
}
