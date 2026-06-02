/**
 * URL do script Maps JS API (versão atual; calor via deck.gl, não visualization).
 */
export function googleMapsScriptUrl(apiKey: string, callbackName: string): string {
  const params = new URLSearchParams({
    key: apiKey,
    loading: "async",
    callback: callbackName,
  });
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
}

export function isGoogleMapsScript(src: string | null | undefined): boolean {
  return !!src?.includes("maps.googleapis.com/maps/api/js");
}
