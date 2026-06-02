import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { TrendCategoryLineChart } from "./TrendCategoryLineChart";

describe("TrendCategoryLineChart", () => {
  it("renders Recharts line paths for multiple series", () => {
    const data = [
      { bucket: "2026-01-01T00:00:00.000Z", bucketLabel: "01/01", alpha: 2, beta: 1 },
      { bucket: "2026-01-02T00:00:00.000Z", bucketLabel: "02/01", alpha: 0, beta: 4 },
    ];
    const { container } = render(
      <div style={{ width: 480, height: 320 }}>
        <TrendCategoryLineChart data={data} categoryKeys={["alpha", "beta"]} />
      </div>,
    );
    const lines = container.querySelectorAll(".recharts-line-curve");
    expect(lines.length).toBe(2);
  });

  it("shows empty state when there is no data", () => {
    const { getByText } = render(
      <TrendCategoryLineChart data={[]} categoryKeys={[]} emptyMessage="Nada aqui" />,
    );
    expect(getByText("Nada aqui")).toBeTruthy();
  });
});
