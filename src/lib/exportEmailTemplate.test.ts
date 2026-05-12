import { describe, it, expect } from "vitest";
import { buildExportEmail } from "./exportEmailTemplate";

const BASE_INPUT = {
  recipientName: "Felipe de Melo Souza",
  scheduleName: "Relatos urbanos - semanal",
  dataset: "urban_reports" as const,
  format: "csv" as const,
  rowCount: 12345,
  signedUrl: "https://supabase.co/storage/v1/object/sign/export-files/abc?token=xyz",
  appUrl: "https://camana-na-mao.example.com",
  expiresInDays: 7,
  brasaoUrl: "https://camana-na-mao.example.com/brasao.png",
};

describe("buildExportEmail", () => {
  it("subject inclui o nome do agendamento", () => {
    const { subject } = buildExportEmail(BASE_INPUT);
    expect(subject).toContain('Relatos urbanos - semanal');
    expect(subject).toMatch(/Câmara na Mão/);
  });

  it("html contém o nome do destinatário e o link signed URL", () => {
    const { html } = buildExportEmail(BASE_INPUT);
    expect(html).toContain("Felipe de Melo Souza");
    expect(html).toContain(BASE_INPUT.signedUrl);
  });

  it("html mostra o número de linhas formatado em PT-BR", () => {
    const { html } = buildExportEmail(BASE_INPUT);
    expect(html).toContain("12.345");
  });

  it("html mostra rótulo de dataset humanizado", () => {
    const urban = buildExportEmail({ ...BASE_INPUT, dataset: "urban_reports" });
    expect(urban.html).toContain("Relatos urbanos");
    const transport = buildExportEmail({ ...BASE_INPUT, dataset: "transport_reports" });
    expect(transport.html).toContain("Relatos de transporte");
  });

  it("html mostra rótulo de formato (CSV/Excel)", () => {
    const csv = buildExportEmail({ ...BASE_INPUT, format: "csv" });
    expect(csv.html).toContain("CSV (.csv)");
    const xlsx = buildExportEmail({ ...BASE_INPUT, format: "xlsx" });
    expect(xlsx.html).toContain("Excel (.xlsx)");
  });

  it("html escapa caracteres HTML do nome do agendamento", () => {
    const { html, subject } = buildExportEmail({
      ...BASE_INPUT,
      scheduleName: '<script>alert("xss")</script>',
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    // Subject não é HTML-encoded (mas vai ser escapado pelo SendGrid), só
    // queremos garantir que está no string.
    expect(subject).toContain("<script>");
  });

  it("omite linhas quando rowCount é null", () => {
    const { html } = buildExportEmail({ ...BASE_INPUT, rowCount: null });
    expect(html).not.toContain("linhas exportadas");
  });

  it("inclui link para a página de agendamentos", () => {
    const { html } = buildExportEmail(BASE_INPUT);
    expect(html).toContain(`${BASE_INPUT.appUrl}/admin/configuracoes/agendamentos`);
  });

  it("omite brasão quando não fornecido", () => {
    const { html } = buildExportEmail({ ...BASE_INPUT, brasaoUrl: undefined });
    expect(html).not.toContain("brasao");
    expect(html).not.toContain('<img');
  });

  it("inclui a frase 'válido por N dias'", () => {
    const { html } = buildExportEmail({ ...BASE_INPUT, expiresInDays: 14 });
    expect(html).toContain("Link válido por 14 dias");
  });
});
