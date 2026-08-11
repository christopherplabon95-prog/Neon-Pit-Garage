# NeonPit Full-Stack Website

Premium responsive motorcycle ecommerce, tuning studio, booking platform, and owner CMS built with Next.js App Router, PostgreSQL, and Drizzle ORM.

## Requirements

- Node.js 20+
- PostgreSQL 15+
- npm

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `DATABASE_URL`, a long random `AUTH_SECRET`, and your public `NEXT_PUBLIC_SITE_URL`.
3. Run `npm install`.
4. Run `npx drizzle-kit push`.
5. Run `npm run dev` for development or `npm run build && npm run start` for production.

The first request seeds 16 premium catalog entries, two showcase projects, default storefront settings, notifications, and a development admin account.

## Owner CMS

Open `/admin` after signing in on the storefront.

Development credentials:

- Email: `admin@neonpit.local`
- Password: `AdminPass123!`

Change the seeded password before a public production launch. The CMS supports:

- Add, edit, feature, restock, or remove catalog items
- Update order and booking workflow statuses
- Add, edit, or remove showcase builds
- Review contact messages
- Change store name, announcement, hero copy, and hero image
- Set garage address, coordinates, phone, WhatsApp, and email
- Set business hours, currencies, and conversion rates

## Deployment

Deploy to Vercel, Railway, Render, or another Node.js host with a managed PostgreSQL database. Add the environment variables from `.env.example`, run `npx drizzle-kit push` against the production database, then attach your custom domain. Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS domain so canonical URLs, robots.txt, sitemap.xml, and structured data use the correct public URL.

## Search indexing

The project includes metadata, canonical URLs, Open Graph data, JSON-LD, `robots.txt`, and a dynamic product sitemap. Search engines only index a stable public domain; temporary sandbox preview URLs are not intended for permanent indexing. After deploying to your domain, submit `/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

## Payments

The included checkout records test transactions and inventory atomically. Before accepting real money, connect the checkout route to live Stripe or PayPal credentials and confirm payment through signed provider webhooks. Never expose payment secrets to the browser.
