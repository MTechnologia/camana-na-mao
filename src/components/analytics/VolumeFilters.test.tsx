import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { VolumeFilters } from "./VolumeFilters";
import {
  EMPTY_VOLUME_FILTERS,
  type VolumeFiltersValue,
} from "./volumeFiltersConstants";

afterEach(() => {
  cleanup();
});

function setup(value: VolumeFiltersValue = EMPTY_VOLUME_FILTERS) {
  const onChange = vi.fn();
  const utils = render(
    <VolumeFilters
      value={value}
      onChange={onChange}
      availableCategories={["Iluminação", "Buraco", "Linha de ônibus"]}
      availableRegions={["Tatuapé", "Sé", "Pinheiros"]}
    />,
  );
  return { ...utils, onChange };
}

describe("VolumeFilters", () => {
  it("renderiza o título e os triggers de cada filtro", () => {
    setup();
    expect(screen.getByText("Filtros de volume")).toBeTruthy();
    expect(screen.getByText("Período")).toBeTruthy();
    expect(screen.getByRole("button", { name: /filtrar por categorias/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /filtrar por bairros/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /filtrar por zonas/i })).toBeTruthy();
  });

  it("não mostra botão 'Limpar tudo' quando não há filtros ativos", () => {
    setup();
    expect(screen.queryByRole("button", { name: /limpar tudo/i })).toBeNull();
  });

  it("mostra contador e botão 'Limpar tudo' quando há filtros ativos", () => {
    setup({
      period: undefined,
      categories: ["Iluminação", "Buraco"],
      regions: ["Sé"],
      zones: [],
    });

    expect(screen.getByText(/3 ativos/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /limpar tudo/i })).toBeTruthy();
  });

  it("dispara onChange com filtros vazios ao clicar em 'Limpar tudo'", () => {
    const { onChange } = setup({
      period: undefined,
      categories: ["Iluminação"],
      regions: [],
      zones: [],
    });

    fireEvent.click(screen.getByRole("button", { name: /limpar tudo/i }));

    expect(onChange).toHaveBeenCalledWith(EMPTY_VOLUME_FILTERS);
  });

  it("mostra label customizado quando uma única categoria está selecionada", () => {
    setup({
      period: undefined,
      categories: ["Iluminação"],
      regions: [],
      zones: [],
    });

    // O texto "Categorias: Iluminação" aparece dentro do trigger.
    expect(screen.getByRole("button", { name: /filtrar por categorias/i }).textContent).toContain(
      "Iluminação",
    );
  });

  it("mostra contador quando múltiplas categorias estão selecionadas", () => {
    setup({
      period: undefined,
      categories: ["Iluminação", "Buraco"],
      regions: [],
      zones: [],
    });

    const trigger = screen.getByRole("button", { name: /filtrar por categorias/i });
    expect(trigger.textContent).toContain("Categorias (2)");
  });

  it("desabilita o multiselect de categorias quando a lista está vazia", () => {
    render(
      <VolumeFilters
        value={EMPTY_VOLUME_FILTERS}
        onChange={vi.fn()}
        availableCategories={[]}
        availableRegions={["Sé"]}
      />,
    );

    const categoriesTrigger = screen.getByRole("button", { name: /filtrar por categorias/i });
    expect((categoriesTrigger as HTMLButtonElement).disabled).toBe(true);
  });
});
