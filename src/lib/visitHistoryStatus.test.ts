import { describe, expect, it } from "vitest";
import { getVisitHistoryUiStatus } from "./visitHistoryStatus";

describe("getVisitHistoryUiStatus", () => {
  it("completed → evaluated", () => {
    expect(
      getVisitHistoryUiStatus({
        status: "completed",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400_000).toISOString(),
      }),
    ).toBe("evaluated");
  });

  it("pending dentro de 48h e antes de expires_at → open_for_rating", () => {
    const created = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    expect(
      getVisitHistoryUiStatus({
        status: "pending",
        created_at: created,
        expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
      }),
    ).toBe("open_for_rating");
  });

  it("pending há mais de 48h → expired", () => {
    const created = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
    expect(
      getVisitHistoryUiStatus({
        status: "pending",
        created_at: created,
        expires_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
      }),
    ).toBe("expired");
  });

  it("pending com expires_at passado → expired", () => {
    expect(
      getVisitHistoryUiStatus({
        status: "pending",
        created_at: new Date(Date.now() - 86400_000).toISOString(),
        expires_at: new Date(Date.now() - 1000).toISOString(),
      }),
    ).toBe("expired");
  });

  it("skipped → skipped", () => {
    expect(
      getVisitHistoryUiStatus({
        status: "skipped",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400_000).toISOString(),
      }),
    ).toBe("skipped");
  });

  it("expired (enum) → expired", () => {
    expect(
      getVisitHistoryUiStatus({
        status: "expired",
        created_at: new Date().toISOString(),
        expires_at: new Date().toISOString(),
      }),
    ).toBe("expired");
  });
});
