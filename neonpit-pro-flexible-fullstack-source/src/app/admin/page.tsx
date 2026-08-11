import { db } from "@/db";
import { bookings, contacts, orders, products, projects, siteSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/server-auth";
import { ensureSeeded } from "@/lib/seed";
import { desc } from "drizzle-orm";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await ensureSeeded();
  const admin = await requireAdmin();

  if (!admin) {
    return (
      <main className="admin-page locked">
        <a className="back-link" href="/">← Back to storefront</a>
        <section className="neon-card lock-card">
          <p className="eyebrow">Admin access required</p>
          <h1>Command center locked.</h1>
          <p>Sign in on the homepage using the seeded admin credentials, then return here.</p>
          <a className="neon-button" href="/#auth">Go to login</a>
        </section>
      </main>
    );
  }

  const [productRows, orderRows, bookingRows, projectRows, contactRows, settings] = await Promise.all([
    db.query.products.findMany({ orderBy: [desc(products.createdAt)] }),
    db.query.orders.findMany({ orderBy: [desc(orders.createdAt)], limit: 30 }),
    db.query.bookings.findMany({ orderBy: [desc(bookings.createdAt)], limit: 30 }),
    db.query.projects.findMany({ orderBy: [desc(projects.createdAt)] }),
    db.query.contacts.findMany({ orderBy: [desc(contacts.createdAt)], limit: 30 }),
    db.query.siteSettings.findFirst({ orderBy: [desc(siteSettings.updatedAt)] }),
  ]);

  return <AdminClient products={productRows} orders={orderRows} bookings={bookingRows} projects={projectRows} contacts={contactRows} settings={settings!} />;
}
