import type { Metadata } from "next";
import { JetBrains_Mono, Geist } from "next/font/google";
import "./globals.css";

const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
});

const body = Geist({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Variantform — Git-native configuration overlays",
  description:
    "Stop managing configs. Start declaring variants. Git-native configuration overlays for SaaS teams that need per-client customization without branch sprawl.",
  openGraph: {
    title: "Variantform",
    description: "Git-native configuration overlays for SaaS teams",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Variantform",
    description: "Git-native configuration overlays for SaaS teams",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${code.variable} ${body.variable} font-[family-name:var(--font-body)] antialiased bg-black text-white`}
      >
        {children}
      </body>
    </html>
  );
}
