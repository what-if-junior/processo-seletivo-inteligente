import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CandidateApp from "./CandidateApp";

function bottomNav() {
  const inicio = screen.getByRole("button", { name: "Início" });
  const nav = inicio.parentElement;
  if (!nav) throw new Error("bottom nav not found");
  return nav;
}

describe("CandidateApp inscription clarity", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "1");
  });

  it("shows strict guest greeting without demo name", () => {
    render(<CandidateApp />);
    expect(screen.getByRole("heading", { name: "Olá!" })).toBeInTheDocument();
    expect(screen.queryByText(/João/)).not.toBeInTheDocument();
  });

  it("opens hub from Ajuda Rápida and chat from hub", async () => {
    const user = userEvent.setup();
    render(<CandidateApp />);
    await user.click(screen.getByRole("button", { name: /Ajuda/ }));
    expect(
      await screen.findByRole("heading", { name: "Central de Ajuda" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Perguntas frequentes/i)).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /Falar com o assistente/i }),
    );
    expect(
      await screen.findByText(/assistente virtual do PSI-IFB/i),
    ).toBeInTheDocument();
  });

  it("shows Entrar | Criar conta on profile when logged out", async () => {
    const user = userEvent.setup();
    render(<CandidateApp />);
    await user.click(within(bottomNav()).getByRole("button", { name: "Perfil" }));
    expect(screen.getByRole("heading", { name: "Conta do candidato" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar conta" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Criar conta" }));
    expect(screen.getByLabelText("Nome completo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Criar conta e entrar" })).toBeInTheDocument();
  });

  it("blocks wizard step 2 without escola and cota", async () => {
    const user = userEvent.setup();
    render(<CandidateApp />);
    await user.click(screen.getByRole("button", { name: /Técnico em Informática/i }));
    await user.click(screen.getByRole("button", { name: "INSCREVER-SE" }));
    // step 1 → continue
    await user.click(screen.getByRole("button", { name: /Continuar/i }));
    // step 2 without selections
    await user.click(screen.getByRole("button", { name: /Continuar/i }));
    expect(
      await screen.findByText(/Selecione a escola de origem e a modalidade de cota/i),
    ).toBeInTheDocument();
  });
});
