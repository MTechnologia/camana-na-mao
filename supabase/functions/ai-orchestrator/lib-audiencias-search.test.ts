import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { formatAudienciaStatus, localParaZona } from "./lib-audiencias-search.ts";

Deno.test("localParaZona: classifica locais conhecidos por zona", () => {
  assertEquals(localParaZona("Auditório da Câmara Municipal"), "Centro");
  assertEquals(localParaZona("Subprefeitura de Pinheiros"), "Zona Oeste");
  assertEquals(localParaZona("Terminal Santana"), "Zona Norte");
});

Deno.test("formatAudienciaStatus: cobre agendada, em andamento e encerrada", () => {
  assertEquals(formatAudienciaStatus("agendada"), "📅 Agendada");
  assertEquals(formatAudienciaStatus("scheduled"), "📅 Agendada");
  assertEquals(formatAudienciaStatus("ongoing"), "🔴 Em andamento");
  assertEquals(formatAudienciaStatus("encerrada"), "✅ Encerrada");
});
