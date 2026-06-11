import { describe, expect, it } from "vitest";
import { formatAuthErrorForUser, translateAuthError } from "./authErrorMessages";

describe("authErrorMessages", () => {
  it("traduz senha igual à atual (mensagem Supabase)", () => {
    expect(translateAuthError("New password should be different from the old password.")).toBe(
      "A nova senha deve ser diferente da senha atual.",
    );
  });

  it("traduz pelo código same_password", () => {
    expect(formatAuthErrorForUser({ code: "same_password", message: "x" })).toBe(
      "A nova senha deve ser diferente da senha atual.",
    );
  });

  it("traduz timeout de login (AUTH_SIGNIN_TIMEOUT) para mensagem amigável, não o código cru", () => {
    const msg = formatAuthErrorForUser(new Error("AUTH_SIGNIN_TIMEOUT"));
    expect(msg).not.toContain("AUTH_SIGNIN_TIMEOUT");
    expect(msg).toMatch(/conex[aã]o est[aá] lenta|tente novamente/i);
  });

  it("traduz timeout de logout (AUTH_SIGNOUT_TIMEOUT) para mensagem amigável", () => {
    const msg = formatAuthErrorForUser(new Error("AUTH_SIGNOUT_TIMEOUT"));
    expect(msg).not.toContain("AUTH_SIGNOUT_TIMEOUT");
    expect(msg).toMatch(/tente novamente/i);
  });
});
