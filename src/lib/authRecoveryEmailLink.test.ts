import { describe, expect, it } from "vitest";
import { buildRecoveryEmailActionUrl, resolvePasswordRecoveryRedirectBase } from "./authRecoveryEmailLink";

describe("authRecoveryEmailLink", () => {
  it("normaliza redirect_to para /nova-senha", () => {
    expect(
      resolvePasswordRecoveryRedirectBase({
        redirect_to: "https://camara-na-mao.example.run.app/qualquer",
        site_url: "https://outro.example.com",
      }),
    ).toBe("https://camara-na-mao.example.run.app/nova-senha");
  });

  it("monta link único com token_hash e type=recovery", () => {
    const link = buildRecoveryEmailActionUrl({
      token_hash: "th_abc",
      redirect_to: "https://app-mtechnologia.com/nova-senha",
    });
    const url = new URL(link);
    expect(url.pathname).toBe("/nova-senha");
    expect(url.searchParams.get("token_hash")).toBe("th_abc");
    expect(url.searchParams.get("type")).toBe("recovery");
    expect(link).not.toContain("supabase.co/auth/v1/verify");
  });
});
