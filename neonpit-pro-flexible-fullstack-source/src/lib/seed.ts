import "server-only";

import { db } from "@/db";
import { notifications, products, projects, siteSettings, users } from "@/db/schema";
import { count, eq, inArray } from "drizzle-orm";
import { hashPassword } from "./server-auth";

const bikeImages = {
  garageRed: "https://images.pexels.com/photos/33203561/pexels-photo-33203561.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  garageBlue: "https://images.pexels.com/photos/33469784/pexels-photo-33469784.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  pitLane: "https://images.pexels.com/photos/33469805/pexels-photo-33469805.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  track: "https://images.pexels.com/photos/30707657/pexels-photo-30707657.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  nightPair: "https://images.pexels.com/photos/38482148/pexels-photo-38482148.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  yamaha: "https://images.pexels.com/photos/33241351/pexels-photo-33241351.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  exhaust: "https://images.pexels.com/photos/30421261/pexels-photo-30421261.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  racePit: "https://images.pexels.com/photos/17243628/pexels-photo-17243628.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  ninja: "https://images.pexels.com/photos/17243638/pexels-photo-17243638.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  panigaleDetail: "https://images.pexels.com/photos/18865717/pexels-photo-18865717.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  panigaleGarage: "https://images.pexels.com/photos/33175721/pexels-photo-33175721.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  ducatiFront: "https://images.pexels.com/photos/30387182/pexels-photo-30387182.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  yellowSport: "https://images.pexels.com/photos/29814893/pexels-photo-29814893.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  engine: "https://images.pexels.com/photos/20637890/pexels-photo-20637890.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  race: "https://images.pexels.com/photos/38127757/pexels-photo-38127757.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
  sunset: "https://images.pexels.com/photos/9607329/pexels-photo-9607329.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=720&w=1280",
};

const catalog: Array<typeof products.$inferInsert> = [
  {
    slug: "akrapovic-titanium-gp-exhaust",
    name: "AkraLine Titanium GP Exhaust",
    category: "Exhausts",
    description: "Featherweight titanium race exhaust with carbon end cap, ECU-ready mapping, and a midnight red heat shield glow.",
    specs: { material: "Grade-9 titanium", weight: "3.2 kg", fitment: "R1 / S1000RR / Panigale V4", sound: "108 dB race insert" },
    priceCents: 249900, inventory: 8, horsepowerGain: 11, imageUrl: bikeImages.garageRed, accent: "#ff0f3f", featured: true,
  },
  {
    slug: "stage-3-ecu-flash-dyno",
    name: "Stage 3 ECU Flash + Dyno Pull",
    category: "ECU Tuning",
    description: "Race fuel ignition, throttle-by-wire sharpening, quickshifter calibration, and custom dyno verification.",
    specs: { maps: "3 switchable maps", limiter: "+800 RPM", fuel: "Pump / E85 / Race", delivery: "Same-day appointment" },
    priceCents: 89900, inventory: 14, horsepowerGain: 18, imageUrl: bikeImages.pitLane, accent: "#00e5ff", featured: true,
  },
  {
    slug: "ohlins-ttx-gp-suspension-kit",
    name: "Öhlins TTX GP Suspension Kit",
    category: "Suspension",
    description: "Factory-grade cartridge and rear shock package corner-weighted for aggressive canyon and track use.",
    specs: { front: "NIX30 cartridge", rear: "TTX GP shock", setup: "Rider-weight baseline", adjusters: "Compression / rebound / preload" },
    priceCents: 329500, inventory: 5, horsepowerGain: 0, imageUrl: bikeImages.track, accent: "#ff7a00", featured: false,
  },
  {
    slug: "brembo-stylema-race-brake-pack",
    name: "Brembo Stylema Race Brake Pack",
    category: "Brakes",
    description: "Monoblock calipers, sintered pads, braided lines, and high-temp fluid for brutal late-braking confidence.",
    specs: { calipers: "Stylema monoblock", pads: "Z04 sintered", fluid: "RBF 700", lines: "Braided stainless" },
    priceCents: 189900, inventory: 7, horsepowerGain: 0, imageUrl: bikeImages.nightPair, accent: "#ffffff", featured: true,
  },
  {
    slug: "carbon-aero-body-kit",
    name: "Carbon Aero Body Kit",
    category: "Body Kits",
    description: "Winglet-equipped carbon fairings with MotoGP silhouette, heat extraction vents, and neon racing livery options.",
    specs: { material: "2x2 twill carbon", pieces: "9-panel set", finish: "Gloss or satin", aero: "Dual winglets" },
    priceCents: 419900, inventory: 4, horsepowerGain: 3, imageUrl: bikeImages.yamaha, accent: "#7c3cff", featured: true,
  },
  {
    slug: "carbon-kevlar-racing-gear-bundle",
    name: "Carbon Kevlar Racing Gear Bundle",
    category: "Racing Gear",
    description: "Track-day armor bundle with airbag vest compatibility, magnesium sliders, and pit-lane black finish.",
    specs: { suit: "AAA leather", gloves: "Carbon knuckle", boots: "Magnesium slider", helmet: "FIM-ready shell" },
    priceCents: 159900, inventory: 12, horsepowerGain: 0, imageUrl: bikeImages.garageBlue, accent: "#00e5ff", featured: false,
  },
  {
    slug: "fireblade-titanium-underseat-system",
    name: "Fireblade Titanium Underseat System",
    category: "Exhausts",
    description: "Hand-welded full titanium system developed for the CBR1000RR-R with a deep race note and clean torque delivery.",
    specs: { fitment: "CBR1000RR-R 2020+", material: "Titanium", weightSaving: "5.8 kg", tune: "Map supplied" },
    priceCents: 287500, inventory: 6, horsepowerGain: 13, imageUrl: bikeImages.exhaust, accent: "#ff0f3f", featured: true,
  },
  {
    slug: "r1m-endurance-track-conversion",
    name: "R1M Endurance Track Conversion",
    category: "Body Kits",
    description: "Complete endurance silhouette with quick-release carbon bodywork, race screen, undertray, and custom number board.",
    specs: { panels: "11-piece carbon", weightSaving: "7.1 kg", finish: "Satin race", leadTime: "21 days" },
    priceCents: 679900, inventory: 3, horsepowerGain: 2, imageUrl: bikeImages.racePit, accent: "#00e5ff", featured: true,
  },
  {
    slug: "zx6r-apex-race-map",
    name: "ZX-6R Apex Race Map",
    category: "ECU Tuning",
    description: "High-rpm supersport calibration with launch control, pit limiter, auto-blip, and data-logged dyno optimization.",
    specs: { fitment: "ZX-6R 2019+", maps: "Road / Race / Wet", quickshift: "Up & down", dynoRuns: "6 included" },
    priceCents: 109900, inventory: 9, horsepowerGain: 14, imageUrl: bikeImages.ninja, accent: "#7cff00", featured: false,
  },
  {
    slug: "panigale-v4-dry-clutch-conversion",
    name: "Panigale V4 Dry Clutch Conversion",
    category: "Racing Gear",
    description: "Open-cover dry clutch conversion with billet pressure plate, race springs, and unmistakable mechanical character.",
    specs: { material: "Billet aluminum", plates: "Race compound", cover: "Open carbon", fitment: "Panigale V4" },
    priceCents: 214900, inventory: 5, horsepowerGain: 1, imageUrl: bikeImages.panigaleDetail, accent: "#ff0f3f", featured: true,
  },
  {
    slug: "panigale-v4r-nightfall-build",
    name: "Panigale V4R Nightfall Build",
    category: "Body Kits",
    description: "A complete V4R visual and performance transformation with forged carbon, titanium hardware, and bespoke midnight livery.",
    specs: { platform: "Panigale V4 / V4R", finish: "Bespoke", hardware: "Titanium", buildTime: "5–7 weeks" },
    priceCents: 1289900, inventory: 2, horsepowerGain: 22, imageUrl: bikeImages.panigaleGarage, accent: "#ff0f3f", featured: true,
  },
  {
    slug: "ducati-v4-carbon-winglet-pack",
    name: "Ducati V4 Carbon Winglet Pack",
    category: "Body Kits",
    description: "Autoclave carbon winglets and front aero elements engineered for stable high-speed load without visual compromise.",
    specs: { process: "Autoclave", weave: "2x2 twill", downforce: "+12% at 250 km/h", install: "Bolt-on" },
    priceCents: 174900, inventory: 8, horsepowerGain: 0, imageUrl: bikeImages.ducatiFront, accent: "#ffffff", featured: false,
  },
  {
    slug: "s1000rr-m-forged-wheel-set",
    name: "S1000RR M Forged Wheel Set",
    category: "Suspension",
    description: "Ultra-light forged aluminum wheel set reducing rotating mass for sharper turn-in and faster direction changes.",
    specs: { front: "3.5 × 17", rear: "6.0 × 17", saving: "2.9 kg", finish: "Acid gold" },
    priceCents: 389900, inventory: 4, horsepowerGain: 0, imageUrl: bikeImages.yellowSport, accent: "#ffd400", featured: true,
  },
  {
    slug: "blueprint-race-engine-package",
    name: "Blueprint Race Engine Package",
    category: "ECU Tuning",
    description: "Measured, balanced, and blueprinted superbike engine build with optimized squish, cam timing, and final dyno validation.",
    specs: { service: "Full blueprint", internals: "Balanced", validation: "Dyno + leakdown", leadTime: "4–6 weeks" },
    priceCents: 849900, inventory: 2, horsepowerGain: 28, imageUrl: bikeImages.engine, accent: "#ff7a00", featured: false,
  },
  {
    slug: "motogp-carbon-brake-conversion",
    name: "MotoGP Carbon Brake Conversion",
    category: "Brakes",
    description: "Closed-course carbon braking package with billet masters, race lines, cooling ducts, and setup consultation.",
    specs: { use: "Track only", rotors: "Carbon composite", master: "Billet radial", setup: "Included" },
    priceCents: 729900, inventory: 3, horsepowerGain: 0, imageUrl: bikeImages.race, accent: "#7c3cff", featured: true,
  },
  {
    slug: "canyon-pro-adjustable-rearsets",
    name: "Canyon Pro Adjustable Rearsets",
    category: "Racing Gear",
    description: "CNC-machined rearsets with reverse-shift capability, sealed bearings, and precise multi-axis adjustment.",
    specs: { material: "7075-T6", pattern: "Road / GP shift", positions: "12", finish: "Hard anodized" },
    priceCents: 74900, inventory: 18, horsepowerGain: 0, imageUrl: bikeImages.sunset, accent: "#00e5ff", featured: false,
  },
];

export async function ensureSeeded() {
  const slugs = catalog.map((item) => item.slug);
  const existing = await db.select({ slug: products.slug }).from(products).where(inArray(products.slug, slugs));
  const existingSlugs = new Set(existing.map((item) => item.slug));
  const missing = catalog.filter((item) => !existingSlugs.has(item.slug));
  if (missing.length > 0) await db.insert(products).values(missing);

  const [{ value: projectCount }] = await db.select({ value: count() }).from(projects);
  if (projectCount === 0) {
    await db.insert(projects).values([
      {
        slug: "panigale-v4-nightfall", title: "Panigale V4 Nightfall Spec", bikeModel: "Ducati Panigale V4",
        beforeImageUrl: bikeImages.garageRed, afterImageUrl: bikeImages.panigaleGarage,
        summary: "Full titanium system, carbon aero, race ECU, ceramic coating, and candy red edge-lit livery.",
        powerBefore: 205, powerAfter: 228,
        dyno: [{ rpm: 4000, hp: 62, torque: 72 }, { rpm: 6500, hp: 118, torque: 91 }, { rpm: 9000, hp: 176, torque: 106 }, { rpm: 12000, hp: 218, torque: 112 }, { rpm: 14500, hp: 228, torque: 103 }],
        featured: true,
      },
      {
        slug: "r1-cyan-attack", title: "R1 Cyan Attack Track Build", bikeModel: "Yamaha YZF-R1",
        beforeImageUrl: bikeImages.yamaha, afterImageUrl: bikeImages.racePit,
        summary: "Blue-purple livery, quick-turn throttle, race suspension geometry, Brembo package, and dyno-mapped fueling.",
        powerBefore: 178, powerAfter: 201,
        dyno: [{ rpm: 4000, hp: 55, torque: 67 }, { rpm: 7000, hp: 126, torque: 88 }, { rpm: 9500, hp: 168, torque: 98 }, { rpm: 12000, hp: 194, torque: 96 }, { rpm: 13800, hp: 201, torque: 90 }],
        featured: true,
      },
    ]);
  }

  const [{ value: notificationCount }] = await db.select({ value: count() }).from(notifications);
  if (notificationCount === 0) {
    await db.insert(notifications).values([
      { title: "Midnight drop", body: "Ten new race-spec packages have landed in the catalog.", type: "promotion" },
      { title: "Dyno bay open", body: "Two Stage 3 ECU slots opened for this Friday night.", type: "booking" },
      { title: "Track pack shipped", body: "Latest Brembo race pack order moved to processing.", type: "order" },
    ]);
  }

  const settings = await db.query.siteSettings.findFirst();
  if (!settings) {
    await db.insert(siteSettings).values({ heroImageUrl: bikeImages.racePit });
  }

  const adminEmail = "admin@neonpit.local";
  const existingAdmin = await db.query.users.findFirst({ where: eq(users.email, adminEmail) });
  if (!existingAdmin) {
    await db.insert(users).values({
      name: "Neon Pit Admin",
      email: adminEmail,
      passwordHash: await hashPassword("AdminPass123!"),
      role: "admin",
      phone: "+1 555 0100",
    });
  }
}
