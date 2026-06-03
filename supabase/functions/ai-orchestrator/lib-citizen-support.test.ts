import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  extractUrbanDuvidaSearchTerms,
  getCitizenHistory,
  isCamaraFuncionamentoInternoQuery,
  isUrbanDuvidaKbResultRelevant,
} from "./lib-citizen-support.ts";

Deno.test("isCamaraFuncionamentoInternoQuery: reconhece perguntas institucionais da Câmara", () => {
  assertEquals(isCamaraFuncionamentoInternoQuery("Como funciona a Câmara Municipal de São Paulo?"), true);
  assertEquals(isCamaraFuncionamentoInternoQuery("Quais são as comissões permanentes da Câmara?"), true);
  assertEquals(isCamaraFuncionamentoInternoQuery("Onde encontro uma UBS perto de mim?"), false);
  assertEquals(
    isCamaraFuncionamentoInternoQuery(
      "Gostaria de saber como é feito o planejamento para o policiamento em eventos na cidade de São Paulo",
    ),
    false,
  );
});

Deno.test("extractUrbanDuvidaSearchTerms: foca termos da pergunta sem ruído", () => {
  const terms = extractUrbanDuvidaSearchTerms(
    "Gostaria de saber como é feito o planejamento para o policiamento em eventos na cidade de São Paulo",
  );
  assertEquals(terms.includes("planejamento"), true);
  assertEquals(terms.includes("policiamento"), true);
  assertEquals(terms.includes("eventos"), true);
  assertEquals(terms.includes("gostaria"), false);
  assertEquals(terms.includes("saber"), false);
});

Deno.test("isUrbanDuvidaKbResultRelevant: rejeita hits genéricos da Câmara", () => {
  const query =
    "Gostaria de saber como é feito o planejamento para o policiamento em eventos na cidade de São Paulo";
  const genericChamber = [
    { title: "Portal da Câmara Municipal de São Paulo", content: "Acesse o portal institucional." },
    { title: "Vereadores da Câmara", content: "Lista dos 55 vereadores." },
  ];
  assertEquals(isUrbanDuvidaKbResultRelevant(query, genericChamber), false);

  const onTopic = [
    {
      title: "Segurança em eventos",
      content: "O planejamento de policiamento em eventos envolve órgãos do Executivo.",
    },
  ];
  assertEquals(isUrbanDuvidaKbResultRelevant(query, onTopic), true);
});

Deno.test("getCitizenHistory: retorna mensagem vazia amigável sem registros", async () => {
  const supabase = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return this; },
        limit() { return Promise.resolve({ data: [], error: null }); },
      };
    },
  } as unknown;

  const result = await getCitizenHistory(
    supabase as Parameters<typeof getCitizenHistory>[0],
    "user-123",
  );

  assertEquals(result, "Você ainda não tem registros no sistema. Posso ajudar a fazer um relato ou avaliação?");
});
