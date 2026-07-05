import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { PwaProvider } from "@/components/PwaProvider";
import "./globals.css";

const meineSchrift = localFont({
  src: [
    {
      path: "./fonts/Chillax-Extralight.ttf",
      weight: "200",
      style: "normal",
    },
    {
      path: "./fonts/Chillax-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Chillax-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Chillax-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Chillax-Semibold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/Chillax-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Chillax-Variable.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  variable: "--font-chillax",
  display: "swap",
});


export const metadata: Metadata = {
  title: "Blumè.",
  description: "Deine To-Do App mit Erinnerungen",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Blumè.",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#FFB6C1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body className={`${meineSchrift.variable} antialiased`}>
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
