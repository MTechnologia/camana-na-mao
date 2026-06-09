import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";

import {
  isSubstantiveUrbanNatureDescription,
  isValidUrbanReportDescription,
} from "./lib-nlp-utils.ts";
import {
  applyUrbanNatureCategoryDefaults,
  buildUrbanNonComplaintLlmInstruction,
  isUrbanDuvidaReadyForAnswer,
  isUrbanNonComplaintReadyForLlmTurn,
  urbanNatureSkipsLocationCollection,
} from "./lib-urban-rules.ts";
import { getNextMissingField } from "./lib-next-missing-field.ts";
import {
  generateLabelFromDescription,
  isBareUrbanReportNatureReply,
  isGenericIntentText,
  URBAN_REPORT_NATURE_VALUES,
} from "./lib.ts";

const mockSupabase = {
  from() {
    return {
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: async () => ({ data: [] }),
          }),
          maybeSingle: async () => ({ data: null }),
        }),
      }),
    };
  },
};

Deno.test("urbanNatureSkipsLocationCollection: duvida, sugestao e elogio", () => {
  assertEquals(urbanNatureSkipsLocationCollection("duvida"), true);
  assertEquals(urbanNatureSkipsLocationCollection("sugestao"), true);
  assertEquals(urbanNatureSkipsLocationCollection("elogio"), true);
  assertEquals(urbanNatureSkipsLocationCollection("reclamacao"), false);
});

Deno.test("isUrbanNonComplaintReadyForLlmTurn: sugestão com descrição + categoria", () => {
  assertEquals(
    isUrbanNonComplaintReadyForLlmTurn({
      report_nature: "sugestao",
      description: "Seria bom se tivéssemos mais policiamento nos parques",
      category: "outro",
    }),
    true,
  );
});

Deno.test("isUrbanNonComplaintReadyForLlmTurn: elogio com descrição + categoria", () => {
  assertEquals(
    isUrbanNonComplaintReadyForLlmTurn({
      report_nature: "elogio",
      description:
        "Gostaria de elogiar o policiamento e segurança na cidade de SP, sabemos que ainda há muito a melhorar, porém está evoluindo muito bem!",
      category: "outro",
    }),
    true,
  );
});

Deno.test("isUrbanNonComplaintReadyForLlmTurn: elogio a vereador (feedback_camara) NÃO é conversacional → registra", () => {
  // Feedback à Câmara sobre vereador deve virar registro formal (e ofertar estrelas),
  // não turno conversacional. Caso contrário a IA só agradece e nunca registra/avalia.
  assertEquals(
    isUrbanNonComplaintReadyForLlmTurn({
      report_nature: "elogio",
      description: "Excelente atuação na saúde, sempre presente no bairro",
      category: "feedback_camara",
      council_member_name: "Milton Leite",
    }),
    false,
  );
});

Deno.test("isUrbanNonComplaintReadyForLlmTurn: sugestão a vereador (feedback_camara) NÃO é conversacional → registra", () => {
  assertEquals(
    isUrbanNonComplaintReadyForLlmTurn({
      report_nature: "sugestao",
      description: "Sugiro que o vereador proponha mais ciclovias na zona leste",
      category: "feedback_camara",
      council_member_name: "Erika Hilton",
    }),
    false,
  );
});

Deno.test("isUrbanNonComplaintReadyForLlmTurn: dúvida sobre a Câmara (feedback_camara) permanece conversacional", () => {
  // Dúvida é pergunta a ser respondida, não feedback a registrar — mesmo com category feedback_camara.
  assertEquals(
    isUrbanNonComplaintReadyForLlmTurn({
      report_nature: "duvida",
      description: "Como funciona o processo legislativo na Câmara?",
      category: "feedback_camara",
    }),
    true,
  );
});

Deno.test("isUrbanDuvidaReadyForAnswer: descrição + categoria", () => {
  assertEquals(
    isUrbanDuvidaReadyForAnswer({
      report_nature: "duvida",
      description: "Quero saber sobre os serviços disponíveis na cidade de SP",
      category: "outro",
    }),
    true,
  );
  assertEquals(
    isUrbanDuvidaReadyForAnswer({
      report_nature: "reclamacao",
      description: "Buraco na rua",
      category: "via_publica",
    }),
    false,
  );
});

Deno.test("isValidUrbanReportDescription: duvida aceita 'quero saber sobre serviços'", () => {
  assertEquals(
    isValidUrbanReportDescription(
      "Quero saber sobre os serviços disponíveis na cidade de SP",
      "duvida",
    ),
    true,
  );
  assertEquals(isSubstantiveUrbanNatureDescription("Quero saber sobre os serviços disponíveis na cidade de SP"), true);
});

Deno.test("applyUrbanNatureCategoryDefaults: duvida sobre câmara → feedback_camara", () => {
  const fields: Record<string, unknown> = {
    report_nature: "duvida",
    description: "Me fale sobre a infraestrutura da câmara",
  };
  applyUrbanNatureCategoryDefaults(fields, generateLabelFromDescription);
  assertEquals(fields.category, "feedback_camara");
  assertEquals(typeof fields.subcategory, "string");
});

Deno.test("getNextMissingField: duvida com descrição válida não pede menu de tema de reclamação", async () => {
  const accumulated: Record<string, unknown> = {
    report_nature: "duvida",
    description: "Quero saber sobre os serviços disponíveis na cidade de SP",
  };
  const result = await getNextMissingField(
    "urban_report",
    accumulated,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      URBAN_REPORT_NATURE_VALUES,
      isGenericIntentText,
      isBareUrbanReportNatureReply,
      isValidUrbanReportDescription,
      isValidDomainDescription: () => true,
      applyUrbanNatureCategoryDefaults,
      urbanNatureSkipsLocationCollection,
      generateLabelFromDescription,
      isCitySaoPaulo: () => true,
      autoClassifyCategory: () => ({ category: null, confidence: 0 }),
      getClassificationFromFeedback: async () => null,
      // deno-lint-ignore no-explicit-any
    } as any,
  );

  assertEquals(accumulated.category, "outro");
  assertEquals(result.field, null);
  assertEquals(result.prompt, null);
  assertEquals(result.picker, null);
});

Deno.test("getNextMissingField: sugestao com descrição válida não pede localização", async () => {
  const accumulated: Record<string, unknown> = {
    report_nature: "sugestao",
    description: "Seria bom se tivéssemos mais policiamento nos parques",
  };
  const result = await getNextMissingField(
    "urban_report",
    accumulated,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      URBAN_REPORT_NATURE_VALUES,
      isGenericIntentText,
      isBareUrbanReportNatureReply,
      isValidUrbanReportDescription,
      isValidDomainDescription: () => true,
      applyUrbanNatureCategoryDefaults,
      urbanNatureSkipsLocationCollection,
      generateLabelFromDescription,
      isCitySaoPaulo: () => true,
      autoClassifyCategory: () => ({ category: null, confidence: 0 }),
      getClassificationFromFeedback: async () => null,
      // deno-lint-ignore no-explicit-any
    } as any,
  );

  assertEquals(accumulated.category, "outro");
  assertEquals(result.field, null);
  assertEquals((result.prompt ?? "").includes("problema"), false);
});

Deno.test("getNextMissingField: elogio com descrição válida não pede localização", async () => {
  const accumulated: Record<string, unknown> = {
    report_nature: "elogio",
    description:
      "Gostaria de elogiar o policiamento e segurança na cidade de SP, sabemos que ainda há muito a melhorar, porém está evoluindo muito bem!",
  };
  const result = await getNextMissingField(
    "urban_report",
    accumulated,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    // deno-lint-ignore no-explicit-any
    mockSupabase as any,
    "user-1",
    {
      URBAN_REPORT_NATURE_VALUES,
      isGenericIntentText,
      isBareUrbanReportNatureReply,
      isValidUrbanReportDescription,
      isValidDomainDescription: () => true,
      applyUrbanNatureCategoryDefaults,
      urbanNatureSkipsLocationCollection,
      generateLabelFromDescription,
      isCitySaoPaulo: () => true,
      autoClassifyCategory: () => ({ category: null, confidence: 0 }),
      getClassificationFromFeedback: async () => null,
      // deno-lint-ignore no-explicit-any
    } as any,
  );

  assertEquals(accumulated.category, "outro");
  assertEquals(result.field, null);
  assertEquals((result.prompt ?? "").includes("problema"), false);
});

Deno.test("buildUrbanNonComplaintLlmInstruction: dúvida proíbe dump institucional", () => {
  const instruction = buildUrbanNonComplaintLlmInstruction({
    report_nature: "duvida",
    description:
      "Gostaria de saber como é feito o planejamento para o policiamento em eventos na cidade de São Paulo",
  });
  assertEquals(instruction.includes("MODO DÚVIDA URBANA"), true);
  assertEquals(instruction.includes("RESPONDA PRIMEIRO E DIRETAMENTE"), true);
  assertEquals(instruction.includes("PROIBIDO"), true);
  assertEquals(instruction.includes("Portal da Câmara"), true);
});
