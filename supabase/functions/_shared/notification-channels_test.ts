import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { resolveChannelFlags } from "./notification-channels.ts";

Deno.test("sem settings: push ligado por compatibilidade, há canal externo", () => {
  const r = resolveChannelFlags(null);
  assertEquals(r.pushEnabled, true);
  assertEquals(r.emailEnabled, false);
  assertEquals(r.smsEnabled, false);
  assertEquals(r.anyExternalChannelEnabled, true);
  assertEquals(r.hasSettingsRow, false);
});

Deno.test("apenas push", () => {
  const r = resolveChannelFlags({
    push_enabled: true,
    email_enabled: false,
    sms_enabled: false,
  });
  assertEquals(r.pushEnabled, true);
  assertEquals(r.emailEnabled, false);
  assertEquals(r.smsEnabled, false);
  assertEquals(r.anyExternalChannelEnabled, true);
});

Deno.test("apenas e-mail", () => {
  const r = resolveChannelFlags({
    push_enabled: false,
    email_enabled: true,
    sms_enabled: false,
  });
  assertEquals(r.pushEnabled, false);
  assertEquals(r.emailEnabled, true);
  assertEquals(r.anyExternalChannelEnabled, true);
});

Deno.test("push e e-mail habilitados", () => {
  const r = resolveChannelFlags({
    push_enabled: true,
    email_enabled: true,
    sms_enabled: false,
  });
  assertEquals(r.anyExternalChannelEnabled, true);
  assertEquals(r.pushEnabled, true);
  assertEquals(r.emailEnabled, true);
});

Deno.test("nenhum canal habilitado → sem envio externo", () => {
  const r = resolveChannelFlags({
    push_enabled: false,
    email_enabled: false,
    sms_enabled: false,
  });
  assertEquals(r.anyExternalChannelEnabled, false);
});
