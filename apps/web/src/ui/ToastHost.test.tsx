import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";
import { ToastHost } from "./ToastHost";
import { showToast } from "./toast";

describe("ToastHost", () => {
  it("não renderiza nada enquanto não há toast nenhum", () => {
    const { container } = render(<ToastHost />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra a mensagem quando showToast é chamado", async () => {
    render(<ToastHost />);
    act(() => {
      showToast("Ingresso copiado!");
    });
    expect(await screen.findByText("Ingresso copiado!")).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("empilha múltiplos toasts simultâneos", async () => {
    render(<ToastHost />);
    act(() => {
      showToast("Primeiro");
      showToast("Segundo");
    });
    expect(await screen.findByText("Primeiro")).toBeInTheDocument();
    expect(screen.getByText("Segundo")).toBeInTheDocument();
  });

  it("some sozinho depois do tempo de exibição", async () => {
    vi.useFakeTimers();
    render(<ToastHost />);
    act(() => {
      showToast("Vai sumir");
    });
    expect(screen.getByText("Vai sumir")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(screen.queryByText("Vai sumir")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
