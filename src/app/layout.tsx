import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PadelApp — Tu red social de pádel",
  description: "Encuentra jugadores, reserva canchas, compite en rankings y conecta con la comunidad de pádel más grande del mundo.",
  manifest: "/manifest.json",
  keywords: ["padel", "pádel", "deportes", "matchmaking", "reservas", "canchas", "ranking"],
  authors: [{ name: "PadelApp" }],
  openGraph: {
    title: "PadelApp",
    description: "La red social de pádel #1",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAFA" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A0A" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
