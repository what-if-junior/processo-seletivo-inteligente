"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { login } from "../../lib/auth";
import { ApiError, isAuthenticatedClient } from "../../lib/api";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";

  const [email, setEmail] = useState("admin@teste.com");
  const [senha, setSenha] = useState("admin123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticatedClient()) router.replace(next);
  }, [next, router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login({ email, senha });
      router.replace(next.startsWith("/") ? next : "/admin");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          `Falha no login (HTTP ${err.status}). Use o seed admin@teste.com / admin123 se a API estiver no ar.`,
        );
      } else {
        setError(
          "Não foi possível autenticar. Verifique se a API está acessível em NEXT_PUBLIC_API_URL.",
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2f9e41] text-sm font-bold text-white">
            IF
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">IFB Admin</h1>
            <p className="text-sm text-slate-500">Acesso ao console de revisão</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">E-mail</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2f9e41]"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Senha</span>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2f9e41]"
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#2563eb] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">
          Dev seed: <code>admin@teste.com</code> / <code>admin123</code>
          <br />
          (Prototype usava <code>admin@ifb.edu.br</code> — não é o seed do backend.)
        </p>
      </div>
    </div>
  );
}
