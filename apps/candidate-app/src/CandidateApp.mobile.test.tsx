import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CandidateApp from "./CandidateApp";

describe("mobile polish", () => {
  it("uses text-base on chat input to avoid iOS zoom", async () => {
    render(<CandidateApp />);
    screen.getByLabelText("Abrir Assistente Virtual").click();
    const input = await screen.findByPlaceholderText("Digite sua dúvida…");
    expect(input.className).toContain("text-base");
  });
});
