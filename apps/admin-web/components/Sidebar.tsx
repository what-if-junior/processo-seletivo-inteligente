"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/processos", label: "Processos" },
  { href: "/admin/inscricoes", label: "Inscrições" },
  { href: "/admin/homologacao", label: "Homologação" },
  { href: "/admin/contestacoes", label: "Contestações" },
  { href: "/admin/candidatos", label: "Candidatos" },
  { href: "/admin/lotes", label: "Lotes" },
  { href: "/admin/chamadas", label: "Chamadas" },
  { href: "/admin/relatorios", label: "Relatórios" },
  { href: "/admin/hub", label: "Ajuda / Hub" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

function isActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2.5 border-b border-slate-200 px-5 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2f9e41] text-sm font-bold text-white">
          IF
        </span>
        <span className="text-lg font-semibold text-slate-900">IFB Admin</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Principal">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-[#2f9e41] text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
