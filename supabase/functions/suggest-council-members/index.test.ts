import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { calculateMatchScore } from "./index.ts";

Deno.test("suggest-council-members: Cálculo de score - Match por Partido e Tema", () => {
  const vereador = {
    id: "v1",
    name: "Vereador Saúde",
    party: "PT" // Temas: saude, educacao, habitacao, assistencia_social, direitos_humanos
  };
  
  const report = {
    category: "ubs", // Tema: saude
    report_type: "service"
  };
  
  const { score, reasons } = calculateMatchScore(vereador, report);
  
  // 15 pontos por match de tema (saude) + 15 pontos por tipo de relato (service/saude)
  assertEquals(score >= 30, true);
  assertEquals(reasons.some(r => r.includes("Partido atua em: saude")), true);
  assertEquals(reasons.some(r => r.includes("Especialista em serviços públicos")), true);
});

Deno.test("suggest-council-members: Cálculo de score - Match por Descrição", () => {
  const vereador = {
    id: "v2",
    name: "Vereador Transporte",
    party: "PL" // Temas: seguranca, transporte, economia, saude
  };
  
  const report = {
    description: "problemas com transporte e onibus",
    report_type: "transport"
  };
  
  const { score, reasons } = calculateMatchScore(vereador, report);
  
  // 15 pontos por tipo de relato (transport) + 10 pontos por palavra-chave (onibus/atraso)
  assertEquals(score >= 25, true);
  assertEquals(reasons.some(r => r.includes("Palavras-chave coincidem")), true);
});

Deno.test("suggest-council-members: Cálculo de score - Bônus Oposição e Severidade", () => {
  const vereador = {
    id: "v3",
    name: "Vereador Oposição",
    party: "PSOL", // Oposição
    isLeader: true
  };
  
  const report = {
    category: "educacao",
    severity: "critica",
    report_type: "service"
  };
  
  const { score, reasons } = calculateMatchScore(vereador, report);
  
  // 10 pontos Líder + 10 pontos Bônus Oposição/Severidade + Matches de temas
  assertEquals(reasons.some(r => r.includes("Fiscalização ativa em questões críticas")), true);
  assertEquals(reasons.some(r => r.includes("Líder de partido")), true);
  assertEquals(score > 20, true);
});

Deno.test("suggest-council-members: Score mínimo", () => {
  const vereador = {
    id: "v4",
    name: "Vereador Genérico",
    party: "MDB"
  };
  
  const report = {
    category: "desconhecida",
    description: "nada com nada"
  };
  
  const { score, reasons } = calculateMatchScore(vereador, report);
  
  assertEquals(score, 5);
  assertEquals(reasons.includes("Vereador ativo na Câmara"), true);
});
