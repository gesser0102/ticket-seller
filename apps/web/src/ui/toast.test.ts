import { describe, expect, it, vi } from "vitest";
import { showToast, subscribeToToasts } from "./toast";

describe("toast pub/sub", () => {
  it("entrega a mensagem pros ouvintes inscritos", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToToasts(handler);

    showToast("Link copiado!");

    expect(handler).toHaveBeenCalledWith("Link copiado!");
    unsubscribe();
  });

  it("cancelar a inscrição impede que o ouvinte receba mensagens futuras", () => {
    const handler = vi.fn();
    const unsubscribe = subscribeToToasts(handler);
    unsubscribe();

    showToast("Não deveria chegar");

    expect(handler).not.toHaveBeenCalled();
  });

  it("suporta múltiplos ouvintes inscritos ao mesmo tempo", () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubFirst = subscribeToToasts(first);
    const unsubSecond = subscribeToToasts(second);

    showToast("pra todo mundo");

    expect(first).toHaveBeenCalledWith("pra todo mundo");
    expect(second).toHaveBeenCalledWith("pra todo mundo");
    unsubFirst();
    unsubSecond();
  });
});
