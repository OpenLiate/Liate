import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://openliate.tech";
  const lastModified = new Date();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/docs`,
      lastModified,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: "https://github.com/OpenLiate/Liate",
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
