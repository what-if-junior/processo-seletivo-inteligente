import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import CandidateApp from "./CandidateApp";

describe("CandidateApp", () => {
  it("renders home shell with bottom navigation", () => {
    render(<CandidateApp />);

    expect(screen.getByText("Início")).toBeInTheDocument();
    expect(screen.getByText("Inscrições")).toBeInTheDocument();
    expect(screen.getByText("Avisos")).toBeInTheDocument();
    expect(screen.getByText("Perfil")).toBeInTheDocument();
    expect(screen.getByLabelText("Abrir Assistente Virtual")).toBeInTheDocument();
  });
});
