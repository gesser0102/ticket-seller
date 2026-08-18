import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DateField } from "./DateField";

function Controlled({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <div>
      <DateField id="birth" value={value} onChange={setValue} />
      <span data-testid="value">{value}</span>
      <button>Fora do campo</button>
    </div>
  );
}

describe("DateField", () => {
  it("mostra vazio quando o valor é uma string vazia", () => {
    render(<DateField id="birth" value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("dd/mm/aaaa")).toHaveValue("");
  });

  it("mostra a data em formato BR quando o valor ISO já vem preenchido", () => {
    render(<DateField id="birth" value="1995-05-20" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText("dd/mm/aaaa")).toHaveValue("20/05/1995");
  });

  it("mascara os dígitos digitados no formato dd/mm/aaaa progressivamente", async () => {
    const user = userEvent.setup();
    render(<DateField id="birth" value="" onChange={vi.fn()} />);
    const input = screen.getByPlaceholderText("dd/mm/aaaa");
    await user.type(input, "20051995");
    expect(input).toHaveValue("20/05/1995");
  });

  it("chama onChange com a data ISO assim que uma data completa e válida é digitada", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateField id="birth" value="" onChange={onChange} />);
    await user.type(screen.getByPlaceholderText("dd/mm/aaaa"), "20051995");
    expect(onChange).toHaveBeenLastCalledWith("1995-05-20");
  });

  it("não chama onChange pra uma data que não existe no calendário (31 de fevereiro)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateField id="birth" value="" onChange={onChange} />);
    await user.type(screen.getByPlaceholderText("dd/mm/aaaa"), "31021995");
    expect(onChange).not.toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it("marca erro visual ao sair do campo com uma data inválida", async () => {
    const user = userEvent.setup();
    render(
      <Controlled />,
    );
    await user.type(screen.getByPlaceholderText("dd/mm/aaaa"), "31021995");
    await user.click(screen.getByText("Fora do campo"));
    expect(await screen.findByText("Data inválida.")).toBeInTheDocument();
  });

  it("não marca erro quando o campo é deixado vazio", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    await user.click(screen.getByPlaceholderText("dd/mm/aaaa"));
    await user.click(screen.getByText("Fora do campo"));
    expect(screen.queryByText("Data inválida.")).not.toBeInTheDocument();
  });

  it("abre o painel de calendário ao focar o campo, com o dia selecionado marcado", async () => {
    const user = userEvent.setup();
    render(<DateField id="birth" value="1995-05-20" onChange={vi.fn()} />);
    await user.click(screen.getByPlaceholderText("dd/mm/aaaa"));
    expect(screen.getByRole("dialog", { name: "Selecionar data de nascimento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "20" })).toHaveClass("selected");
  });

  it("clicar num dia do calendário seleciona a data e fecha o painel", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateField id="birth" value="1995-05-01" onChange={onChange} />);
    await user.click(screen.getByPlaceholderText("dd/mm/aaaa"));
    await user.click(screen.getByRole("button", { name: "15" }));
    expect(onChange).toHaveBeenCalledWith("1995-05-15");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("datas futuras aparecem desabilitadas no calendário", async () => {
    const user = userEvent.setup();
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const iso = future.toISOString().slice(0, 10);
    render(<DateField id="birth" value={iso} onChange={vi.fn()} />);
    await user.click(screen.getByPlaceholderText("dd/mm/aaaa"));
    const futureDayButton = screen.getByRole("button", { name: String(future.getDate()) });
    expect(futureDayButton).toBeDisabled();
  });

  it("navega pro mês anterior/seguinte com as setas", async () => {
    const user = userEvent.setup();
    render(<DateField id="birth" value="1995-05-15" onChange={vi.fn()} />);
    await user.click(screen.getByPlaceholderText("dd/mm/aaaa"));
    expect(screen.getByRole("combobox", { name: "Mês" })).toHaveValue("4");

    await user.click(screen.getByRole("button", { name: "Mês anterior" }));
    expect(screen.getByRole("combobox", { name: "Mês" })).toHaveValue("3");

    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    await user.click(screen.getByRole("button", { name: "Próximo mês" }));
    expect(screen.getByRole("combobox", { name: "Mês" })).toHaveValue("5");
  });

  it("fecha o painel ao pressionar Escape", async () => {
    const user = userEvent.setup();
    render(<DateField id="birth" value="1995-05-15" onChange={vi.fn()} />);
    await user.click(screen.getByPlaceholderText("dd/mm/aaaa"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("desabilita o input e o botão de calendário quando disabled", () => {
    render(<DateField id="birth" value="" onChange={vi.fn()} disabled />);
    expect(screen.getByPlaceholderText("dd/mm/aaaa")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Abrir calendário" })).toBeDisabled();
  });
});
