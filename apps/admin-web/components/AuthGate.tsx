"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAccessToken, setAccessToken } from "../lib/api";

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      const next = encodeURIComponent(pathname || "/admin");
      router.replace(`/login?next=${next}`);
      return;
    }
    // Keep middleware cookie in sync with sessionStorage JWT
    setAccessToken(token);
    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-600">
        Verificando autenticação…
      </div>
    );
  }

  return children;
}
