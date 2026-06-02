import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { validateNamedEquipmentInSaoPaulo } from "./lib-create-urban-report.ts";

// deno-lint-ignore no-explicit-any
const fakeSupabase = {} as any;

/** Cadastro de SP (public_services). Devolve um endereço só p/ equipamentos de SP. */
function makeRegistry(spNames: string[]) {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
  const set = new Set(spNames.map(norm));
  // deno-lint-ignore require-await
  return async (_s: unknown, name: string): Promise<string | null> => {
    return set.has(norm(name)) ? `${name}\n📍 Endereço em São Paulo` : null;
  };
}

Deno.test("validateNamedEquipmentInSaoPaulo: equipamento de outra cidade (Guarulhos) → bloqueia", async () => {
  const getByName = makeRegistry(["UBS Vila Madalena"]); // SP registry sem a de Guarulhos
  const msg = await validateNamedEquipmentInSaoPaulo(fakeSupabase, "UBS Rosa de França", getByName);
  assertEquals(typeof msg, "string");
  assertEquals(msg!.toLowerCase().includes("são paulo"), true);
});

Deno.test("validateNamedEquipmentInSaoPaulo: equipamento que EXISTE em SP → não bloqueia", async () => {
  const getByName = makeRegistry(["UBS Vila Madalena"]);
  const msg = await validateNamedEquipmentInSaoPaulo(fakeSupabase, "UBS Vila Madalena", getByName);
  assertEquals(msg, null);
});

Deno.test("validateNamedEquipmentInSaoPaulo: texto que não nomeia equipamento → não valida aqui", async () => {
  const getByName = makeRegistry([]);
  // Endereço genérico (sem palavra de equipamento) não é bloqueado por esta regra.
  assertEquals(await validateNamedEquipmentInSaoPaulo(fakeSupabase, "Rua das Flores, 123", getByName), null);
  // Descrição genérica mencionando "ubs" mas muito curta / sem nome → ainda exige keyword + tamanho.
  assertEquals(await validateNamedEquipmentInSaoPaulo(fakeSupabase, "ubs", getByName), null);
});

Deno.test("validateNamedEquipmentInSaoPaulo: escola de outra cidade → bloqueia", async () => {
  const getByName = makeRegistry(["EMEF João da Silva"]);
  const msg = await validateNamedEquipmentInSaoPaulo(
    fakeSupabase,
    "Escola Estadual Jardim Guarulhos",
    getByName,
  );
  assertEquals(typeof msg, "string");
});
