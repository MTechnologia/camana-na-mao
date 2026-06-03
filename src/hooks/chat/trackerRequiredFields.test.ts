import { describe, expect, it } from "vitest";
import {
  getMissingRequiredFields,
  isTrackerCollectionComplete,
} from "@/hooks/chat/trackerRequiredFields";

describe("trackerRequiredFields", () => {
  it("urban_report exige natureza e endereço", () => {
    const missing = getMissingRequiredFields("urban_report", {
      category: "lixo",
      description: "teste",
    });
    expect(missing).toContain("report_nature");
    expect(missing).toContain("street");
    expect(missing).toContain("neighborhood");
  });

  it("service_rating completo quando campos obrigatórios preenchidos", () => {
    const fields = {
      service_type: "ubs",
      service_name: "UBS X",
      service_address_confirmed: true,
      rating_stars: 4,
      wait_time_score: 3,
      rating_text: "Bom atendimento",
    };
    expect(isTrackerCollectionComplete("service_rating", fields)).toBe(true);
  });
});
