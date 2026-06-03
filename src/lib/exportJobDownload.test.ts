import { describe, expect, it } from "vitest";
import { exportDownloadPath } from "@/lib/exportJobDownload";

describe("exportDownloadPath", () => {
  it("monta rota de exportações com jobId", () => {
    expect(exportDownloadPath("abc-123")).toBe("/admin/exports?jobId=abc-123");
  });
});
