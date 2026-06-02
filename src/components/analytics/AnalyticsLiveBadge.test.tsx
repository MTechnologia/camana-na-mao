import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render as baseRender, screen, fireEvent } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";
import { AnalyticsLiveBadge } from "./AnalyticsLiveBadge";

// Um descendente usa useLocation; embrulha em MemoryRouter para os testes.
const render = (ui: ReactElement) => baseRender(ui, { wrapper: MemoryRouter });

// globals:false → sem auto-cleanup do RTL; limpa o DOM entre os testes.
afterEach(cleanup);

describe("AnalyticsLiveBadge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("renderiza o texto 'Ao vivo'", () => {
    render(<AnalyticsLiveBadge lastUpdates={[]} />);
    expect(screen.getByText(/Ao vivo/i)).toBeInTheDocument();
  });

  it("mostra a última atualização mais recente entre múltiplas", () => {
    const older = new Date(Date.now() - 60_000); // 1 min atrás
    const newer = new Date(Date.now() - 5_000); // 5 s atrás
    render(<AnalyticsLiveBadge lastUpdates={[older, newer, null]} />);
    expect(screen.getByText(/atualizado/i).textContent).toContain("há 5s");
  });

  it("omite o texto 'atualizado' quando todas as datas são null", () => {
    render(<AnalyticsLiveBadge lastUpdates={[null, null]} />);
    expect(screen.queryByText(/atualizado/i)).not.toBeInTheDocument();
  });

  it("aciona onRefresh ao clicar no botão", () => {
    const onRefresh = vi.fn();
    render(<AnalyticsLiveBadge lastUpdates={[new Date()]} onRefresh={onRefresh} />);
    const btn = screen.getByRole("button", { name: /recarregar/i });
    fireEvent.click(btn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("não renderiza o botão de refresh quando onRefresh é omitido", () => {
    render(<AnalyticsLiveBadge lastUpdates={[new Date()]} />);
    expect(screen.queryByRole("button", { name: /recarregar/i })).not.toBeInTheDocument();
  });

  it("desabilita o botão durante refreshing", () => {
    const onRefresh = vi.fn();
    render(
      <AnalyticsLiveBadge lastUpdates={[new Date()]} onRefresh={onRefresh} refreshing />,
    );
    const btn = screen.getByRole("button", { name: /recarregar/i });
    expect(btn).toBeDisabled();
  });
});
