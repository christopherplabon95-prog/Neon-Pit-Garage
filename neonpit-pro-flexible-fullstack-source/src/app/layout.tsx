import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://neonpit.example";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "NeonPit Garage — Custom Superbike Parts & Tuning", template: "%s | NeonPit Garage" },
  description: "Shop premium superbike performance parts, explore custom motorcycle builds, and book ECU tuning and dyno services at NeonPit Garage.",
  keywords: ["custom motorcycle", "superbike parts", "ECU tuning", "motorcycle exhaust", "dyno tuning", "Panigale V4", "Yamaha R1", "S1000RR"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "NeonPit Garage",
    title: "NeonPit Garage — Built To Outrun Ordinary",
    description: "Rare performance hardware, precision tuning, and one-of-one superbike builds.",
    images: [{ url: "https://images.pexels.com/photos/17243628/pexels-photo-17243628.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=630&w=1200", width: 1200, height: 630, alt: "NeonPit custom superbike" }],
  },
  twitter: { card: "summary_large_image", title: "NeonPit Garage", description: "Custom superbike parts, builds, and tuning." },
  robots: { index: true, follow: true },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "MotorcycleRepair",
  name: "NeonPit Garage",
  url: siteUrl,
  description: "Premium custom motorcycle garage, tuning studio, and performance parts ecommerce store.",
  telephone: "+1 555 0100",
  address: { "@type": "PostalAddress", streetAddress: "1200 Apex Industrial Blvd", addressLocality: "Los Angeles", addressRegion: "CA", addressCountry: "US" },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://images.pexels.com" />
        <link rel="preconnect" href="https://www.openstreetmap.org" />
        <meta name="color-scheme" content="dark" />
      </head>
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}
