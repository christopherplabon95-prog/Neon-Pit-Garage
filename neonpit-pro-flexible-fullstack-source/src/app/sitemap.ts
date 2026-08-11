import type { MetadataRoute } from "next";
import { db } from "@/db";
import { products } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await ensureSeeded();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://neonpit.example";
  const rows = await db.select({ slug: products.slug, updatedAt: products.createdAt }).from(products);
  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/#shop`, lastModified: new Date(), changeFrequency: "daily", priority: .9 },
    ...rows.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.updatedAt,
      changeFrequency: "weekly" as const,
      priority: .8,
    })),
  ];
}
