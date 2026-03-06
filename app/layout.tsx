import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "DecentralChain — The Infrastructure Layer for Digital Economies",
  description:
    "DecentralChain is a high-performance Layer 1 blockchain designed for real-world payments, scalable DeFi, and enterprise-grade digital infrastructure.",
  keywords: [
    "blockchain",
    "Layer 1",
    "DeFi",
    "payments",
    "infrastructure",
    "DecentralChain",
    "Web3",
    "tokenization",
  ],
  openGraph: {
    title: "DecentralChain — The Infrastructure Layer for Digital Economies",
    description:
      "High-performance Layer 1 blockchain designed for real-world payments, scalable DeFi, and enterprise-grade digital infrastructure.",
    type: "website",
    siteName: "DecentralChain",
  },
  twitter: {
    card: "summary_large_image",
    title: "DecentralChain — The Infrastructure Layer for Digital Economies",
    description:
      "High-performance Layer 1 blockchain for real-world payments, DeFi, and enterprise infrastructure.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('dcc-theme');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark')}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()`,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}
        style={{
          fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
