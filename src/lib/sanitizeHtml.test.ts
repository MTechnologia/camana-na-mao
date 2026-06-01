import { describe, expect, it } from "vitest";
import { sanitizeRestrictedHtml, sanitizeRichHtml } from "./sanitizeHtml";

describe("sanitizeHtml", () => {
  it("remove <script> e handlers de evento (rich)", () => {
    const out = sanitizeRichHtml(
      '<p>oi</p><script>alert(1)</script><img src=x onerror="alert(1)">',
    );
    expect(out).not.toContain("<script");
    expect(out.toLowerCase()).not.toContain("onerror");
    expect(out).toContain("<p>oi</p>");
  });

  it("mantém formatação básica e remove o resto (restricted)", () => {
    const out = sanitizeRestrictedHtml(
      '<strong>ok</strong><p>p</p><br><a href="x">link</a><script>x</script>',
    );
    expect(out).toContain("<strong>ok</strong>");
    expect(out).toContain("<br");
    expect(out).not.toContain("<a");
    expect(out).not.toContain("<script");
  });

  it("lida com null/undefined", () => {
    expect(sanitizeRichHtml(null)).toBe("");
    expect(sanitizeRestrictedHtml(undefined)).toBe("");
  });
});
