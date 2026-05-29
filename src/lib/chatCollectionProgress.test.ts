import { describe, expect, it } from "vitest";
import { extractCollectionProgressJsonObjects, parseLatestCollectionProgressFields } from "./chatCollectionProgress";

describe("extractCollectionProgressJsonObjects", () => {
  it("extrai JSON com colchetes dentro de string", () => {
    const text =
      'prefix [COLLECTION_PROGRESS:urban_report:{"description":"ver [RATING_DIMENSIONS:foo]","category":"lixo"}] suffix';
    const chunks = extractCollectionProgressJsonObjects(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].type).toBe("urban_report");
    const data = JSON.parse(chunks[0].jsonStr);
    expect(data.description).toContain("[RATING");
    expect(data.category).toBe("lixo");
  });

  it("preserva colchetes dentro de string no JSON", () => {
    const text =
      '[COLLECTION_PROGRESS:transport_report:{"line_code":"123","notes":"a] b"}]';
    const chunks = extractCollectionProgressJsonObjects(text);
    expect(chunks).toHaveLength(1);
    expect(JSON.parse(chunks[0].jsonStr).notes).toBe("a] b");
  });
});

describe("parseLatestCollectionProgressFields", () => {
  it("retorna o último bloco quando há vários", () => {
    const text =
      '[COLLECTION_PROGRESS:urban_report:{"category":"lixo"}] ok [COLLECTION_PROGRESS:urban_report:{"category":"esgoto","street":"Rua A"}]';
    const latest = parseLatestCollectionProgressFields(text);
    expect(latest?.fields.street).toBe("Rua A");
  });
});
