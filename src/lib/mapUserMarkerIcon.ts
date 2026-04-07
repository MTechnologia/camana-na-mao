/**
 * Marcador "Você está aqui" no Google Maps: pin azul com silhueta de pessoa.
 * Mesma paleta da legenda (evita divergência com `bg-primary` do tema).
 */
export const USER_LOCATION_MARKER_BLUE = "#2563eb";

const W = 48;
const H = 56;

/** URL data:image para `google.maps.Marker` `icon.url` */
export function getUserLocationMarkerIconDataUrl(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Sua localização">
  <defs>
    <filter id="userPinShadow" x="-35%" y="-35%" width="170%" height="170%">
      <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#000000" flood-opacity="0.3"/>
    </filter>
  </defs>
  <path filter="url(#userPinShadow)"
    d="M24 3.5C15.99 3.5 10 9.15 10 16.25c0 5.65 5.22 14.35 12.65 24.45a1.35 1.35 0 0 0 2.28.05C32.86 30.2 38 21.55 38 16.25 38 9.15 32.01 3.5 24 3.5z"
    fill="${USER_LOCATION_MARKER_BLUE}"
    stroke="#ffffff"
    stroke-width="2.25"
    stroke-linejoin="round"/>
  <circle cx="24" cy="17" r="5.25" fill="#ffffff"/>
  <path d="M15.5 33.5c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5" fill="none" stroke="#ffffff" stroke-width="2.25" stroke-linecap="round"/>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/** Tamanho e âncora (ponta do pin) para Google Maps */
export const USER_LOCATION_MARKER_LAYOUT = {
  width: W,
  height: H,
  anchorX: 24,
  anchorY: H - 2,
} as const;
