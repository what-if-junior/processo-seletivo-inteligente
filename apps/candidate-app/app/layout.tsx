import type { Metadata } from "next";
import "../src/styles/index.css";

export const metadata: Metadata = {
  title: "PSI — Processos Seletivos IFB",
  description:
    "PWA mobile-first para inscrição em processos seletivos, envio de documentos e acompanhamento de resultados.",
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
