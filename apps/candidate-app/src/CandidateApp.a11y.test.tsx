import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CandidateApp from "./CandidateApp";

function bottomNav() {
  const inicio = screen.getByRole("button", { name: "Início" });
  const nav = inicio.parentElement;
  if (!nav) throw new Error("bottom nav not found");
  return nav;
}

/**
 * ISSUE-009 (RS08 / WCAG 2.1): nav accessible names must be stable and
 * unique — the unread badge count must NOT leak into the button name.
 */
describe("CandidateApp nav accessible names (ISSUE-009)", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCKS", "1");
  });

  it("exposes each nav tab with a stable accessible name", () => {
    render(<CandidateApp />);
    const nav = bottomNav();
    expect(within(nav).getByRole("button", { name: "Início" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Inscrições" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Avisos" })).toBeInTheDocument();
    expect(within(nav).getByRole("button", { name: "Perfil" })).toBeInTheDocument();
  });

  it("keeps Avisos name stable even when the unread badge is shown", () => {
    // In mock mode BottomNav sets unread=2, so the badge "2" renders.
    render(<CandidateApp />);
    const avisos = within(bottomNav()).getByRole("button", { name: "Avisos" });
    // Exact match — "2 Avisos" or "Avisos 2" would fail this assertion.
    expect(avisos).toHaveAttribute("aria-label", "Avisos");
    // The badge count is present visually but hidden from the a11y tree.
    expect(avisos.querySelector("span[aria-hidden='true']")).not.toBeNull();
  });

  it("keeps nav names unique (no duplicate accessible names)", () => {
    render(<CandidateApp />);
    const nav = bottomNav();
    const names = ["Início", "Inscrições", "Avisos", "Perfil"];
    for (const name of names) {
      expect(within(nav).getAllByRole("button", { name })).toHaveLength(1);
    }
  });

  it("opens notifications from the Avisos tab", async () => {
    const { default: userEvent } = await import("@testing-library/user-event");
    const user = userEvent.setup();
    render(<CandidateApp />);
    await user.click(
      within(bottomNav()).getByRole("button", { name: "Avisos" }),
    );
    expect(
      screen.getByRole("heading", { name: "Notificações" }),
    ).toBeInTheDocument();
  });
});