import { describe, expect, it } from "vitest";
import { mapThresholdEventsToPatternAlerts } from "./patternThresholdEvents";

describe("mapThresholdEventsToPatternAlerts", () => {
  it("prioriza alertas críticos e preserva contagem", () => {
    const alerts = mapThresholdEventsToPatternAlerts([
      {
        id: "warning-1",
        line_id: null,
        pattern_type: "lotacao",
        alert_level: "warning",
        occurrence_count: 18,
        avg_severity: 2.6,
        average_severity: "high",
        description: "Muitos relatos de lotação.",
        window_start: "2026-04-01",
        window_end: "2026-04-30",
        created_at: "2026-04-30T12:00:00Z",
      },
      {
        id: "critical-1",
        line_id: null,
        pattern_type: "atraso_frequente",
        alert_level: "critical",
        occurrence_count: 25,
        avg_severity: 3.8,
        average_severity: "critical",
        description: "Atrasos recorrentes acima do threshold.",
        window_start: "2026-04-01",
        window_end: "2026-04-30",
        created_at: "2026-04-30T12:00:00Z",
      },
    ]);

    expect(alerts).toHaveLength(2);
    expect(alerts[0].id).toBe("critical-1");
    expect(alerts[0].severity).toBe("critical");
    expect(alerts[0].count).toBe(25);
    expect(alerts[1].id).toBe("warning-1");
  });

  it("gera fallback descritivo quando a descrição vier vazia", () => {
    const [alert] = mapThresholdEventsToPatternAlerts([
      {
        id: "time-1",
        line_id: null,
        pattern_type: "peak_hours",
        alert_level: "warning",
        occurrence_count: 7,
        avg_severity: 1.8,
        average_severity: "medium",
        description: null,
        window_start: "2026-04-01",
        window_end: "2026-04-30",
        created_at: "2026-04-30T12:00:00Z",
      },
    ]);

    expect(alert.type).toBe("time");
    expect(alert.description).toContain("peak hours");
  });
});
