"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";

type Product = {
  id: number; slug: string; name: string; category: string; description: string; specs: Record<string, string>;
  priceCents: number; inventory: number; horsepowerGain: number; imageUrl: string; accent: string; featured: boolean;
};
type Order = { id: string; customerName: string; customerEmail: string; totalCents: number; status: string; transactionId: string; provider: string; shippingAddress: string };
type Booking = { id: string; name: string; email: string; phone: string; bikeModel: string; status: string; selectedMods: string[]; notes: string; appointmentAt: Date | string };
type Project = { id: number; title: string; bikeModel: string; summary: string; beforeImageUrl: string; afterImageUrl: string; powerBefore: number; powerAfter: number; featured: boolean };
type Contact = { id: number; name: string; email: string; phone: string | null; message: string; handled: boolean; createdAt: Date | string };
type Settings = {
  id: number; storeName: string; announcement: string; heroEyebrow: string; heroTitle: string; heroSubtitle: string; heroImageUrl: string;
  locationName: string; address: string; latitude: string; longitude: string; phone: string; whatsapp: string; supportEmail: string;
  defaultCurrency: string; enabledCurrencies: string[]; currencyRates: Record<string, number>;
  businessHours: { openHour: number; closeHour: number; openDays: number[] }; instagramUrl: string;
};
type Tab = "overview" | "catalog" | "orders" | "bookings" | "projects" | "messages" | "settings";

const fallbackImage = "https://images.pexels.com/photos/33175721/pexels-photo-33175721.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200";
const orderStatuses = ["pending", "paid", "processing", "completed", "cancelled"];
const bookingStatuses = ["requested", "confirmed", "in_progress", "completed", "cancelled"];

async function requestJson<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Admin request failed.");
  return data;
}

function specsToText(specs: Record<string, string>) {
  return Object.entries(specs).map(([key, value]) => `${key}: ${value}`).join("\n");
}
function textToSpecs(value: FormDataEntryValue | null) {
  return Object.fromEntries(
    String(value || "")
      .split("\n")
      .map((line) => line.split(":"))
      .filter((parts) => parts.length > 1)
      .map(([key, ...rest]) => [key.trim(), rest.join(":").trim()])
      .filter(([key, item]) => key && item),
  );
}

export default function AdminClient({
  products: initialProducts,
  orders: initialOrders,
  bookings: initialBookings,
  projects: initialProjects,
  contacts,
  settings: initialSettings,
}: {
  products: Product[];
  orders: Order[];
  bookings: Booking[];
  projects: Project[];
  contacts: Contact[];
  settings: Settings;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [message, setMessage] = useState("All systems operational.");
  const [busy, setBusy] = useState(false);
  const [productRows, setProductRows] = useState(initialProducts);
  const [orderRows, setOrderRows] = useState(initialOrders);
  const [bookingRows, setBookingRows] = useState(initialBookings);
  const [projectRows, setProjectRows] = useState(initialProjects);
  const [settings, setSettings] = useState(initialSettings);
  const [productModal, setProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [projectModal, setProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const revenue = useMemo(() => orderRows.filter((order) => !["cancelled", "pending"].includes(order.status)).reduce((sum, order) => sum + order.totalCents, 0), [orderRows]);
  const lowStock = productRows.filter((product) => product.inventory <= 4).length;

  function notify(text: string) {
    setMessage(text);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      id: editingProduct?.id,
      name: form.get("name"), category: form.get("category"), description: form.get("description"), imageUrl: form.get("imageUrl"),
      priceCents: Math.round(Number(form.get("price")) * 100), inventory: Number(form.get("inventory")),
      horsepowerGain: Number(form.get("horsepowerGain")), accent: form.get("accent"), featured: form.get("featured") === "on",
      specs: textToSpecs(form.get("specs")),
    };
    setBusy(true);
    try {
      if (editingProduct) {
        const data = await requestJson<{ product: Product }>("/api/admin/products", "PATCH", body);
        setProductRows((rows) => rows.map((row) => row.id === data.product.id ? data.product : row));
        notify(`${data.product.name} updated successfully.`);
      } else {
        const data = await requestJson<{ product: Product }>("/api/admin/products", "POST", body);
        setProductRows((rows) => [data.product, ...rows]);
        notify(`${data.product.name} added to the live catalog.`);
      }
      setProductModal(false);
      setEditingProduct(null);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Product update failed.");
    } finally { setBusy(false); }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Remove ${product.name} from the catalog?`)) return;
    setBusy(true);
    try {
      await requestJson(`/api/admin/products?id=${product.id}`, "DELETE");
      setProductRows((rows) => rows.filter((row) => row.id !== product.id));
      notify(`${product.name} removed.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Delete failed."); }
    finally { setBusy(false); }
  }

  async function changeOrderStatus(id: string, status: string) {
    try {
      const data = await requestJson<{ order: Order }>("/api/admin/orders", "PATCH", { id, status });
      setOrderRows((rows) => rows.map((row) => row.id === id ? { ...row, status: data.order.status } : row));
      setMessage(`Order moved to ${status}.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Order update failed."); }
  }

  async function changeBookingStatus(id: string, status: string) {
    try {
      const data = await requestJson<{ booking: Booking }>("/api/admin/bookings", "PATCH", { id, status });
      setBookingRows((rows) => rows.map((row) => row.id === id ? { ...row, status: data.booking.status } : row));
      setMessage(`Booking moved to ${status.replace("_", " ")}.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Booking update failed."); }
  }

  async function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { id: editingProject?.id, ...Object.fromEntries(form.entries()), featured: form.get("featured") === "on" };
    setBusy(true);
    try {
      if (editingProject) {
        const data = await requestJson<{ project: Project }>("/api/admin/projects", "PATCH", body);
        setProjectRows((rows) => rows.map((row) => row.id === data.project.id ? data.project : row));
        notify(`${data.project.title} updated.`);
      } else {
        const data = await requestJson<{ project: Project }>("/api/admin/projects", "POST", body);
        setProjectRows((rows) => [data.project, ...rows]);
        notify(`${data.project.title} published.`);
      }
      setProjectModal(false);
      setEditingProject(null);
    } catch (error) { notify(error instanceof Error ? error.message : "Project update failed."); }
    finally { setBusy(false); }
  }

  async function deleteProject(project: Project) {
    if (!window.confirm(`Remove ${project.title} from the build archive?`)) return;
    try {
      await requestJson(`/api/admin/projects?id=${project.id}`, "DELETE");
      setProjectRows((rows) => rows.filter((row) => row.id !== project.id));
      notify(`${project.title} removed.`);
    } catch (error) { notify(error instanceof Error ? error.message : "Delete failed."); }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    let currencyRates: Record<string, number>;
    try { currencyRates = JSON.parse(String(form.get("currencyRates"))) as Record<string, number>; }
    catch { return notify("Currency rates must be valid JSON."); }
    const body = {
      ...Object.fromEntries(form.entries()),
      enabledCurrencies: String(form.get("enabledCurrencies")).split(",").map((code) => code.trim().toUpperCase()).filter(Boolean),
      currencyRates,
      openDays: form.getAll("openDays").map(Number),
      openHour: Number(form.get("openHour")), closeHour: Number(form.get("closeHour")),
    };
    setBusy(true);
    try {
      const data = await requestJson<{ settings: Settings }>("/api/settings", "PATCH", body);
      setSettings(data.settings);
      notify("Storefront settings published. Refresh the storefront to see every change.");
    } catch (error) { notify(error instanceof Error ? error.message : "Settings update failed."); }
    finally { setBusy(false); }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Overview" }, { id: "catalog", label: `Catalog (${productRows.length})` },
    { id: "orders", label: `Orders (${orderRows.length})` }, { id: "bookings", label: `Bookings (${bookingRows.length})` },
    { id: "projects", label: `Builds (${projectRows.length})` }, { id: "messages", label: `Messages (${contacts.length})` },
    { id: "settings", label: "Store settings" },
  ];

  return (
    <main className="admin-page">
      <a className="back-link" href="/">← Back to storefront</a>
      <header className="admin-hero section-edge"><p className="eyebrow">Owner control center / live CMS</p><h1>Garage command center.</h1><p>{message}</p></header>
      <nav className="admin-tabs" aria-label="Dashboard sections">{tabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}</nav>

      {tab === "overview" && <section className="admin-overview">
        <div className="dashboard-stats"><article className="neon-card"><span>Catalog</span><strong>{productRows.length}</strong><small>{lowStock} low-stock items</small></article><article className="neon-card"><span>Revenue</span><strong>{(revenue / 100).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}</strong><small>Non-cancelled orders</small></article><article className="neon-card"><span>Bookings</span><strong>{bookingRows.length}</strong><small>{bookingRows.filter((item) => item.status === "requested").length} awaiting review</small></article><article className="neon-card"><span>Messages</span><strong>{contacts.length}</strong><small>{contacts.filter((item) => !item.handled).length} unread</small></article></div>
        <div className="neon-card cms-panel"><p className="eyebrow">Quick actions</p><h2>Everything editable. No code required.</h2><div className="hero-actions"><button className="neon-button" type="button" onClick={() => { setEditingProduct(null); setProductModal(true); }}>Add catalog item</button><button className="ghost-button" type="button" onClick={() => setTab("settings")}>Edit hero & location</button><button className="ghost-button" type="button" onClick={() => { setEditingProject(null); setProjectModal(true); }}>Publish a build</button></div></div>
      </section>}

      {tab === "catalog" && <section className="neon-card cms-panel"><div className="cms-heading"><div><p className="eyebrow">Live inventory</p><h2>Catalog manager</h2></div><button className="neon-button small" type="button" onClick={() => { setEditingProduct(null); setProductModal(true); }}>+ Add item</button></div>{productRows.map((product) => <article className="cms-product" key={product.id}><img src={product.imageUrl} alt="" loading="lazy" /><div><strong>{product.name}</strong><span>{product.category} · ${(product.priceCents / 100).toLocaleString()} · {product.inventory} in stock {product.featured ? "· Featured" : ""}</span></div><div className="cms-actions"><button className="icon-button" type="button" onClick={() => { setEditingProduct(product); setProductModal(true); }}>Edit</button><button className="icon-button danger" type="button" disabled={busy} onClick={() => deleteProduct(product)}>Delete</button></div></article>)}</section>}

      {tab === "orders" && <section className="neon-card cms-panel"><p className="eyebrow">Commerce workflow</p><h2>Orders</h2>{orderRows.length === 0 ? <p>No orders yet.</p> : orderRows.map((order) => <article className="workflow-row" key={order.id}><div><strong>{order.customerName} · ${(order.totalCents / 100).toLocaleString()}</strong><p>{order.customerEmail} · {order.transactionId} · {order.provider}</p></div><select value={order.status} onChange={(event) => changeOrderStatus(order.id, event.target.value)}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select></article>)}</section>}

      {tab === "bookings" && <section className="neon-card cms-panel"><p className="eyebrow">Studio workflow</p><h2>Bookings</h2>{bookingRows.length === 0 ? <p>No bookings yet.</p> : bookingRows.map((booking) => <article className="workflow-row" key={booking.id}><div><strong>{booking.bikeModel} · {booking.name}</strong><p>{booking.email} · {new Date(booking.appointmentAt).toLocaleString()} · {booking.selectedMods.join(", ")}</p></div><select value={booking.status} onChange={(event) => changeBookingStatus(booking.id, event.target.value)}>{bookingStatuses.map((status) => <option key={status}>{status}</option>)}</select></article>)}</section>}

      {tab === "projects" && <section className="neon-card cms-panel"><div className="cms-heading"><div><p className="eyebrow">Build archive</p><h2>Project gallery</h2></div><button className="neon-button small" type="button" onClick={() => { setEditingProject(null); setProjectModal(true); }}>+ Publish build</button></div>{projectRows.map((project) => <article className="cms-product" key={project.id}><img src={project.afterImageUrl} alt="" loading="lazy" /><div><strong>{project.title}</strong><span>{project.bikeModel} · {project.powerBefore} → {project.powerAfter} HP</span></div><div className="cms-actions"><button className="icon-button" type="button" onClick={() => { setEditingProject(project); setProjectModal(true); }}>Edit</button><button className="icon-button danger" type="button" onClick={() => deleteProject(project)}>Delete</button></div></article>)}</section>}

      {tab === "messages" && <section className="neon-card cms-panel"><p className="eyebrow">Customer inbox</p><h2>Contact messages</h2>{contacts.length === 0 ? <p>No messages yet.</p> : contacts.map((contact) => <article className="message-row" key={contact.id}><div><strong>{contact.name}</strong><span>{contact.email}{contact.phone ? ` · ${contact.phone}` : ""}</span></div><p>{contact.message}</p><a className="card-link" href={`mailto:${contact.email}`}>Reply ↗</a></article>)}</section>}

      {tab === "settings" && <form className="neon-card cms-panel settings-form" onSubmit={saveSettings}><p className="eyebrow">Global storefront configuration</p><h2>Brand, location & currency</h2>
        <div className="settings-group"><h3>Brand & hero</h3><div className="admin-form-grid"><label>Store name<input required name="storeName" defaultValue={settings.storeName} /></label><label>Announcement<input required name="announcement" defaultValue={settings.announcement} /></label><label className="wide">Hero eyebrow<input required name="heroEyebrow" defaultValue={settings.heroEyebrow} /></label><label className="wide">Hero title<input required name="heroTitle" defaultValue={settings.heroTitle} /></label><label className="wide">Hero subtitle<textarea required name="heroSubtitle" defaultValue={settings.heroSubtitle} /></label><label className="wide">Hero image URL<input required type="url" name="heroImageUrl" defaultValue={settings.heroImageUrl} /></label></div></div>
        <div className="settings-group"><h3>Live garage location</h3><div className="admin-form-grid"><label>Location name<input required name="locationName" defaultValue={settings.locationName} /></label><label>Address<input required name="address" defaultValue={settings.address} /></label><label>Latitude<input required name="latitude" inputMode="decimal" defaultValue={settings.latitude} /></label><label>Longitude<input required name="longitude" inputMode="decimal" defaultValue={settings.longitude} /></label><label>Phone<input required name="phone" defaultValue={settings.phone} /></label><label>WhatsApp digits<input required name="whatsapp" defaultValue={settings.whatsapp} /></label><label>Support email<input required type="email" name="supportEmail" defaultValue={settings.supportEmail} /></label><label>Instagram URL<input required type="url" name="instagramUrl" defaultValue={settings.instagramUrl} /></label></div></div>
        <div className="settings-group"><h3>Currency & business hours</h3><div className="admin-form-grid"><label>Default currency<input required name="defaultCurrency" defaultValue={settings.defaultCurrency} maxLength={3} /></label><label>Enabled currencies<input required name="enabledCurrencies" defaultValue={settings.enabledCurrencies.join(", ")} /></label><label className="wide">Rates against USD (JSON)<textarea required name="currencyRates" defaultValue={JSON.stringify(settings.currencyRates, null, 2)} /></label><label>Open hour (0–23)<input required type="number" min="0" max="23" name="openHour" defaultValue={settings.businessHours.openHour} /></label><label>Close hour (1–24)<input required type="number" min="1" max="24" name="closeHour" defaultValue={settings.businessHours.closeHour} /></label><fieldset className="wide day-picker"><legend>Open days</legend>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => <label key={day}><input type="checkbox" name="openDays" value={index} defaultChecked={settings.businessHours.openDays.includes(index)} />{day}</label>)}</fieldset></div></div>
        <button className="neon-button" type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish all settings"}</button>
      </form>}

      {productModal && <div className="admin-modal" role="dialog" aria-modal="true" aria-label={editingProduct ? "Edit catalog item" : "Add catalog item"}><form className="neon-card admin-modal-card" key={editingProduct?.id || "new"} onSubmit={saveProduct}><button className="drawer-close" type="button" onClick={() => setProductModal(false)}>×</button><p className="eyebrow">{editingProduct ? "Edit live item" : "New catalog item"}</p><h2>{editingProduct ? editingProduct.name : "Add to catalog"}</h2><div className="admin-form-grid"><label>Name<input required name="name" defaultValue={editingProduct?.name} /></label><label>Category<input required name="category" list="categories" defaultValue={editingProduct?.category || "Body Kits"} /><datalist id="categories"><option>Exhausts</option><option>ECU Tuning</option><option>Suspension</option><option>Brakes</option><option>Body Kits</option><option>Racing Gear</option></datalist></label><label className="wide">Description<textarea required name="description" defaultValue={editingProduct?.description} /></label><label className="wide">Image URL<input required type="url" name="imageUrl" defaultValue={editingProduct?.imageUrl || fallbackImage} /></label><label>Price (USD)<input required type="number" min="1" step=".01" name="price" defaultValue={editingProduct ? (editingProduct.priceCents / 100).toFixed(2) : "999.00"} /></label><label>Inventory<input required type="number" min="0" name="inventory" defaultValue={editingProduct?.inventory ?? 5} /></label><label>Horsepower gain<input required type="number" min="0" name="horsepowerGain" defaultValue={editingProduct?.horsepowerGain ?? 0} /></label><label>Accent color<input required type="color" name="accent" defaultValue={editingProduct?.accent || "#00e5ff"} /></label><label className="wide">Specifications (one key: value per line)<textarea name="specs" defaultValue={editingProduct ? specsToText(editingProduct.specs) : "fitment: Universal\nmaterial: Carbon\nlead time: 14 days"} /></label><label className="check-label"><input type="checkbox" name="featured" defaultChecked={editingProduct?.featured} /> Feature on storefront</label></div><button className="neon-button" type="submit" disabled={busy}>{busy ? "Saving…" : editingProduct ? "Save changes" : "Publish item"}</button></form></div>}

      {projectModal && <div className="admin-modal" role="dialog" aria-modal="true" aria-label={editingProject ? "Edit build" : "Publish build"}><form className="neon-card admin-modal-card" key={editingProject?.id || "new-project"} onSubmit={saveProject}><button className="drawer-close" type="button" onClick={() => setProjectModal(false)}>×</button><p className="eyebrow">Build archive</p><h2>{editingProject ? "Edit project" : "Publish project"}</h2><div className="admin-form-grid"><label>Title<input required name="title" defaultValue={editingProject?.title} /></label><label>Bike model<input required name="bikeModel" defaultValue={editingProject?.bikeModel} /></label><label>Before HP<input required type="number" name="powerBefore" defaultValue={editingProject?.powerBefore || 160} /></label><label>After HP<input required type="number" name="powerAfter" defaultValue={editingProject?.powerAfter || 195} /></label><label className="wide">Before image URL<input required type="url" name="beforeImageUrl" defaultValue={editingProject?.beforeImageUrl || fallbackImage} /></label><label className="wide">After image URL<input required type="url" name="afterImageUrl" defaultValue={editingProject?.afterImageUrl || fallbackImage} /></label><label className="wide">Summary<textarea required name="summary" defaultValue={editingProject?.summary} /></label><label className="check-label"><input type="checkbox" name="featured" defaultChecked={editingProject?.featured} /> Featured build</label></div><button className="neon-button" type="submit" disabled={busy}>{busy ? "Publishing…" : "Publish build"}</button></form></div>}
    </main>
  );
}
