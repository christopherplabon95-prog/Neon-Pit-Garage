import { db } from "@/db";
import { products } from "@/db/schema";
import { ensureSeeded } from "@/lib/seed";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  await ensureSeeded();
  const { slug } = await params;
  const product = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (!product) return { title: "Product not found | NeonPit" };
  return {
    title: `${product.name} | NeonPit Garage`,
    description: product.description,
    openGraph: { title: product.name, description: product.description, images: [product.imageUrl] },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  await ensureSeeded();
  const { slug } = await params;
  const product = await db.query.products.findFirst({ where: eq(products.slug, slug) });
  if (!product) notFound();

  return (
    <main className="product-detail-page">
      <a className="back-link" href="/">← Back to pit lane</a>
      <section className="detail-hero neon-card" style={{ "--accent": product.accent } as CSSProperties}>
        <img src={product.imageUrl} alt={product.name} />
        <div>
          <p className="eyebrow">{product.category}</p>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="detail-price">{(product.priceCents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</div>
          <div className="detail-stats"><span>{product.inventory} in stock</span><span>+{product.horsepowerGain} hp</span><span>Race-fit verified</span></div>
          <a className="neon-button" href="/#shop">Add from catalog</a>
        </div>
      </section>
      <section className="spec-panel section-edge">
        <p className="eyebrow">Illuminated specs</p>
        <h2>Tachometer-grade details</h2>
        <div className="spec-grid">
          {Object.entries(product.specs).map(([key, value]) => (
            <div className="neon-card" key={key}><span>{key}</span><strong>{value}</strong></div>
          ))}
        </div>
      </section>
    </main>
  );
}
