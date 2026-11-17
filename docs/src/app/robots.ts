import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: [
          "Googlebot",
          "Bingbot",
          "GPTBot",
          "ClaudeBot",
          "PerplexityBot",
          "Applebot",
        ],
        allow: "/",
      },
    ],
    sitemap: "https://openliate.tech/sitemap.xml",
    host: "https://openliate.tech",
  };
}
