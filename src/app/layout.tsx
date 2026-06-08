import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { I18nProvider } from "@/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tak — El sonido del pádel",
  description: "Encuentra jugadores, reserva canchas, compite en rankings y conecta con la comunidad de pádel más grande del mundo.",
  manifest: "/manifest.json",
  keywords: ["padel", "pádel", "deportes", "matchmaking", "reservas", "canchas", "ranking"],
  authors: [{ name: "Tak" }],
  openGraph: {
    title: "Tak",
    description: "El sonido del pádel 🏓",
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
      <body>
        <AuthProvider>
          <I18nProvider>{children}</I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

