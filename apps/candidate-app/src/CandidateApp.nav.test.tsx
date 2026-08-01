import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import CandidateApp from "./CandidateApp";

function bottomNav() {
  const inicio = screen.getByRole("button", { name: "Início" });
  const nav = inicio.parentElement;
  if (!nav) throw new Error("bottom nav not found");
  return nav;
}

describe("CandidateApp navigation", () => {
  it("opens notifications from bottom nav", async () => {
    const user = userEvent.setup();
    render(<CandidateApp />);

    await user.click(within(bottomNav()).getByRole("button", { name: /Avisos/ }));
    expect(screen.getByRole("heading", { name: "Notificações" })).toBeInTheDocument();
  });

  it("opens profile from bottom nav", async () => {
    const user = userEvent.setup();
    render(<CandidateApp />);

    await user.click(within(bottomNav()).getByRole("button", { name: "Perfil" }));
    expect(screen.getByRole("heading", { name: "Conta do candidato" })).toBeInTheDocument();
  });
});
