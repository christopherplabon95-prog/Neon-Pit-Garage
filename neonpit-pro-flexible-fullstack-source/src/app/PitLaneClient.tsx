"use client";

import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  slug: string;
  name: string;
  category: string;
  description: string;
  specs: Record<string, string>;
  priceCents: number;
  inventory: number;
  horsepowerGain: number;
  imageUrl: string;
  accent: string;
  featured: boolean;
};

type Project = {
  id: number;
  slug: string;
  title: string;
  bikeModel: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  summary: string;
  powerBefore: number;
  powerAfter: number;
  dyno: Array<{ rpm: number; hp: number; torque: number }>;
};

type StoreSettings = {
  id: number;
  storeName: string;
  announcement: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string;
  locationName: string;
  address: string;
  latitude: string;
  longitude: string;
  phone: string;
  whatsapp: string;
  supportEmail: string;
  defaultCurrency: string;
  enabledCurrencies: string[];
  currencyRates: Record<string, number>;
  businessHours: { openHour: number; closeHour: number; openDays: number[] };
  instagramUrl: string;
  updatedAt: Date | string;
};

type Notification = { id: number; title: string; body: string; type: string; read: boolean; createdAt: string };
type User = { id: string; name: string; email: string; role: "customer" | "admin"; phone?: string | null } | null;
type CartLine = { product: Product; quantity: number };
type SortMode = "featured" | "price-asc" | "price-desc" | "name";

const categoryOrder = ["All", "Exhausts", "ECU Tuning", "Suspension", "Brakes", "Body Kits", "Racing Gear"];
const modOptions = ["Stage 3 ECU", "Titanium Exhaust", "Carbon Aero", "Öhlins Geometry", "Brembo Race Pack", "Custom Livery"];
const currencyLocales: Record<string, string> = { USD: "en-US", EUR: "de-DE", GBP: "en-GB", AED: "en-AE", INR: "en-IN", JPY: "ja-JP" };

async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Request failed. Please try again.");
  return data;
}

function RpmGauge({ value, label, color = "#ff0f3f" }: { value: number; label: string; color?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="rpm-gauge" style={{ "--gauge": `${clamped}%`, "--gauge-color": color } as CSSProperties}>
      <div className="rpm-face">
        <span>{label}</span>
        <strong>{clamped}</strong>
      </div>
    </div>
  );
}

function BeforeAfter({ project }: { project: Project }) {
  const [split, setSplit] = useState(58);
  return (
    <div className="before-after neon-card">
      <img src={project.afterImageUrl} alt={`${project.title} after tuning`} loading="lazy" decoding="async" />
      <div className="before-layer" style={{ width: `${split}%` }}>
        <img src={project.beforeImageUrl} alt={`${project.title} before tuning`} loading="lazy" decoding="async" />
      </div>
      <input aria-label={`Compare before and after for ${project.title}`} type="range" min="10" max="90" value={split} onChange={(event) => setSplit(Number(event.target.value))} />
      <span className="tag left">Before</span>
      <span className="tag right">After</span>
    </div>
  );
}

function DynoChart({ project, chartId }: { project: Project; chartId: number }) {
  const maxHp = Math.max(...project.dyno.map((point) => point.hp), 1);
  const points = project.dyno
    .map((point, index) => `${(index / Math.max(project.dyno.length - 1, 1)) * 100},${100 - (point.hp / maxHp) * 90}`)
    .join(" ");
  return (
    <div className="dyno-panel">
      <div className="dyno-heading">
        <div><p className="eyebrow">Dyno verified</p><h3>{project.powerBefore} → {project.powerAfter} HP</h3></div>
        <span>+{project.powerAfter - project.powerBefore} HP</span>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label={`Horsepower graph for ${project.title}`}>
        <polyline points={points} fill="none" stroke={`url(#dyno-${chartId})`} strokeWidth="3" strokeLinecap="round" />
        <defs><linearGradient id={`dyno-${chartId}`} x1="0" x2="1"><stop stopColor="#00e5ff" /><stop offset=".52" stopColor="#7c3cff" /><stop offset="1" stopColor="#ff0f3f" /></linearGradient></defs>
      </svg>
    </div>
  );
}

export default function PitLaneClient({
  initialProducts,
  projects,
  initialNotifications,
  initialSettings,
  initialUser,
}: {
  initialProducts: Product[];
  projects: Project[];
  initialNotifications: Notification[];
  initialSettings: StoreSettings;
  initialUser: User;
}) {
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("featured");
  const [currency, setCurrency] = useState(initialSettings.defaultCurrency);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [user, setUser] = useState<User>(initialUser);
  const [toast, setToast] = useState("Welcome to the next level of performance.");
  const [toastVisible, setToastVisible] = useState(true);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "recover">("login");
  const [mods, setMods] = useState<string[]>(["Stage 3 ECU", "Titanium Exhaust"]);
  const [visitorOrigin, setVisitorOrigin] = useState<string>("");

  const categories = useMemo(() => {
    const dynamic = [...new Set(initialProducts.map((product) => product.category))];
    return categoryOrder.filter((item) => item === "All" || dynamic.includes(item)).concat(dynamic.filter((item) => !categoryOrder.includes(item)));
  }, [initialProducts]);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const rows = initialProducts.filter((product) => {
      const categoryMatch = category === "All" || product.category === category;
      const textMatch = !normalized || `${product.name} ${product.category} ${product.description}`.toLowerCase().includes(normalized);
      return categoryMatch && textMatch;
    });
    return [...rows].sort((a, b) => {
      if (sort === "price-asc") return a.priceCents - b.priceCents;
      if (sort === "price-desc") return b.priceCents - a.priceCents;
      if (sort === "name") return a.name.localeCompare(b.name);
      return Number(b.featured) - Number(a.featured) || b.id - a.id;
    });
  }, [category, initialProducts, query, sort]);

  const rate = initialSettings.currencyRates[currency] || 1;
  const formatMoney = (cents: number) => {
    try {
      return new Intl.NumberFormat(currencyLocales[currency] || "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "JPY" ? 0 : 2,
      }).format((cents / 100) * rate);
    } catch {
      return `$${(cents / 100).toFixed(2)}`;
    }
  };
  const cartTotal = cart.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);

  function announce(message: string) {
    setToast(message);
    setToastVisible(true);
    window.setTimeout(() => setToastVisible(false), 3200);
  }

  useEffect(() => {
    try {
      const savedCart = JSON.parse(localStorage.getItem("neonpit-cart") || "[]") as CartLine[];
      const savedWishlist = JSON.parse(localStorage.getItem("neonpit-wishlist") || "[]") as number[];
      const savedCurrency = localStorage.getItem("neonpit-currency");
      if (Array.isArray(savedCart)) setCart(savedCart.filter((line) => line.product?.id && line.quantity > 0));
      if (Array.isArray(savedWishlist)) setWishlist(savedWishlist.filter(Number.isInteger));
      if (savedCurrency && initialSettings.enabledCurrencies.includes(savedCurrency)) setCurrency(savedCurrency);
    } catch {
      localStorage.removeItem("neonpit-cart");
      localStorage.removeItem("neonpit-wishlist");
    }
  }, [initialSettings.enabledCurrencies]);

  useEffect(() => {
    localStorage.setItem("neonpit-cart", JSON.stringify(cart));
  }, [cart]);
  useEffect(() => {
    localStorage.setItem("neonpit-wishlist", JSON.stringify(wishlist));
  }, [wishlist]);
  useEffect(() => {
    localStorage.setItem("neonpit-currency", currency);
  }, [currency]);
  useEffect(() => {
    document.body.style.overflow = cartOpen || menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [cartOpen, menuOpen]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      document.documentElement.style.setProperty("--cursor-x", `${(event.clientX / window.innerWidth) * 100}%`);
      document.documentElement.style.setProperty("--cursor-y", `${(event.clientY / window.innerHeight) * 100}%`);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/notifications/stream");
    source.addEventListener("pit-alert", (event) => {
      const data = JSON.parse((event as MessageEvent).data) as { notifications: Notification[] };
      setNotifications(data.notifications);
    });
    source.onerror = () => source.close();
    return () => source.close();
  }, []);

  function addToCart(product: Product) {
    if (product.inventory < 1) return announce(`${product.name} is currently sold out.`);
    setCart((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) return current.map((line) => line.product.id === product.id ? { ...line, quantity: Math.min(line.quantity + 1, product.inventory, 9) } : line);
      return [...current, { product, quantity: 1 }];
    });
    announce(`${product.name} loaded into your pit cart.`);
  }

  function updateQuantity(productId: number, quantity: number) {
    setCart((current) => current
      .map((line) => line.product.id === productId ? { ...line, quantity: Math.max(0, Math.min(quantity, line.product.inventory, 9)) } : line)
      .filter((line) => line.quantity > 0));
  }

  function toggleWishlist(productId: number) {
    setWishlist((current) => current.includes(productId) ? current.filter((id) => id !== productId) : [...current, productId]);
  }

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const endpoint = authMode === "signup" ? "/api/auth/signup" : authMode === "recover" ? "/api/auth/recover" : "/api/auth/login";
    try {
      const data = await apiPost<{ user?: User; message?: string }>(endpoint, Object.fromEntries(form.entries()));
      if (data.user) setUser(data.user);
      announce(data.message || (authMode === "recover" ? "Recovery request queued." : "Session secured. Welcome to the pit lane."));
    } catch (error) {
      announce(error instanceof Error ? error.message : "Authentication failed.");
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    announce("You are now signed out.");
  }

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const data = await apiPost<{ order: { transactionId: string } }>("/api/checkout", {
        customerName: form.get("customerName"), customerEmail: form.get("customerEmail"),
        shippingAddress: form.get("shippingAddress"), provider: form.get("provider"),
        items: cart.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      });
      setCart([]);
      setCartOpen(false);
      event.currentTarget.reset();
      announce(`Payment confirmed · ${data.order.transactionId}`);
    } catch (error) {
      announce(error instanceof Error ? error.message : "Checkout failed.");
    }
  }

  async function handleBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiPost("/api/bookings", {
        name: form.get("name"), email: form.get("email"), phone: form.get("phone"), bikeModel: form.get("bikeModel"),
        appointmentAt: form.get("appointmentAt"), notes: form.get("notes"), selectedMods: mods,
      });
      event.currentTarget.reset();
      announce("Booking requested. Your crew chief will confirm shortly.");
    } catch (error) {
      announce(error instanceof Error ? error.message : "Booking failed.");
    }
  }

  async function handleContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiPost("/api/contact", Object.fromEntries(form.entries()));
      event.currentTarget.reset();
      announce("Message transmitted to the garage floor.");
    } catch (error) {
      announce(error instanceof Error ? error.message : "Message failed.");
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return announce("Location access is not supported by this browser.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setVisitorOrigin(`${position.coords.latitude},${position.coords.longitude}`);
        announce("Your position is set. Directions are ready.");
      },
      () => announce("Location permission was not granted. You can still open directions."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  const currentHour = new Date().getHours();
  const currentDay = new Date().getDay();
  const isOpen = initialSettings.businessHours.openDays.includes(currentDay)
    && currentHour >= initialSettings.businessHours.openHour
    && currentHour < initialSettings.businessHours.closeHour;
  const destination = `${initialSettings.latitude},${initialSettings.longitude}`;
  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}${visitorOrigin ? `&origin=${encodeURIComponent(visitorOrigin)}` : ""}`;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${Number(initialSettings.longitude) - .01}%2C${Number(initialSettings.latitude) - .01}%2C${Number(initialSettings.longitude) + .01}%2C${Number(initialSettings.latitude) + .01}&layer=mapnik&marker=${initialSettings.latitude}%2C${initialSettings.longitude}`;

  return (
    <div className="site-shell">
      <div className="wind-field" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
      <div className="ghost-bike" aria-hidden="true"><div className="bike-shape" /></div>
      <div className="orb orb-red" aria-hidden="true" /><div className="orb orb-cyan" aria-hidden="true" /><div className="orb orb-purple" aria-hidden="true" />

      <div className="announcement-bar"><span>{initialSettings.announcement}</span><span className="announcement-meta">16 curated builds · Global delivery · Live studio support</span></div>
      <header className="top-nav">
        <button className="menu-toggle" type="button" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><i /><i /></button>
        <a href="#home" className="brand" aria-label={`${initialSettings.storeName} home`}><span>{initialSettings.storeName.slice(0, 4)}</span>{initialSettings.storeName.slice(4)}</a>
        <nav className="nav-links" aria-label="Main navigation"><a href="#shop">Catalog</a><a href="#studio">Builds</a><a href="#booking">Studio</a><a href="#location">Visit</a><a href="/admin">Admin</a></nav>
        <div className="nav-actions">
          <label className="currency-select" aria-label="Display currency"><select value={currency} onChange={(event) => setCurrency(event.target.value)}>{initialSettings.enabledCurrencies.map((code) => <option key={code}>{code}</option>)}</select></label>
          <div className="notification-bell" tabIndex={0}><span>{notifications.filter((item) => !item.read).length}</span><b aria-label="Notifications">⌁</b><div className="notification-drop">{notifications.slice(0, 5).map((item) => <p key={item.id}><strong>{item.title}</strong>{item.body}</p>)}</div></div>
          <button className="cart-trigger" type="button" onClick={() => setCartOpen(true)} aria-label={`Open cart with ${cartCount} items`}>Bag <span>{cartCount}</span></button>
        </div>
      </header>

      <div className={`mobile-menu ${menuOpen ? "open" : ""}`} aria-hidden={!menuOpen}>
        <button className="drawer-close" type="button" onClick={() => setMenuOpen(false)} aria-label="Close navigation">×</button>
        <p className="eyebrow">Navigate</p>
        <a href="#shop" onClick={() => setMenuOpen(false)}>Catalog</a><a href="#studio" onClick={() => setMenuOpen(false)}>Builds</a><a href="#booking" onClick={() => setMenuOpen(false)}>Book studio</a><a href="#location" onClick={() => setMenuOpen(false)}>Location</a><a href="#auth" onClick={() => setMenuOpen(false)}>Account</a><a href="/admin">Admin dashboard</a>
      </div>
      {(menuOpen || cartOpen) && <button className="drawer-backdrop" type="button" aria-label="Close panel" onClick={() => { setMenuOpen(false); setCartOpen(false); }} />}

      <main id="home">
        <section className="hero section-edge">
          <div className="hero-copy">
            <p className="eyebrow">{initialSettings.heroEyebrow}</p>
            <h1>{initialSettings.heroTitle}</h1>
            <p className="hero-text">{initialSettings.heroSubtitle}</p>
            <div className="hero-actions"><a className="neon-button" href="#shop">Explore the collection <span>↗</span></a><a className="ghost-button" href="#booking">Reserve the dyno bay</a></div>
            <div className="hero-proof"><span><strong>16</strong> curated packages</span><span><strong>228</strong> verified peak HP</span><span><strong>4.9</strong> rider rating</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-bike neon-frame"><img src={initialSettings.heroImageUrl} alt="Custom race-spec sportbike in the NeonPit studio" fetchPriority="high" decoding="async" /><div className="speed-lines" /></div>
            <div className="hero-float-card"><span>Latest build</span><strong>V4R NIGHTFALL</strong><small>Carbon · Titanium · Stage 3</small></div>
            <div className="hero-index">NP / 01</div>
          </div>
          <div className="hero-metrics"><RpmGauge value={91} label="Apex" /><RpmGauge value={78} label="Boost" color="#00e5ff" /><RpmGauge value={88} label="Grip" color="#7c3cff" /><div className="metric-copy"><span>Engineered for the after-hours</span><p>Every setup is measured, mapped, and validated before delivery.</p></div></div>
        </section>

        <section className="confidence-strip" aria-label="Store benefits"><div><i>01</i><strong>Global express</strong><span>Insured worldwide delivery</span></div><div><i>02</i><strong>Studio verified</strong><span>Every fitment checked</span></div><div><i>03</i><strong>Secure checkout</strong><span>Protected transactions</span></div><div><i>04</i><strong>Real support</strong><span>Talk to the garage</span></div></section>

        <section id="shop" className="shop section-edge">
          <div className="section-heading"><div><p className="eyebrow">Performance catalog / 2026</p><h2>Choose your next evolution.</h2></div><p className="section-intro">Sixteen elite packages for R1, S1000RR, Panigale, GSX-R, ZX-6R, and Fireblade platforms.</p></div>
          <div className="catalog-toolbar">
            <label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search parts, builds, categories…" aria-label="Search catalog" /></label>
            <label className="sort-field"><span>Sort</span><select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}><option value="featured">Featured first</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option></select></label>
          </div>
          <div className="category-strip">{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div>
          <div className="catalog-result"><span>{filteredProducts.length} results</span><span>Prices shown in {currency}</span></div>
          {filteredProducts.length > 0 ? <div className="product-grid">{filteredProducts.map((product) => (
            <article className="product-card neon-card" key={product.id} style={{ "--accent": product.accent } as CSSProperties}>
              <div className="product-media"><a href={`/products/${product.slug}`}><img src={product.imageUrl} alt={product.name} loading="lazy" decoding="async" /></a>{product.featured && <span className="featured-pill">Pit pick</span>}<button className={`wishlist-button ${wishlist.includes(product.id) ? "active" : ""}`} type="button" onClick={() => toggleWishlist(product.id)} aria-label={`${wishlist.includes(product.id) ? "Remove" : "Add"} ${product.name} ${wishlist.includes(product.id) ? "from" : "to"} wishlist`}>♡</button></div>
              <div className="product-body"><div className="product-topline"><p className="eyebrow">{product.category}</p><span>{product.inventory > 0 ? `${product.inventory} available` : "Sold out"}</span></div><h3><a href={`/products/${product.slug}`}>{product.name}</a></h3><p>{product.description}</p><div className="spec-row"><strong>{formatMoney(product.priceCents)}</strong><span>{product.horsepowerGain ? `+${product.horsepowerGain} HP` : "Race spec"}</span></div><div className="card-actions"><button className="neon-button small" type="button" onClick={() => addToCart(product)} disabled={product.inventory < 1}>Add to bag</button><a className="card-link" href={`/products/${product.slug}`}>Details ↗</a></div></div>
            </article>
          ))}</div> : <div className="empty-state"><strong>No builds found.</strong><p>Try a different category or search term.</p><button className="ghost-button" type="button" onClick={() => { setQuery(""); setCategory("All"); }}>Reset catalog</button></div>}
        </section>

        <section id="studio" className="studio-section section-edge"><div className="section-heading"><div><p className="eyebrow">Tuning studio / proven output</p><h2>Before. After. Unmistakable.</h2></div><p className="section-intro">Drag each comparison to reveal the transformation, then inspect its animated dyno result.</p></div><div className="project-grid">{projects.map((project) => <article className="project-card" key={project.id}><BeforeAfter project={project} /><div className="neon-card project-copy"><p className="eyebrow">{project.bikeModel}</p><h3>{project.title}</h3><p>{project.summary}</p><DynoChart project={project} chartId={project.id} /><a className="ghost-button" href="#booking">Build something similar</a></div></article>)}</div></section>

        <section id="booking" className="grid-section section-edge"><div className="booking-copy"><p className="eyebrow">Private studio booking</p><h2>Set the target. We build the machine.</h2><p>Choose your platform and modifications. A crew chief reviews every request and confirms the right bay, technician, and dyno window.</p><div className="mod-grid">{modOptions.map((mod) => <button type="button" key={mod} className={mods.includes(mod) ? "active" : ""} onClick={() => setMods((current) => current.includes(mod) ? current.filter((item) => item !== mod) : [...current, mod])}><span>{mods.includes(mod) ? "✓" : "+"}</span>{mod}</button>)}</div></div><form className="neon-card form-card premium-form" onSubmit={handleBooking}><div className="form-heading"><span>01</span><div><h3>Your machine</h3><p>All fields are reviewed by a specialist.</p></div></div><div className="form-grid"><label>Name<input required name="name" placeholder="Your name" defaultValue={user?.name || ""} /></label><label>Email<input required name="email" type="email" placeholder="you@example.com" defaultValue={user?.email || ""} /></label><label>Phone<input required name="phone" placeholder="Phone / WhatsApp" /></label><label>Bike model<select name="bikeModel"><option>Yamaha R1 / R1M</option><option>BMW S1000RR / M1000RR</option><option>Ducati Panigale V4 / V4R</option><option>Suzuki GSX-R1000R</option><option>Honda CBR1000RR-R</option><option>Kawasaki ZX-6R / ZX-10R</option></select></label><label className="wide">Preferred appointment<input required name="appointmentAt" type="datetime-local" /></label><label className="wide">Build brief<textarea name="notes" placeholder="Street, roll race, show build, or track target…" /></label></div><button className="neon-button" type="submit">Send booking request</button></form></section>

        <section id="location" className="location-grid section-edge"><div className="neon-card location-card"><p className="eyebrow">Live studio location</p><h2>{initialSettings.locationName}</h2><span className={`open-status ${isOpen ? "" : "closed"}`}><i />{isOpen ? `Open now · until ${initialSettings.businessHours.closeHour}:00` : `Closed · opens at ${initialSettings.businessHours.openHour}:00`}</span><p>{initialSettings.address}</p><div className="location-details"><a href={`tel:${initialSettings.phone}`}>{initialSettings.phone}</a><a href={`mailto:${initialSettings.supportEmail}`}>{initialSettings.supportEmail}</a></div><div className="hero-actions"><button className="ghost-button" type="button" onClick={useMyLocation}>Use my location</button><a className="neon-button" href={directionsUrl} target="_blank" rel="noreferrer">Launch directions ↗</a></div></div><iframe title={`${initialSettings.locationName} map`} src={mapUrl} loading="lazy" /></section>

        <section id="auth" className="grid-section section-edge"><div><p className="eyebrow">Rider account</p><h2>One profile. Every build.</h2><p>Save checkout details and attach orders and bookings to your secure garage profile.</p>{user && <button className="ghost-button" type="button" onClick={handleLogout}>Sign out {user.name}</button>}<p className="demo-note">Admin demo: admin@neonpit.local / AdminPass123!</p></div><form className="neon-card form-card premium-form" onSubmit={handleAuth}><div className="mode-tabs"><button type="button" className={authMode === "login" ? "active" : ""} onClick={() => setAuthMode("login")}>Login</button><button type="button" className={authMode === "signup" ? "active" : ""} onClick={() => setAuthMode("signup")}>Sign up</button><button type="button" className={authMode === "recover" ? "active" : ""} onClick={() => setAuthMode("recover")}>Recover</button></div>{authMode === "signup" && <label>Name<input required name="name" placeholder="Rider name" /></label>}<label>Email<input required name="email" type="email" placeholder="Email" defaultValue={user?.email || ""} /></label>{authMode !== "recover" && <label>Password<input required name="password" type="password" placeholder="8+ characters" /></label>}{authMode === "signup" && <label>Phone<input name="phone" placeholder="Phone / WhatsApp" /></label>}<button className="neon-button" type="submit">{authMode === "recover" ? "Send recovery" : "Secure session"}</button><p className="status-line">{user ? `Signed in as ${user.name} · ${user.role}` : "Protected guest mode active"}</p></form></section>

        <section id="contact" className="grid-section contact-section section-edge"><div><p className="eyebrow">Private consultation</p><h2>Tell us what you want to outrun.</h2><p>Parts sourcing, one-of-one builds, race deadlines, and international delivery—send the brief directly to the studio.</p><div className="contact-links"><a href={`https://wa.me/${initialSettings.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp ↗</a><a href={`mailto:${initialSettings.supportEmail}`}>Email ↗</a><a href={initialSettings.instagramUrl} target="_blank" rel="noreferrer">Instagram ↗</a></div></div><form className="neon-card form-card premium-form" onSubmit={handleContact}><label>Name<input required name="name" placeholder="Name" /></label><label>Email<input required name="email" type="email" placeholder="Email" /></label><label>Phone<input name="phone" placeholder="Phone" /></label><label>Message<textarea required minLength={8} name="message" placeholder="What are we building?" /></label><button className="neon-button" type="submit">Transmit message</button></form></section>

        <section className="admin-strip section-edge"><p className="eyebrow">Owner control center</p><h2>Catalog, pricing, orders, location, currency, and content—editable without code.</h2><a className="neon-button" href="/admin">Open admin dashboard ↗</a></section>
      </main>

      <footer className="footer"><div><a className="brand" href="#home"><span>{initialSettings.storeName.slice(0, 4)}</span>{initialSettings.storeName.slice(4)}</a><p>Rare hardware. Measured output. No ordinary builds.</p></div><div><h4>Performance</h4><a href="#shop">Catalog</a><a href="#studio">Build archive</a><a href="#booking">Book the studio</a></div><div><h4>Support</h4><a href="#auth">Rider account</a><a href="#contact">Contact</a><a href={directionsUrl} target="_blank">Directions</a></div><div><h4>Global</h4><label className="footer-currency">Currency<select value={currency} onChange={(event) => setCurrency(event.target.value)}>{initialSettings.enabledCurrencies.map((code) => <option key={code}>{code}</option>)}</select></label><p>{initialSettings.address}</p></div></footer>

      <aside className={`cart-drawer ${cartOpen ? "open" : ""}`} aria-hidden={!cartOpen} aria-label="Shopping cart">
        <div className="drawer-header"><div><p className="eyebrow">Pit cart</p><h2>{cartCount} {cartCount === 1 ? "item" : "items"}</h2></div><button className="drawer-close" type="button" onClick={() => setCartOpen(false)} aria-label="Close cart">×</button></div>
        <div className="drawer-lines">{cart.length === 0 ? <div className="empty-cart"><strong>Your cart is clear.</strong><p>Explore the collection and load your next upgrade.</p><button className="ghost-button" type="button" onClick={() => setCartOpen(false)}>Continue shopping</button></div> : cart.map((line) => <div className="drawer-line" key={line.product.id}><img src={line.product.imageUrl} alt="" /><div><strong>{line.product.name}</strong><span>{formatMoney(line.product.priceCents)}</span><div className="quantity-control"><button type="button" onClick={() => updateQuantity(line.product.id, line.quantity - 1)}>−</button><b>{line.quantity}</b><button type="button" onClick={() => updateQuantity(line.product.id, line.quantity + 1)}>+</button><button className="remove-line" type="button" onClick={() => updateQuantity(line.product.id, 0)}>Remove</button></div></div></div>)}</div>
        {cart.length > 0 && <form className="drawer-checkout" onSubmit={handleCheckout}><div className="cart-total"><span>Subtotal</span><strong>{formatMoney(cartTotal)}</strong></div><small>Shipping and final taxes calculated at confirmation.</small><input required name="customerName" placeholder="Full name" defaultValue={user?.name || ""} /><input required name="customerEmail" type="email" placeholder="Email" defaultValue={user?.email || ""} /><textarea required name="shippingAddress" placeholder="Full shipping address" /><select name="provider"><option value="stripe">Stripe card rail</option><option value="paypal">PayPal express</option><option value="pit_credit">Pit credit demo</option></select><button className="neon-button" type="submit">Pay securely · {formatMoney(cartTotal)}</button></form>}
      </aside>

      <div className={`toast ${toastVisible ? "show" : ""}`} role="status" aria-live="polite"><span>●</span>{toast}</div>
    </div>
  );
}
