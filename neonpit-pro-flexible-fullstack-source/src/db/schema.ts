import { boolean, integer, jsonb, numeric, pgEnum, pgTable, serial, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["customer", "admin"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "processing", "completed", "cancelled"]);
export const bookingStatusEnum = pgEnum("booking_status", ["requested", "confirmed", "in_progress", "completed", "cancelled"]);
export const paymentProviderEnum = pgEnum("payment_provider", ["stripe", "paypal", "pit_credit"]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").default("customer").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  specs: jsonb("specs").$type<Record<string, string>>().default({}).notNull(),
  priceCents: integer("price_cents").notNull(),
  inventory: integer("inventory").default(0).notNull(),
  horsepowerGain: integer("horsepower_gain").default(0).notNull(),
  imageUrl: text("image_url").notNull(),
  accent: text("accent").default("#00e5ff").notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: orderStatusEnum("status").default("pending").notNull(),
  provider: paymentProviderEnum("provider").default("pit_credit").notNull(),
  transactionId: text("transaction_id").notNull(),
  shippingAddress: text("shipping_address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

export const bookings = pgTable("bookings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  bikeModel: text("bike_model").notNull(),
  selectedMods: jsonb("selected_mods").$type<string[]>().default([]).notNull(),
  appointmentAt: timestamp("appointment_at", { withTimezone: true }).notNull(),
  notes: text("notes").default("").notNull(),
  status: bookingStatusEnum("status").default("requested").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  message: text("message").notNull(),
  handled: boolean("handled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  bikeModel: text("bike_model").notNull(),
  beforeImageUrl: text("before_image_url").notNull(),
  afterImageUrl: text("after_image_url").notNull(),
  summary: text("summary").notNull(),
  powerBefore: integer("power_before").notNull(),
  powerAfter: integer("power_after").notNull(),
  dyno: jsonb("dyno").$type<Array<{ rpm: number; hp: number; torque: number }>>().default([]).notNull(),
  featured: boolean("featured").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  type: text("type").default("system").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  storeName: text("store_name").default("NEONPIT").notNull(),
  announcement: text("announcement").default("Complimentary worldwide shipping on orders over $999").notNull(),
  heroEyebrow: text("hero_eyebrow").default("Custom high-end bike garage & tuning studio").notNull(),
  heroTitle: text("hero_title").default("BUILT TO OUTRUN ORDINARY.").notNull(),
  heroSubtitle: text("hero_subtitle").default("Rare performance hardware, precision tuning, and one-of-one superbike builds.").notNull(),
  heroImageUrl: text("hero_image_url").notNull(),
  locationName: text("location_name").default("NeonPit Garage").notNull(),
  address: text("address").default("1200 Apex Industrial Blvd, Los Angeles, CA").notNull(),
  latitude: text("latitude").default("34.0522").notNull(),
  longitude: text("longitude").default("-118.2437").notNull(),
  phone: text("phone").default("+1 555 0100").notNull(),
  whatsapp: text("whatsapp").default("15550100").notNull(),
  supportEmail: text("support_email").default("studio@neonpit.com").notNull(),
  defaultCurrency: text("default_currency").default("USD").notNull(),
  enabledCurrencies: jsonb("enabled_currencies").$type<string[]>().default(["USD", "EUR", "GBP", "AED", "INR", "JPY"]).notNull(),
  currencyRates: jsonb("currency_rates").$type<Record<string, number>>().default({ USD: 1, EUR: 0.92, GBP: 0.79, AED: 3.67, INR: 83.1, JPY: 149.5 }).notNull(),
  businessHours: jsonb("business_hours").$type<{ openHour: number; closeHour: number; openDays: number[] }>().default({ openHour: 10, closeHour: 22, openDays: [1, 2, 3, 4, 5, 6] }).notNull(),
  instagramUrl: text("instagram_url").default("https://instagram.com").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
