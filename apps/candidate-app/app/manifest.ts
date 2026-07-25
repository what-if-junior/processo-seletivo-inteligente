import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PSI — Processos Seletivos IFB",
    short_name: "PSI IFB",
    description:
      "Inscrição em processos seletivos, envio de documentos e acompanhamento de resultados.",
    start_url: "/",
    display: "standalone",
    background_color: "#F5F8F5",
    theme_color: "#2A7B3E",
    lang: "pt-BR",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
