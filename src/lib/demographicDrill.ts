/**
 * Rótulos e chaves canônicas para drill-down demográfico (alinhado ao RPC
 * get_reports_with_demographics: COALESCE(campo, 'not_informed')).
 */

export const NOT_INFORMED = "not_informed";

export const GENDER_LABELS: Record<string, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
  nao_binario: "Não-binário",
  outro: "Outro",
  prefiro_nao_dizer: "Prefiro não dizer",
  prefiro_nao_informar: "Prefiro não informar",
  prefer_not_to_say: "Prefere não dizer",
  [NOT_INFORMED]: "Não informado",
};

export const RACE_LABELS: Record<string, string> = {
  branca: "Branca",
  preta: "Preta",
  parda: "Parda",
  amarela: "Amarela",
  indigena: "Indígena",
  prefiro_nao_dizer: "Prefiro não dizer",
  prefiro_nao_informar: "Prefiro não informar",
  prefer_not_to_say: "Prefere não dizer",
  [NOT_INFORMED]: "Não informado",
};

export const SOCIAL_CLASS_LABELS: Record<string, string> = {
  A: "Classe A",
  B: "Classe B",
  AB: "Classe AB",
  C: "Classe C",
  D: "Classe D",
  E: "Classe E",
  prefiro_nao_informar: "Prefiro não informar",
  [NOT_INFORMED]: "Não informado",
};

export const AGE_GROUP_LABELS: Record<string, string> = {
  under_18: "< 18",
  "18_24": "18-24",
  "25_34": "25-34",
  "35_44": "35-44",
  "45_54": "45-54",
  "55_64": "55-64",
  "65_plus": "65+",
  [NOT_INFORMED]: "Não informado",
};

const LABEL_TO_KEY = (labels: Record<string, string>): Record<string, string> => {
  const reverse: Record<string, string> = {};
  for (const [key, label] of Object.entries(labels)) {
    reverse[label] = key;
    reverse[label.toLowerCase()] = key;
  }
  return reverse;
};

const GENDER_LABEL_TO_KEY = LABEL_TO_KEY(GENDER_LABELS);
const RACE_LABEL_TO_KEY = LABEL_TO_KEY(RACE_LABELS);
const SOCIAL_CLASS_LABEL_TO_KEY = LABEL_TO_KEY(SOCIAL_CLASS_LABELS);
const AGE_GROUP_LABEL_TO_KEY = LABEL_TO_KEY(AGE_GROUP_LABELS);

/** Valores equivalentes no banco para a mesma fatia do gráfico. */
const GENDER_ALIASES: Record<string, string[]> = {
  prefiro_nao_dizer: ["prefiro_nao_dizer", "prefiro_nao_informar", "prefer_not_to_say"],
  prefiro_nao_informar: ["prefiro_nao_dizer", "prefiro_nao_informar", "prefer_not_to_say"],
  prefer_not_to_say: ["prefiro_nao_dizer", "prefiro_nao_informar", "prefer_not_to_say"],
};

const RACE_ALIASES: Record<string, string[]> = {
  prefiro_nao_dizer: ["prefiro_nao_dizer", "prefiro_nao_informar", "prefer_not_to_say"],
  prefiro_nao_informar: ["prefiro_nao_dizer", "prefiro_nao_informar", "prefer_not_to_say"],
  prefer_not_to_say: ["prefiro_nao_dizer", "prefiro_nao_informar", "prefer_not_to_say"],
};

function resolveKey(
  value: string | undefined | null,
  labels: Record<string, string>,
  reverse: Record<string, string>,
): string {
  if (value == null || value === "") return NOT_INFORMED;
  const trimmed = String(value).trim();
  if (labels[trimmed]) return trimmed;
  if (reverse[trimmed]) return reverse[trimmed];
  const lower = trimmed.toLowerCase();
  if (labels[lower]) return lower;
  if (reverse[lower]) return reverse[lower];
  return trimmed;
}

export function resolveGenderKey(value: string | undefined | null): string {
  return resolveKey(value, GENDER_LABELS, GENDER_LABEL_TO_KEY);
}

export function resolveRaceKey(value: string | undefined | null): string {
  return resolveKey(value, RACE_LABELS, RACE_LABEL_TO_KEY);
}

export function resolveSocialClassKey(value: string | undefined | null): string {
  return resolveKey(value, SOCIAL_CLASS_LABELS, SOCIAL_CLASS_LABEL_TO_KEY);
}

export function resolveAgeGroupKey(value: string | undefined | null): string {
  return resolveKey(value, AGE_GROUP_LABELS, AGE_GROUP_LABEL_TO_KEY);
}

export function genderLabel(key: string): string {
  return GENDER_LABELS[key] ?? key;
}

export function raceLabel(key: string): string {
  return RACE_LABELS[key] ?? key;
}

export function socialClassLabel(key: string): string {
  return SOCIAL_CLASS_LABELS[key] ?? key;
}

export function ageGroupLabel(key: string): string {
  return AGE_GROUP_LABELS[key] ?? key;
}

export function genderDbValues(key: string): string[] {
  if (key === NOT_INFORMED) return [];
  return GENDER_ALIASES[key] ?? [key];
}

export function raceDbValues(key: string): string[] {
  if (key === NOT_INFORMED) return [];
  return RACE_ALIASES[key] ?? [key];
}

export function socialClassDbValues(key: string): string[] {
  if (key === NOT_INFORMED) return [];
  return [key];
}

export function ageFromBirthDate(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const bd = new Date(birthDate);
  if (Number.isNaN(bd.getTime())) return null;
  return Math.floor((Date.now() - bd.getTime()) / (365.25 * 24 * 3600 * 1000));
}

export function ageToGroup(age: number | null): string {
  if (age === null || Number.isNaN(age)) return NOT_INFORMED;
  if (age < 18) return "under_18";
  if (age <= 24) return "18_24";
  if (age <= 34) return "25_34";
  if (age <= 44) return "35_44";
  if (age <= 54) return "45_54";
  if (age <= 64) return "55_64";
  return "65_plus";
}
