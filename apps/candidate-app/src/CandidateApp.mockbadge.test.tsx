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

/**
 * ISSUE-006 (Option C): whenever mock data is painted, a visible
 * "dados de demonstração" badge must be shown so it is never mistaken
 * for live data.
 */
describe("CandidateApp mock source badge (ISSUE-006)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "1");
  });

  it("shows demo badge on home course list", () => {
    render(<CandidateApp />);
    expect(
      screen.getByRole("status", { name: "Dados de demonstração" }),
    ).toBeInTheDocument();
  });

  it("shows demo badge on Processos Abertos", async () => {
    const user = userEvent.setup();
    render(<CandidateApp />);
    await user.click(screen.getByRole("button", { name: "Ver todos" }));
    expect(
      screen.getByRole("status", { name: "Dados de demonstração" }),
    ).toBeInTheDocument();
  });

  it("shows demo badge on Minhas Inscrições", async () => {
    const user = userEvent.setup();
    render(<CandidateApp />);
    await user.click(within(bottomNav()).getByRole("button", { name: "Inscrições" }));
    expect(
      screen.getByRole("status", { name: "Inscrições de demonstração" }),
    ).toBeInTheDocument();
  });

  it("shows demo badge on Notificações", async () => {
    const user = userEvent.setup();
    render(<CandidateApp />);
    await user.click(within(bottomNav()).getByRole("button", { name: /Avisos/ }));
    expect(
      screen.getByRole("status", { name: "Avisos de demonstração" }),
    ).toBeInTheDocument();
  });

  it("shows demo badge on Envio de Documentos", async () => {
    const user = userEvent.setup();
    render(<CandidateApp />);
    // Open an edital then docs via the quick action
    await user.click(screen.getByRole("button", { name: /Enviar\s*Documentos/i }));
    expect(
      screen.getByRole("status", { name: "Dados de demonstração" }),
    ).toBeInTheDocument();
  });
});