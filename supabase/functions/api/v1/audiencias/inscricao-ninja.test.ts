/**
 * Testes para o serviço de inscrição Ninja Forms (CMSP).
 * Executar: deno test --allow-net=false supabase/functions/api/v1/audiencias/inscricao-ninja.test.ts
 */

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import {
  extractNinjaSecurity,
  submitNinjaForm,
  type NinjaInscricaoInput,
} from "./inscricao-ninja.ts";

Deno.test("extractNinjaSecurity: extrai ajaxNonce (padrão CMSP)", () => {
  const html = `var nfFrontEnd = {"adminAjax":"https://www.saopaulo.sp.leg.br/audienciaspublicas/wp-admin/admin-ajax.php","ajaxNonce":"5056748f6d","requireBaseUrl":"..."};`;
  const got = extractNinjaSecurity(html);
  assertEquals(got, "5056748f6d");
});

Deno.test("extractNinjaSecurity: extrai nonce de HTML com padrão security:\"...\"", () => {
  const html = `<script>var nfFrontEnd = { "security": "abc123def456" };</script>`;
  const got = extractNinjaSecurity(html);
  assertEquals(got, "abc123def456");
});

Deno.test("extractNinjaSecurity: extrai nonce de input hidden", () => {
  const html = `<form><input name="security" value="xyz789nonce123" /></form>`;
  const got = extractNinjaSecurity(html);
  assertEquals(got, "xyz789nonce123");
});

Deno.test("extractNinjaSecurity: extrai nonce de value antes de name", () => {
  const html = `<input value="token9876543210" name="security" type="hidden">`;
  const got = extractNinjaSecurity(html);
  assertEquals(got, "token9876543210");
});

Deno.test("extractNinjaSecurity: retorna null para HTML vazio ou sem nonce", () => {
  assertEquals(extractNinjaSecurity(""), null);
  assertEquals(extractNinjaSecurity("<div>nada aqui</div>"), null);
  assertEquals(extractNinjaSecurity('{"other":"value"}'), null);
});

Deno.test("extractNinjaSecurity: retorna null para entrada inválida", () => {
  assertEquals(extractNinjaSecurity(null as unknown as string), null);
  assertEquals(extractNinjaSecurity(123 as unknown as string), null);
});

Deno.test("submitNinjaForm: monta POST e trata resposta de sucesso (mock)", async () => {
  let capturedUrl: string | null = null;
  let capturedInit: RequestInit | null = null;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    capturedInit = init ?? null;
    return new Response(
      JSON.stringify({
        actions: {
          save: { sub_id: "12345" },
          success_message: "<p>Inscrição realizada!</p>",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  };

  try {
    const input: NinjaInscricaoInput = {
      nome: "Fulano",
      email: "fulano@email.com",
      telefone: "(11) 99999-8888",
      apCode: "FIN02-26-02-2026",
      security: "mock-nonce-abc",
    };
    const result = await submitNinjaForm(input);

    assertEquals(result.ok, true);
    if (result.ok) {
      assertEquals(result.sub_id, "12345");
      assertExists(result.message);
    }

    assertExists(capturedUrl);
    assertEquals(capturedUrl.includes("admin-ajax.php"), true);
    assertExists(capturedInit);
    assertEquals(capturedInit.method, "POST");
    const headers = (capturedInit.headers as Headers) ?? new Map();
    const ct = headers.get?.("Content-Type") ?? (headers as Record<string, string>)["Content-Type"];
    assertEquals(ct?.includes("application/x-www-form-urlencoded"), true);
    assertEquals(headers.get?.("X-Requested-With") ?? (headers as Record<string, string>)["X-Requested-With"], "XMLHttpRequest");

    const body = capturedInit.body as string;
    assertExists(body);
    assertEquals(body.includes("nf_ajax_submit"), true);
    assertEquals(body.includes("mock-nonce-abc"), true);
    assertEquals(body.includes("formData="), true);
    const formDataEnc = body.split("formData=")[1]?.split("&")[0];
    assertExists(formDataEnc);
    const formData = JSON.parse(decodeURIComponent(formDataEnc));
    assertEquals(formData.form_id, 2);
    assertEquals(formData.fields["7"], "Fulano");
    assertEquals(formData.fields["9"], "fulano@email.com");
    assertEquals(formData.fields["10"], "(11) 99999-8888");
    assertEquals(formData.fields["19"], "FIN02-26-02-2026");
    assertEquals(formData.fields["94"], 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("submitNinjaForm: trata resposta com errors (mock)", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ errors: ["Este e-mail já está inscrito nesta audiência."] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  try {
    const result = await submitNinjaForm({
      nome: "A",
      email: "a@b.com",
      telefone: "11999998888",
      apCode: "X-01-01-2026",
      security: "n",
    });
    assertEquals(result.ok, false);
    if (!result.ok) {
      assertEquals(result.errors.length >= 1, true);
      assertEquals(
        result.errors.some((e) => e.includes("já está inscrito") || e.includes("já inscrito") || e.includes("já está inscrito")),
        true
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("submitNinjaForm: retorna erro quando HTTP != 200 (mock)", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("Server Error", { status: 502 });

  try {
    const result = await submitNinjaForm({
      nome: "A",
      email: "a@b.com",
      telefone: "11999998888",
      apCode: "X",
      security: "n",
    });
    assertEquals(result.ok, false);
    if (!result.ok) assertEquals(result.errors.some((e) => e.includes("502") || e.includes("integração")), true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
