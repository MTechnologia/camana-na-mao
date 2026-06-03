/// <reference lib="deno.ns" />
import { applyTransportCollectionDefaults } from "./lib-transport-quick-mode.ts";

Deno.test("applyTransportCollectionDefaults preenche campos secundários", () => {
  const fields: Record<string, unknown> = { line_code: "123" };
  applyTransportCollectionDefaults(fields);
  if (fields.direction !== "ida") throw new Error("direction");
  if (fields.recurrence_frequency !== "primeira_vez") throw new Error("recurrence");
  if (fields.personal_impact !== 3) throw new Error("impact");
});
