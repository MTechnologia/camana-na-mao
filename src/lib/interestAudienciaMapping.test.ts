import { describe, expect, it } from "vitest";
import {
  audienciaMatchesInterestTerms,
  interestCategoriesToAudienciaTemas,
  interestCategoriesToSearchTerms,
  interestCategoryToAudienciaTema,
} from "./interestAudienciaMapping";

describe("interestAudienciaMapping", () => {
  it("mapeia slugs do perfil para temas de audiência", () => {
    expect(interestCategoryToAudienciaTema("saude")).toBe("Saúde");
    expect(interestCategoryToAudienciaTema("meio_ambiente")).toBe("Meio Ambiente");
    expect(interestCategoryToAudienciaTema("habitacao")).toBe("Urbanismo");
    expect(interestCategoryToAudienciaTema("legislativo")).toBe("Legislativo");
    expect(interestCategoryToAudienciaTema("economia")).toBe("Economia");
  });

  it("deduplica temas", () => {
    expect(interestCategoriesToAudienciaTemas(["saude", "saude", "cultura"])).toEqual([
      "Saúde",
      "Cultura",
    ]);
  });

  it("inclui termos de busca para categorias sem alerta canônico", () => {
    const terms = interestCategoriesToSearchTerms(["legislativo", "saude"]);
    expect(terms).toContain("Legislativo");
    expect(terms).toContain("Saúde");
  });

  it("casa audiência por tema, título ou descrição", () => {
    expect(
      audienciaMatchesInterestTerms({ tema: "Políticas de Saúde", titulo: "Audiência X" }, [
        "Saúde",
      ]),
    ).toBe(true);
    expect(
      audienciaMatchesInterestTerms({ tema: "Outro", titulo: "Mobilidade urbana" }, ["Mobilidade"]),
    ).toBe(true);
    expect(
      audienciaMatchesInterestTerms(
        { comissao: "Comissão de Trânsito e Transportes", titulo: "Audiência" },
        interestCategoriesToSearchTerms(["mobilidade"]),
      ),
    ).toBe(true);
    expect(audienciaMatchesInterestTerms({ tema: "Cultura", titulo: "Y" }, ["Saúde"])).toBe(false);
  });
});
