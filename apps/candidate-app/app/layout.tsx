import type { Metadata, Viewport } from "next";
import "../src/styles/index.css";

export const metadata: Metadata = {
  title: "PSI — Processos Seletivos IFB",
  description:
    "PWA mobile-first para inscrição em processos seletivos, envio de documentos e acompanhamento de resultados.",
  applicationName: "PSI IFB",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PSI IFB",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2A7B3E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
