import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiClient } from "./apiClient";

function jsonResponse(body: unknown, ok = true, status = ok ? 200 : 400): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("apiClient", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("prefixa o path com /api e envia credentials same-origin", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, message: "OK", data: { ok: true } }));
    await apiClient.get("/movies");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/movies",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("GET retorna diretamente o campo data do envelope", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: true, message: "OK", data: { id: "1", title: "Filme" } }),
    );
    const data = await apiClient.get<{ id: string; title: string }>("/movies/1");
    expect(data).toEqual({ id: "1", title: "Filme" });
  });

  it("POST envia o corpo como JSON e método POST", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, message: "OK", data: null }));
    await apiClient.post("/auth/login", { email: "a@a.com", password: "123456" });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ email: "a@a.com", password: "123456" }));
  });

  it("POST sem corpo não envia body", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, message: "OK", data: null }));
    await apiClient.post("/auth/logout");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.body).toBeUndefined();
  });

  it("PATCH e DELETE usam o método HTTP correto", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ success: true, message: "OK", data: null }));
    await apiClient.patch("/users/me", { name: "X" });
    await apiClient.delete("/seats/1/hold");

    const methods = fetchMock.mock.calls.map((call: unknown[]) => (call[1] as RequestInit).method);
    expect(methods).toEqual(["PATCH", "DELETE"]);
  });

  it('lança ApiError com a mensagem do servidor quando success:false, mesmo com status HTTP ok', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, message: "Credenciais inválidas.", data: null }, true, 200),
    );
    await expect(apiClient.post("/auth/login", {})).rejects.toMatchObject({
      message: "Credenciais inválidas.",
    });
  });

  it("lança ApiError com o status HTTP quando a resposta não é ok", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ success: false, message: "Não encontrado.", data: null }, false, 404),
    );
    const error = await apiClient.get("/movies/inexistente").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(404);
  });

  it("usa uma mensagem padrão quando o corpo da resposta não é um JSON válido", async () => {
    const response = {
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    } as unknown as Response;
    fetchMock.mockResolvedValue(response);

    const error = await apiClient.get("/qualquer").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).message).toBe("Não foi possível concluir a solicitação.");
  });
});
