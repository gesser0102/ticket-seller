import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import type { SessionUserDto } from "@ticket-seller/shared";
import { UserMenu } from "./UserMenu";

function renderMenu(user: SessionUserDto, onLogout = vi.fn()) {
  return render(
    <MemoryRouter>
      <UserMenu user={user} onLogout={onLogout} />
    </MemoryRouter>,
  );
}

const client: SessionUserDto = {
  id: "1",
  email: "ana@teste.dev",
  name: "Ana Cliente",
  role: "client",
  registered: true,
};

describe("UserMenu", () => {
  it("mostra as iniciais do nome no avatar quando fechado", () => {
    renderMenu(client);
    expect(screen.getByText("AC")).toBeInTheDocument();
  });

  it("o dropdown começa fechado", () => {
    renderMenu(client);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("abre o dropdown ao clicar no gatilho, mostrando nome e e-mail", async () => {
    const user = userEvent.setup();
    renderMenu(client);
    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Ana Cliente")).toBeInTheDocument();
    expect(screen.getByText("ana@teste.dev")).toBeInTheDocument();
  });

  it("cliente registrado vê Meus ingressos e Minha conta", async () => {
    const user = userEvent.setup();
    renderMenu(client);
    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    expect(screen.getByRole("menuitem", { name: "Meus ingressos" })).toHaveAttribute("href", "/tickets");
    expect(screen.getByRole("menuitem", { name: "Minha conta" })).toHaveAttribute("href", "/conta");
  });

  it("portaria vê apenas o link do console da portaria", async () => {
    const gate: SessionUserDto = { id: "2", email: "g@g.com", name: "Gate", role: "gate", registered: true };
    const user = userEvent.setup();
    renderMenu(gate);
    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    expect(screen.getByRole("menuitem", { name: "Portaria" })).toHaveAttribute("href", "/gate");
    expect(screen.queryByRole("menuitem", { name: "Meus ingressos" })).not.toBeInTheDocument();
  });

  it("organizador vê apenas o link do painel", async () => {
    const organizer: SessionUserDto = {
      id: "3",
      email: "o@o.com",
      name: "Org",
      role: "organizer",
      registered: true,
    };
    const user = userEvent.setup();
    renderMenu(organizer);
    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    expect(screen.getByRole("menuitem", { name: "Painel do organizador" })).toHaveAttribute(
      "href",
      "/organizer",
    );
  });

  it("cliente ainda não registrado não vê Meus ingressos", async () => {
    const anonymous: SessionUserDto = { ...client, registered: false, email: null, name: null };
    const user = userEvent.setup();
    renderMenu(anonymous);
    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    expect(screen.queryByRole("menuitem", { name: "Meus ingressos" })).not.toBeInTheDocument();
  });

  it("usuário sem nome cadastrado usa o rótulo do papel como nome de exibição", async () => {
    const nameless: SessionUserDto = { ...client, name: null };
    const user = userEvent.setup();
    renderMenu(nameless);
    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    expect(screen.getByText("Cliente")).toBeInTheDocument();
  });

  it('clicar em "Sair" chama onLogout e fecha o menu', async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();
    renderMenu(client, onLogout);
    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    await user.click(screen.getByRole("menuitem", { name: "Sair" }));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("fecha o dropdown ao pressionar Escape", async () => {
    const user = userEvent.setup();
    renderMenu(client);
    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("fecha o dropdown ao clicar fora", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <div>
          <UserMenu user={client} onLogout={vi.fn()} />
          <button>Fora do menu</button>
        </div>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Menu da conta" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    await user.click(screen.getByText("Fora do menu"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
