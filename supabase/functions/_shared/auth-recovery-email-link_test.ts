import {
  buildRecoveryEmailActionUrl,
  buildSupabaseVerifyUrl,
  resolvePasswordRecoveryRedirectBase,
} from "./auth-recovery-email-link.ts";
import { assertEquals, assertThrows } from "https://deno.land/std@0.224.0/assert/mod.ts";

Deno.test("resolvePasswordRecoveryRedirectBase prioriza redirect_to", () => {
  const base = resolvePasswordRecoveryRedirectBase({
    redirect_to: "https://app.example.com/outro-caminho?x=1",
    site_url: "https://legacy.example.com",
    app_public_url: "https://fallback.example.com",
  });
  assertEquals(base, "https://app.example.com/nova-senha");
});

Deno.test("buildRecoveryEmailActionUrl gera um único link no app", () => {
  const url = buildRecoveryEmailActionUrl({
    token_hash: "abc123hash",
    redirect_to: "https://camara.example.com/nova-senha",
  });
  const parsed = new URL(url);
  assertEquals(parsed.origin, "https://camara.example.com");
  assertEquals(parsed.pathname, "/nova-senha");
  assertEquals(parsed.searchParams.get("token_hash"), "abc123hash");
  assertEquals(parsed.searchParams.get("type"), "recovery");
});

Deno.test("buildSupabaseVerifyUrl mantém formato verify para signup", () => {
  const url = buildSupabaseVerifyUrl({
    supabase_url: "https://proj.supabase.co",
    token_hash: "hash",
    email_action_type: "signup",
    redirect_to: "https://app.example.com/login",
  });
  assertEquals(
    url,
    "https://proj.supabase.co/auth/v1/verify?token=hash&type=signup&redirect_to=https%3A%2F%2Fapp.example.com%2Flogin",
  );
});

Deno.test("buildRecoveryEmailActionUrl exige token_hash", () => {
  assertThrows(
    () =>
      buildRecoveryEmailActionUrl({
        token_hash: "",
        redirect_to: "https://app.example.com/nova-senha",
      }),
    Error,
    "token_hash is required",
  );
});
