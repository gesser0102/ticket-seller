import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Modal } from "./Modal";

describe("Modal", () => {
  it("não renderiza nada quando open é false", () => {
    const { container } = render(
      <Modal open={false} title="Título" onClose={vi.fn()}>
        Conteúdo
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renderiza título, conteúdo e rodapé quando aberto", () => {
    render(
      <Modal open title="Editar sessão" onClose={vi.fn()} footer={<button>Salvar</button>}>
        <p>Formulário aqui</p>
      </Modal>,
    );
    expect(screen.getByRole("dialog", { name: "Editar sessão" })).toBeInTheDocument();
    expect(screen.getByText("Formulário aqui")).toBeInTheDocument();
    expect(screen.getByText("Salvar")).toBeInTheDocument();
  });

  it("chama onClose ao clicar no overlay", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open title="Título" onClose={onClose}>
        Conteúdo
      </Modal>,
    );
    const overlay = screen.getByRole("dialog").parentElement as HTMLElement;
    await user.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("clicar dentro do painel NÃO fecha o modal (stopPropagation)", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open title="Título" onClose={onClose}>
        <p>Conteúdo clicável</p>
      </Modal>,
    );
    await user.click(screen.getByText("Conteúdo clicável"));
    expect(onClose).not.toHaveBeenCalled();
  });

  it("chama onClose ao clicar no botão de fechar", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open title="Título" onClose={onClose}>
        Conteúdo
      </Modal>,
    );
    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("chama onClose ao pressionar Escape", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(
      <Modal open title="Título" onClose={onClose}>
        Conteúdo
      </Modal>,
    );
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("trava o scroll do body enquanto aberto e restaura ao fechar", () => {
    const { rerender } = render(
      <Modal open title="Título" onClose={vi.fn()}>
        Conteúdo
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("hidden");

    rerender(
      <Modal open={false} title="Título" onClose={vi.fn()}>
        Conteúdo
      </Modal>,
    );
    expect(document.body.style.overflow).toBe("");
  });
});
