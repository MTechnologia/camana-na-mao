import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/hooks/useResponseTimeAnalytics", () => ({
  useResponseTimeAnalytics: vi.fn(),
}));

import { useResponseTimeAnalytics } from "@/hooks/useResponseTimeAnalytics";
import { ResponseTimeOverviewTab } from "./ResponseTimeOverviewTab";

const mockedHook = vi.mocked(useResponseTimeAnalytics);

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderWithStats(stats: Partial<ReturnType<typeof useResponseTimeAnalytics>["stats"]> = {}) {
  mockedHook.mockReturnValue({
    stats: {
      count: 0,
      avgHours: 0,
      avgHoursPrevious: 0,
      medianHours: 0,
      deltaPct: 0,
      direction: "estavel",
      trend: [],
      byType: [],
      bySeverity: [],
      byCategory: [],
      byRegion: [],
      ...stats,
    },
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  } as unknown as ReturnType<typeof useResponseTimeAnalytics>);

  return render(<ResponseTimeOverviewTab />);
}

describe("ResponseTimeOverviewTab", () => {
  it("renderiza o KPI principal e auxiliares", () => {
    renderWithStats({
      count: 42,
      avgHours: 36,
      medianHours: 24,
    });
    expect(screen.getByText(/Tempo médio até resolução/i)).toBeTruthy();
    expect(screen.getByText("Mediana")).toBeTruthy();
    expect(screen.getByText("Total resolvidos")).toBeTruthy();
  });

  it("mostra delta com 'Mais rápido' quando direction = melhorou", () => {
    renderWithStats({
      avgHours: 10,
      avgHoursPrevious: 20,
      deltaPct: -50,
      direction: "melhorou",
    });
    expect(screen.getByText(/Mais rápido/i)).toBeTruthy();
  });

  it("mostra delta com 'Mais lento' quando direction = piorou", () => {
    renderWithStats({
      avgHours: 30,
      avgHoursPrevious: 10,
      deltaPct: 200,
      direction: "piorou",
    });
    expect(screen.getByText(/Mais lento/i)).toBeTruthy();
  });

  it("não exibe delta quando avgHoursPrevious = 0", () => {
    renderWithStats({
      avgHours: 10,
      avgHoursPrevious: 0,
      direction: "estavel",
    });
    expect(screen.queryByText(/Mais rápido/i)).toBeNull();
    expect(screen.queryByText(/Mais lento/i)).toBeNull();
  });

  it("renderiza estado de erro com botão 'Tentar novamente'", () => {
    mockedHook.mockReturnValue({
      stats: {
        count: 0,
        avgHours: 0,
        avgHoursPrevious: 0,
        medianHours: 0,
        deltaPct: 0,
        direction: "estavel",
        trend: [],
        byType: [],
        bySeverity: [],
        byCategory: [],
        byRegion: [],
      },
      isLoading: false,
      error: "Falha de rede",
      refresh: vi.fn(),
    } as unknown as ReturnType<typeof useResponseTimeAnalytics>);

    render(<ResponseTimeOverviewTab />);
    expect(screen.getByText(/Falha de rede/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeTruthy();
  });
});
