import { describe, expect, it, vi, beforeEach } from "vitest";

const ioMock = vi.fn();
vi.mock("socket.io-client", () => ({
  io: (...args: unknown[]) => ioMock(...args),
}));

describe("getSocket", () => {
  beforeEach(() => {
    vi.resetModules();
    ioMock.mockReset();
    ioMock.mockReturnValue({ id: "fake-socket" });
  });

  it("cria o socket com o path e withCredentials corretos na primeira chamada", async () => {
    const { getSocket } = await import("./socketClient");
    getSocket();
    expect(ioMock).toHaveBeenCalledWith({ path: "/socket.io", withCredentials: true });
    expect(ioMock).toHaveBeenCalledTimes(1);
  });

  it("reusa a mesma instância em chamadas subsequentes (singleton)", async () => {
    const { getSocket } = await import("./socketClient");
    const first = getSocket();
    const second = getSocket();
    expect(second).toBe(first);
    expect(ioMock).toHaveBeenCalledTimes(1);
  });
});
