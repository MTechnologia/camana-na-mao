import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { DemographicHeatmap, __test__ } from "./DemographicHeatmap";
import type { CrossMatrix } from "@/hooks/useDemographicCrossAnalytics";

const { intensity, cellBgClass } = __test__;

afterEach(() => {
  cleanup();
});

function buildMatrix(): CrossMatrix {
  return {
    axis: "gender",
    categories: ["Urbano", "Transporte", "Avaliação"],
    demoValues: [
      { value: "feminino", label: "Feminino" },
      { value: "masculino", label: "Masculino" },
    ],
    cells: {
      "Urbano|feminino": 12,
      "Urbano|masculino": 8,
      "Transporte|feminino": 5,
      "Transporte|masculino": 3,
      "Avaliação|feminino": 0,
      "Avaliação|masculino": 1,
    },
    maxCount: 12,
    total: 29,
    rowTotals: { Urbano: 20, Transporte: 8, Avaliação: 1 },
    colTotals: { feminino: 17, masculino: 12 },
  };
}

describe("intensity helper", () => {
  it("retorna 0 quando max é 0 ou count é 0", () => {
    expect(intensity(0, 0)).toBe(0);
    expect(intensity(5, 0)).toBe(0);
    expect(intensity(0, 10)).toBe(0);
  });

  it("retorna sqrt(count/max) para suavizar a distribuição", () => {
    expect(intensity(10, 10)).toBeCloseTo(1);
    expect(intensity(1, 100)).toBeCloseTo(0.1);
    expect(intensity(25, 100)).toBeCloseTo(0.5);
  });
});

describe("cellBgClass helper", () => {
  it("zero retorna fundo neutro", () => {
    expect(cellBgClass(0)).toContain("muted");
  });

  it("mais intenso retorna mais escuro", () => {
    const lowMid = cellBgClass(0.3);
    const high = cellBgClass(0.9);
    expect(lowMid).not.toBe(high);
    expect(high).toContain("primary");
  });
});

describe("DemographicHeatmap", () => {
  it("renderiza skeletons quando isLoading e total=0", () => {
    const empty: CrossMatrix = {
      ...buildMatrix(),
      cells: {},
      total: 0,
      maxCount: 0,
      rowTotals: { Urbano: 0, Transporte: 0, Avaliação: 0 },
      colTotals: {},
    };
    const { container } = render(<DemographicHeatmap matrix={empty} isLoading />);
    expect(container.querySelectorAll("[class*='animate-pulse']").length).toBeGreaterThan(0);
  });

  it("mostra mensagem quando matriz é vazia e não está carregando", () => {
    const empty: CrossMatrix = {
      ...buildMatrix(),
      cells: {},
      total: 0,
      maxCount: 0,
      rowTotals: { Urbano: 0, Transporte: 0, Avaliação: 0 },
      colTotals: {},
    };
    render(<DemographicHeatmap matrix={empty} />);
    expect(screen.getByText(/sem dados demográficos/i)).toBeInTheDocument();
  });

  it("renderiza categorias e valores demográficos como cabeçalhos", () => {
    render(<DemographicHeatmap matrix={buildMatrix()} />);
    expect(screen.getByText("Urbano")).toBeInTheDocument();
    expect(screen.getByText("Transporte")).toBeInTheDocument();
    expect(screen.getByText("Avaliação")).toBeInTheDocument();
    expect(screen.getByText("Feminino")).toBeInTheDocument();
    expect(screen.getByText("Masculino")).toBeInTheDocument();
  });

  it("renderiza contagens nas células", () => {
    render(<DemographicHeatmap matrix={buildMatrix()} />);
    // Urbano|feminino = 12
    expect(screen.getByLabelText(/Urbano × Feminino: 12 relatos/i)).toBeInTheDocument();
    // Avaliação|masculino = 1
    expect(screen.getByLabelText(/Avaliação × Masculino: 1 relato/i)).toBeInTheDocument();
  });

  it("dispara onCellClick em células com count > 0", () => {
    const onCellClick = vi.fn();
    render(<DemographicHeatmap matrix={buildMatrix()} onCellClick={onCellClick} />);
    const cell = screen.getByLabelText(/Urbano × Feminino: 12 relatos/i);
    fireEvent.click(cell);
    expect(onCellClick).toHaveBeenCalledWith("Urbano", "feminino", "Feminino", 12);
  });

  it("não dispara onCellClick em células zeradas", () => {
    const onCellClick = vi.fn();
    render(<DemographicHeatmap matrix={buildMatrix()} onCellClick={onCellClick} />);
    const zeroCell = screen.getByLabelText(/Avaliação × Feminino: 0 relatos/i);
    fireEvent.click(zeroCell);
    expect(onCellClick).not.toHaveBeenCalled();
  });

  it("permite ativação por teclado (Enter/Space) em células clicáveis", () => {
    const onCellClick = vi.fn();
    render(<DemographicHeatmap matrix={buildMatrix()} onCellClick={onCellClick} />);
    const cell = screen.getByLabelText(/Transporte × Masculino: 3 relatos/i);
    fireEvent.keyDown(cell, { key: "Enter" });
    expect(onCellClick).toHaveBeenCalledWith("Transporte", "masculino", "Masculino", 3);
  });
});
