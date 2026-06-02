import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import DataCollectionTracker, { type CollectedFields } from "./DataCollectionTracker";

// vitest.config tem globals:false → sem auto-cleanup; limpamos o DOM entre os testes
// para as bound queries (document.body) não enxergarem renders anteriores.
afterEach(cleanup);

describe("DataCollectionTracker", () => {
  it("não renderiza nada quando não há coleta ativa", () => {
    const { container } = render(
      <DataCollectionTracker collectionType={null} collectedFields={{}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("mostra 0% e o título da jornada para um relato urbano vazio (modo recolhido)", () => {
    const { getByTestId, container } = render(
      <DataCollectionTracker collectionType="urban_report" collectedFields={{}} />,
    );
    expect(getByTestId("tracker-collapsed")).toBeTruthy();
    expect(container.textContent).toContain("0%");
    expect(container.textContent).toContain("Experiência Urbana");
  });

  it("calcula o progresso a partir dos campos coletados (2 de 7 → 29%)", () => {
    const collected: CollectedFields = { service_type: "ubs", service_name: "UBS Vila X" };
    const { container } = render(
      <DataCollectionTracker collectionType="service_rating" collectedFields={collected} />,
    );
    expect(container.textContent).toContain("29%");
  });

  it("sinaliza o campo ativo enquanto há obrigatórios pendentes", () => {
    const { container } = render(
      <DataCollectionTracker
        collectionType="urban_report"
        collectedFields={{}}
        currentField="category"
      />,
    );
    // dica do campo atual: "→ Categoria"
    expect(container.textContent).toContain("Categoria");
  });

  it("marca a jornada como 'Pronto' quando todos os obrigatórios foram coletados", () => {
    const collected: CollectedFields = {
      service_type: "ubs",
      service_name: "UBS Vila X",
      service_address_confirmed: true,
      rating_stars: 5,
      wait_time_score: 3,
      rating_text: "Atendimento ótimo",
    };
    const { container } = render(
      <DataCollectionTracker collectionType="service_rating" collectedFields={collected} />,
    );
    expect(container.textContent).toContain("Pronto");
  });

  it("expande e mostra a contagem coletados/total e os indicadores de campo", () => {
    const collected: CollectedFields = { service_type: "ubs", service_name: "UBS Vila X" };
    const { getByTestId, queryByTestId, container } = render(
      <DataCollectionTracker collectionType="service_rating" collectedFields={collected} />,
    );
    expect(queryByTestId("tracker-expanded")).toBeNull();
    fireEvent.click(getByTestId("tracker-collapsed"));
    expect(getByTestId("tracker-expanded")).toBeTruthy();
    // coletados (2) de total (7)
    expect(container.textContent).toContain("2/7");
  });
});
