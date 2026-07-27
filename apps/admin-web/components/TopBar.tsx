"use client";

import { useRouter } from "next/navigation";
import { logout } from "../lib/auth";

export function TopBar() {
  const router = useRouter();

  return (
    <header className="flex h-14 items-center justify-end border-b border-slate-200 bg-white px-6">
      <button
        type="button"
        title="Sair"
        onClick={() => {
          logout();
          router.replace("/login");
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-[#2f9e41] text-sm font-semibold text-white hover:bg-emerald-700"
      >
        AD
      </button>
    </header>
  );
}
