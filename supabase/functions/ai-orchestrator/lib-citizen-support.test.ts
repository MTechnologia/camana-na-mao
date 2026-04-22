import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { getCitizenHistory, isCamaraFuncionamentoInternoQuery } from "./lib-citizen-support.ts";

Deno.test("isCamaraFuncionamentoInternoQuery: reconhece perguntas institucionais da Câmara", () => {
  assertEquals(isCamaraFuncionamentoInternoQuery("Como funciona a Câmara Municipal de São Paulo?"), true);
  assertEquals(isCamaraFuncionamentoInternoQuery("Quais são as comissões permanentes da Câmara?"), true);
  assertEquals(isCamaraFuncionamentoInternoQuery("Onde encontro uma UBS perto de mim?"), false);
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
