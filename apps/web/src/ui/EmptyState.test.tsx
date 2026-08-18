import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renderiza ícone e título", () => {
    render(<EmptyState icon={<svg data-testid="icon" />} title="Nada por aqui" />);
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByText("Nada por aqui")).toBeInTheDocument();
  });

  it("renderiza a dica quando fornecida", () => {
    render(<EmptyState icon={<svg />} title="Vazio" hint="Tente outro filtro." />);
    expect(screen.getByText("Tente outro filtro.")).toBeInTheDocument();
  });

  it("não renderiza parágrafo de dica quando ela não é passada", () => {
    render(<EmptyState icon={<svg />} title="Vazio" />);
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });
});
