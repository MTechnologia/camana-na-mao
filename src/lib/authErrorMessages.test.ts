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
});
