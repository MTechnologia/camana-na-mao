/**
 * Zonas de São Paulo para filtro de audiências (em vez do endereço/local do auditório).
 * Mapeamento por bairro/subprefeitura e nomes de locais conhecidos.
 */

export const ZONAS_SAO_PAULO = [
  "Centro",
  "Zona Norte",
  "Zona Sul",
  "Zona Leste",
  "Zona Oeste",
] as const;

export type ZonaSP = (typeof ZONAS_SAO_PAULO)[number];

/** Palavras-chave no campo local que indicam cada zona (case insensitive). */
const ZONA_KEYWORDS: { zona: ZonaSP; keywords: string[] }[] = [
  {
    zona: "Zona Norte",
    keywords: [
      "tucuruvi", "jaçanã", "santana", "vila maria", "vila guilherme", "casa verde",
      "limão", "brasilândia", "freguesia do ó", "perus", "pirituba", "vila leopoldina",
    ],
  },
  {
    zona: "Zona Sul",
    keywords: [
      "ipiranga", "jabaquara", "santo amaro", "são paulo - distrital ipiranga",
      "cidade ademar", "socorro", "cursino", "saúde", "vila mariana", "campo belo",
    ],
  },
  {
    zona: "Zona Leste",
    keywords: [
      "mooca", "tatuapé", "vila carmosina", "vila formosa", "penha", "cangaíba",
      "jardim santa helena", "são mateus", "itaquera", "guaianases", "vila prudente",
      "são paulo - distrital mooca", "eletropaulo", "arena corinthians",
    ],
  },
  {
    zona: "Zona Oeste",
    keywords: [
      "lapa", "pinheiros", "butantã", "jaguaré", "rio pequeno", "raposo tavares",
      "vila sônia", "morumbi", "barra funda",
    ],
  },
  {
    zona: "Centro",
    keywords: [
      "sé", "república", "bela vista", "bom retiro", "cambuci", "consolação",
      "liberdade", "santa cecília", "prestes maia", "auditório", "câmara municipal",
      "distrital centro", "centro", "vila buarque", "aclimação", "higienópolis",
    ],
  },
];

/**
 * Retorna a zona de São Paulo para um texto de local (endereço/nome do auditório).
 * Usado no filtro por região para exibir zonas em vez de endereços.
 */
export function localParaZona(local: string | null | undefined): ZonaSP {
  const text = (local || "").toLowerCase().trim();
  if (!text) return "Centro";

  for (const { zona, keywords } of ZONA_KEYWORDS) {
    if (keywords.some((k) => text.includes(k))) return zona;
  }

  return "Centro";
}
