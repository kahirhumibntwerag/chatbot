import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Add more routes as needed; keeping minimal to avoid crawling private/chat threads
  const routes: Array<{ url: string; lastModified?: string; changeFrequency?: MetadataRoute.Sitemap[0]["changeFrequency"]; priority?: number; }> = [
    { url: `${siteUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/chat`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/signup`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const today = new Date().toISOString();
  return routes.map((r) => ({ ...r, lastModified: r.lastModified ?? today }));
}


