import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const useVereadoresMock = vi.fn();
vi.mock("@/hooks/useVereadores", () => ({
  useVereadores: () => useVereadoresMock(),
}));

import { InlineVereadorPicker } from "./InlineVereadorPicker";

const VEREADORES = [
  { id: "1", name: "Milton Leite", party: "UNIÃO", region: "Zona Sul" },
  { id: "2", name: "Rubinho Nunes", party: "UNIÃO" },
  { id: "3", name: "Tito Bernardes", party: "PSDB" },
];

function mockState(state: Partial<{ data: unknown; isLoading: boolean; isError: boolean }>) {
  useVereadoresMock.mockReturnValue({
    data: state.data ?? [],
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
  });
}

afterEach(() => {
  cleanup();
  useVereadoresMock.mockReset();
});

describe("InlineVereadorPicker", () => {
  it("lista todos os vereadores e rotula a busca como 'Qual o nome do vereador?'", () => {
    mockState({ data: VEREADORES });
    render(<InlineVereadorPicker onSelect={vi.fn()} />);

    expect(screen.getByText("Qual o nome do vereador?")).toBeTruthy();
    expect(screen.getByText("Milton Leite")).toBeTruthy();
    expect(screen.getByText("Rubinho Nunes")).toBeTruthy();
    expect(screen.getByText("Tito Bernardes")).toBeTruthy();
  });

  it("filtra por nome (ignorando acentos) e devolve nome + partido ao selecionar", () => {
    const onSelect = vi.fn();
    mockState({ data: VEREADORES });
    render(<InlineVereadorPicker onSelect={onSelect} />);

    fireEvent.change(screen.getByPlaceholderText("Digite o nome ou partido..."), {
      target: { value: "milton" },
    });

    expect(screen.queryByText("Rubinho Nunes")).toBeNull();
    fireEvent.click(screen.getByText("Milton Leite"));

    expect(onSelect).toHaveBeenCalledWith("Milton Leite", "UNIÃO");
    expect(screen.getByText("Vereador selecionado ✓")).toBeTruthy();
  });

  it("filtra por partido", () => {
    mockState({ data: VEREADORES });
    render(<InlineVereadorPicker onSelect={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Digite o nome ou partido..."), {
      target: { value: "psdb" },
    });

    expect(screen.getByText("Tito Bernardes")).toBeTruthy();
    expect(screen.queryByText("Milton Leite")).toBeNull();
  });

  it("NREF012: exibe TODOS os vereadores de um partido com mais de 4 representantes", () => {
    const PT = Array.from({ length: 8 }, (_, i) => ({
      id: `pt-${i + 1}`,
      name: `Vereador PT ${i + 1}`,
      party: "PT",
    }));
    mockState({ data: [...PT, { id: "x", name: "Outro", party: "PSDB" }] });
    render(<InlineVereadorPicker onSelect={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Digite o nome ou partido..."), {
      target: { value: "pt" },
    });

    // Nenhum dos 8 pode ficar de fora (bug: só os 4 primeiros apareciam).
    for (const v of PT) {
      expect(screen.getByText(v.name)).toBeTruthy();
    }
    expect(screen.queryByText("Outro")).toBeNull();
    // Mostra a contagem para o usuário saber que há mais do que cabe na tela.
    expect(screen.getByText(/8 vereadores encontrados/i)).toBeTruthy();
  });

  it("mostra mensagem amigável quando o nome não existe (ex.: 'Fulano de tal')", () => {
    mockState({ data: VEREADORES });
    render(<InlineVereadorPicker onSelect={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText("Digite o nome ou partido..."), {
      target: { value: "Fulano de tal" },
    });

    expect(screen.getByText(/Não encontrei nenhum vereador com esse nome/i)).toBeTruthy();
    // Não oferece atalho de "usar texto livre" — só vereador da lista oficial.
    expect(screen.queryByText(/Usar "Fulano de tal"/i)).toBeNull();
  });

  it("mostra estado de carregamento", () => {
    mockState({ data: [], isLoading: true });
    render(<InlineVereadorPicker onSelect={vi.fn()} />);

    expect(screen.getByText(/Carregando vereadores/i)).toBeTruthy();
  });

  it("mostra fallback amigável em caso de erro de carregamento", () => {
    mockState({ data: [], isError: true });
    render(<InlineVereadorPicker onSelect={vi.fn()} />);

    expect(screen.getByText(/Não consegui carregar a lista de vereadores/i)).toBeTruthy();
  });
});
