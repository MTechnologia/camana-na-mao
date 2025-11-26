export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};

export const formatDuration = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}min` : `${hours}h`;
};

const maneuverTranslations: Record<string, string> = {
  "turn-right": "Vire à direita",
  "turn-left": "Vire à esquerda",
  "sharp-right": "Vire acentuadamente à direita",
  "sharp-left": "Vire acentuadamente à esquerda",
  "slight-right": "Mantenha-se à direita",
  "slight-left": "Mantenha-se à esquerda",
  "straight": "Siga em frente",
  "uturn": "Faça retorno",
  "arrive": "Você chegou ao destino",
  "depart": "Inicie o percurso",
  "ramp-right": "Entre à direita na rampa",
  "ramp-left": "Entre à esquerda na rampa",
  "merge": "Entre na via",
  "roundabout": "Entre na rotatória",
  "rotary": "Entre na rotatória",
  "exit-roundabout": "Saia da rotatória",
  "exit-rotary": "Saia da rotatória",
  "fork": "Bifurcação",
  "end-of-road": "Final da via",
  "continue": "Continue",
};

export const translateManeuver = (maneuver: string): string => {
  return maneuverTranslations[maneuver] || maneuver;
};

const maneuverIcons: Record<string, string> = {
  "turn-right": "↱",
  "turn-left": "↰",
  "sharp-right": "⤴",
  "sharp-left": "⤵",
  "slight-right": "↗",
  "slight-left": "↖",
  "straight": "↑",
  "uturn": "↩",
  "arrive": "📍",
  "depart": "🚶",
  "ramp-right": "↗",
  "ramp-left": "↖",
  "merge": "↗",
  "roundabout": "↻",
  "rotary": "↻",
  "exit-roundabout": "↗",
  "exit-rotary": "↗",
  "fork": "↗",
  "end-of-road": "↑",
  "continue": "↑",
};

export const getManeuverIcon = (maneuver: string): string => {
  return maneuverIcons[maneuver] || "↑";
};

export const buildGoogleMapsUrl = (
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number
): string => {
  return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=walking`;
};

export const buildWazeUrl = (destLat: number, destLng: number): string => {
  return `https://www.waze.com/ul?ll=${destLat},${destLng}&navigate=yes`;
};
