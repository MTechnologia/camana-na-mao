import { describe, expect, it } from "vitest";
import { parseEdgeFunctionError } from "./edgeFunctionError";

describe("parseEdgeFunctionError", () => {
  it("usa campo error do data quando presente", async () => {
    const msg = await parseEdgeFunctionError(
      new Error("Edge Function returned a non-2xx status code"),
      { error: "Este e-mail já tem cadastro no sistema." },
    );
    expect(msg).toBe("Este e-mail já tem cadastro no sistema.");
  });

  it("lê JSON do context da Response", async () => {
    const response = new Response(
      JSON.stringify({ error: "Forbidden: requires users.invite" }),
      { status: 403 },
    );
    const msg = await parseEdgeFunctionError(
      { context: response },
      null,
    );
    expect(msg).toBe("Forbidden: requires users.invite");
  });
});
