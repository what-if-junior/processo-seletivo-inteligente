"use client";

import { useEffect, useState } from "react";
import { type Cursos } from "@repo/types";
import { apiFetch, ApiError } from "../lib/api";
import { useToast } from "./ToastProvider";
import { DataTable } from "./DataTable";

export function CursosEditor({ onCourseCreated }: { onCourseCreated?: (curso: Cursos) => void }) {
  const { push } = useToast();
  const [cursos, setCursos] = useState<Cursos[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [nome, setNome] = useState("");
  const [eixoTecnologico, setEixoTecnologico] = useState("");
  const [requisitoEscolaridade, setRequisitoEscolaridade] = useState("");
  const [areaConhecimento, setAreaConhecimento] = useState("");

  async function load() {
    setLoading(true);
    try {
      const list = await apiFetch<Cursos[]>("/cursos");
      setCursos(list);
    } catch (e) {
      push(e instanceof ApiError ? e.message : "Falha ao carregar cursos.", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      push("Informe o nome do curso.", "error");
      return;
    }
    setBusy(true);
    try {
      const created = await apiFetch<Cursos>("/cursos", {
        method: "POST",
        body: JSON.stringify({
          nome: nome.trim(),
          eixo_tecnologico: eixoTecnologico.trim() || undefined,
          requisito_escolaridade: requisitoEscolaridade.trim() || undefined,
          area_conhecimento: areaConhecimento.trim() || undefined,
        }),
      });
      push(`Curso "${created.nome}" cadastrado com sucesso!`);
      setNome("");
      setEixoTecnologico("");
      setRequisitoEscolaridade("");
      setAreaConhecimento("");
      await load();
      if (onCourseCreated) onCourseCreated(created);
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Erro ao criar curso.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number, nomeCurso: string) {
    if (!window.confirm(`Tem certeza que deseja remover o curso "${nomeCurso}"?`)) return;
    setBusy(true);
    try {
      await apiFetch(`/cursos/${id}`, { method: "DELETE" });
      push("Curso removido.");
      await load();
    } catch (err) {
      push(err instanceof ApiError ? err.message : "Erro ao remover curso.", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Nome do Curso
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Técnico em Informática"
              required
            />
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Eixo Tecnológico (opcional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={eixoTecnologico}
              onChange={(e) => setEixoTecnologico(e.target.value)}
              placeholder="Ex: Informação e Comunicação"
            />
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Requisito de Escolaridade (opcional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={requisitoEscolaridade}
              onChange={(e) => setRequisitoEscolaridade(e.target.value)}
              placeholder="Ex: Ensino Fundamental completo"
            />
          </label>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700">
            Área de Conhecimento (opcional)
            <input
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={areaConhecimento}
              onChange={(e) => setAreaConhecimento(e.target.value)}
              placeholder="Ex: Ciências Exatas"
            />
          </label>
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-[#2f9e41] px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            Cadastrar Curso
          </button>
        </div>
      </form>

      {loading ? (
        <p className="text-sm text-slate-500">Carregando catálogo de cursos…</p>
      ) : cursos.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum curso cadastrado ainda. Use o formulário acima para adicionar.</p>
      ) : (
        <DataTable headers={["ID", "Nome", "Eixo Tecnológico", "Requisito", "Área de Conhecimento", "Ações"]}>
          {cursos.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className="px-4 py-2 text-slate-500 font-mono text-xs">#{c.id}</td>
              <td className="px-4 py-2 font-medium text-slate-900">{c.nome}</td>
              <td className="px-4 py-2 text-xs text-slate-600">{c.eixo_tecnologico || "—"}</td>
              <td className="px-4 py-2 text-xs text-slate-600">{c.requisito_escolaridade || "—"}</td>
              <td className="px-4 py-2 text-xs text-slate-600">{c.area_conhecimento || "—"}</td>
              <td className="px-4 py-2">
                <button
                  type="button"
                  className="text-xs text-red-600 hover:underline"
                  onClick={() => onDelete(c.id, c.nome)}
                >
                  Remover
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
