import { describe, expect, it } from "vitest";
import { heatmapLayerErrorMessage } from "@/lib/googleMapsHeatmapLayer";
import { googleMapsScriptUrl, isGoogleMapsScript } from "@/lib/googleMapsLoader";

describe("googleMapsHeatmapLayer", () => {
  it("mensagem amigável para falhas WebGL/deck", () => {
    expect(heatmapLayerErrorMessage(new Error("WebGL context lost"))).toContain("WebGL");
  });
});

describe("googleMapsLoader", () => {
  it("monta URL sem biblioteca visualization", () => {
    const url = googleMapsScriptUrl("test-key", "__cb");
    expect(url).toContain("maps.googleapis.com/maps/api/js");
    expect(url).not.toContain("visualization");
    expect(url).toContain("loading=async");
  });

  it("detecta script do Google Maps", () => {
    expect(isGoogleMapsScript("https://maps.googleapis.com/maps/api/js?key=x")).toBe(true);
    expect(isGoogleMapsScript("https://example.com/maps.js")).toBe(false);
  });
});
