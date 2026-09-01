import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CandidateApp from "./CandidateApp";
import * as session from "./lib/session";
import * as notifApi from "./lib/notificacoes-api";

function bottomNav() {
  const inicio = screen.getByRole("button", { name: "Início" });
  const nav = inicio.parentElement;
  if (!nav) throw new Error("bottom nav not found");
  return nav;
}

/** JWT fake com sub=10 (payload base64url. */
const FAKE_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjEwfQ.sig";

async function openPreferenciasAvisos() {
  const user = userEvent.setup();
  render(<CandidateApp />);
  await user.click(within(bottomNav()).getByRole("button", { name: "Perfil" }));
  // Aguarda o refresh do perfil (fetchCurrentUser mock) resolver.
  await new Promise((r) => setTimeout(r, 500));
  const btn = screen.getByRole("button", { name: /Preferência de Avisos/ });
  await user.click(btn);
  // Aguarda o fetch de preferências resolver e a tela montar.
  await new Promise((r) => setTimeout(r, 500));
  return user;
}

/**
 * W31-09 — O toggle de push na tela Preferência de Avisos deve ser
 * fail-closed: sem suporte/VAPID (ou em modo mock,, o toggle fica desativado
 * com texto explicativo — nunca um falso sucesso.

 */
describe("CandidateApp push preference toggle (W31-09)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "0");
    window.sessionStorage.setItem("psi.candidate.access_token", FAKE_TOKEN);
    vi.spyOn(session, "fetchCurrentUser").mockResolvedValue({
      id: 10,
      nome_completo: "João da Silva",
      email: "joao@teste.com",
    } as never);
    vi.spyOn(notifApi, "fetchPreferenciasAvisos").mockResolvedValue({
      id: 1,
      id_usuario: 10,
      silenciar_email: false,
      silenciar_push: false,
      silenciar_oficiais: false,
    } as never);
  });

  it("renders push toggle disabled with helper text when push unsupported", async () => {
    await openPreferenciasAvisos();

    const pushRow = screen
      .getByText("Silenciar push")
      .closest("div")
      ?.parentElement;
    expect(pushRow).not.toBeNull();
    const checkbox = within(pushRow as HTMLElement).getByRole("checkbox");
    expect(checkbox).toBeDisabled();
    expect(
      screen.getByText("Notificações push indisponíveis neste dispositivo"),
    ).toBeInTheDocument();
  });

  it("email and oficiais toggles remain enabled", async () => {
    await openPreferenciasAvisos();

    const emailRow = screen
      .getByText("Silenciar e-mail")
      .closest("div")
      ?.parentElement;
    const oficiaisRow = screen
      .getByText("Silenciar leitura de avisos oficiais")
      .closest("div")
      ?.parentElement;
    expect(
      within(emailRow as HTMLElement).getByRole("checkbox"),
    ).not.toBeDisabled();
    expect(
      within(oficiaisRow as HTMLElement).getByRole("checkbox"),
    ).not.toBeDisabled();
  });
});
