import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  detectVereadorContactQuery,
  formatVereadorContactReply,
  matchVereador,
  type VereadorRecord,
} from "./lib-vereador-contact-query.ts";

const LISTA: VereadorRecord[] = [
  { name: "Erika Hilton", party: "PSOL", phone: "(11) 3396-4321", email: "erika@cmsp.sp.gov.br", sala: "1201", andar: "12" },
  { name: "Eduardo Suplicy", party: "PT", phone: "(11) 3396-4000" }, // sem e-mail/sala
  { name: "Milton Leite", party: "UNIÃO", phone: "(11) 3396-4100", email: "milton@cmsp.sp.gov.br" },
];

Deno.test("detectVereadorContactQuery: pega telefone/e-mail/gabinete de um vereador nomeado", () => {
  assertEquals(detectVereadorContactQuery("qual o telefone do vereador Eduardo Suplicy?")?.name, "Eduardo Suplicy");
  assertEquals(detectVereadorContactQuery("o e-mail da vereadora Erika Hilton")?.name, "Erika Hilton");
  assertEquals(detectVereadorContactQuery("qual o gabinete do vereador Milton Leite")?.name, "Milton Leite");
});

Deno.test("detectVereadorContactQuery: contato sem nome → name vazio (aponta canal oficial)", () => {
  const r = detectVereadorContactQuery("como faço pra ter o telefone de um vereador?");
  assertEquals(r?.name, "");
});

Deno.test("detectVereadorContactQuery: NÃO intercepta fluxo de feedback/encaminhamento", () => {
  assertEquals(detectVereadorContactQuery("quero dar um feedback sobre o vereador Milton Leite"), null);
  assertEquals(detectVereadorContactQuery("encaminhar meu relato para um vereador"), null);
  assertEquals(detectVereadorContactQuery("quero elogiar um vereador"), null);
});

Deno.test("detectVereadorContactQuery: ignora quando não há intenção de contato", () => {
  assertEquals(detectVereadorContactQuery("quem é o vereador Eduardo Suplicy?"), null);
  assertEquals(detectVereadorContactQuery("onde fica a UBS Vila Maria?"), null);
});

Deno.test("matchVereador: casa por nome completo, parcial e primeiro+último", () => {
  assertEquals(matchVereador("Eduardo Suplicy", LISTA)?.party, "PT");
  assertEquals(matchVereador("suplicy", LISTA)?.name, "Eduardo Suplicy");
  assertEquals(matchVereador("erika hilton", LISTA)?.name, "Erika Hilton");
  assertEquals(matchVereador("Fulano de Tal", LISTA), null);
});

Deno.test("formatVereadorContactReply: mostra só os campos REAIS e é honesto sobre os ausentes", () => {
  const completo = formatVereadorContactReply(LISTA[0]);
  assertEquals(completo.includes("(11) 3396-4321"), true);
  assertEquals(completo.includes("erika@cmsp.sp.gov.br"), true);
  assertEquals(completo.includes("sala 1201"), true);

  const parcial = formatVereadorContactReply(LISTA[1]); // só telefone
  assertEquals(parcial.includes("(11) 3396-4000"), true);
  // não inventa e-mail nem gabinete; sinaliza ausência + canal oficial
  assertEquals(parcial.includes("@"), false);
  assertEquals(parcial.includes("/institucional/vereadores"), true);
});
