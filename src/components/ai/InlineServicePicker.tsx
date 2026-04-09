import { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Building2, Search, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { normalizeServiceTypeToDbEnum } from "@/lib/publicServiceType";
import { getSaoPauloServiceRatingDayUtcBounds } from "@/lib/serviceRatingDayBounds";

interface PublicService {
  id: string;
  name: string;
  service_type: string;
  district: string;
  address: string;
}

interface InlineServicePickerProps {
  serviceType?: string;
  /** Quando informado com serviceType, pre-carrega lista de serviços do bairro (dropdown) */
  district?: string;
  /** Fluxo de avaliação: oculta equipamentos que o usuário já avaliou hoje (RN-AVA-003). */
  hideRatedToday?: boolean;
  onSelect: (name: string, neighborhood: string, address: string, serviceId?: string) => void;
}

/** Remove caracteres que quebram o filtro `.or()` do PostgREST e padrões ILIKE acidentais */
function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/%/g, "").replace(/,/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Cadastro GeoSampa costuma vir sem acento (ex.: BUTANTA) e o usuário digita "Butantã".
 * O PostgreSQL ILIKE não ignora acentos — precisamos buscar também sem diacríticos.
 */
function foldAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Cadastro pode usar "Brazil" / "Brasil" — normaliza para tentativa extra */
function normalizeBrazilSpellings(term: string): string[] {
  const t = term.trim();
  if (!t) return [];
  const out = new Set<string>([t]);
  if (/\bbrazil\b/i.test(t)) out.add(t.replace(/\bbrazil\b/gi, "Brasil"));
  if (/\bbrasil\b/i.test(t)) out.add(t.replace(/\bbrasil\b/gi, "Brazil"));
  return [...out];
}

/** Palavras com 3+ letras (ex.: "Vital") para busca quando o ILIKE composto não retorna */
function distinctiveTokens(term: string): string[] {
  return term
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-ZÀ-ÿ0-9]/g, ""))
    .filter((w) => w.length >= 3)
    .sort((a, b) => b.length - a.length);
}

async function fetchRatedServiceIdsToday(uid: string): Promise<Set<string>> {
  const { startIso, endExclusiveIso } = getSaoPauloServiceRatingDayUtcBounds();
  const { data, error } = await supabase
    .from("service_ratings")
    .select("service_id")
    .eq("user_id", uid)
    .gte("created_at", startIso)
    .lt("created_at", endExclusiveIso);
  if (error || !data?.length) return new Set();
  return new Set(data.map((r) => r.service_id).filter((id): id is string => Boolean(id)));
}

function normCompare(s: string): string {
  return foldAccents(s).toLowerCase().replace(/\s+/g, " ").trim();
}

/** Compara texto livre com nome cadastrado (só usado contra serviços já avaliados hoje). */
function freeTextLikelySameService(userText: string, officialName: string): boolean {
  const a = normCompare(userText);
  const b = normCompare(officialName);
  if (a.length < 4 || b.length < 4) return false;
  if (a.length >= 10 && b.includes(a)) return true;
  if (b.length >= 10 && a.includes(b)) return true;
  const tokens = userText
    .split(/\s+/)
    .map((w) => normCompare(w))
    .filter((w) => w.length >= 3);
  if (tokens.length >= 2 && tokens.every((t) => b.includes(t))) return true;
  return false;
}

/**
 * Bloqueia o atalho "Usar …" quando o texto casa com um equipamento já avaliado hoje.
 */
async function validateManualEntryNotRatedToday(
  typed: string,
  serviceType: string | undefined,
  district: string | undefined,
): Promise<{ blocked: boolean; matchedName?: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData?.user?.id;
  if (!uid) return { blocked: false };

  const ratedIds = await fetchRatedServiceIdsToday(uid);
  if (ratedIds.size === 0) return { blocked: false };

  const st = normalizeServiceTypeToDbEnum(serviceType);
  const term = sanitizeSearchTerm(typed);
  if (term.length < 2) return { blocked: false };

  const applyType = (strict: boolean) => {
    let q = supabase.from("public_services").select("id, name, district").limit(40);
    if (!st) return q;
    if (strict) return q.eq("service_type", st);
    if (st === "hospital") return q.in("service_type", ["hospital", "other"] as string[]);
    return q.eq("service_type", st);
  };

  const candidates = new Map<string, { id: string; name: string; district: string }>();

  const collectFromIlike = async (strict: boolean, pattern: string) => {
    const { data, error } = await applyType(strict).ilike("name", `%${pattern}%`);
    if (error) return;
    for (const row of (data || []) as { id: string; name: string; district: string }[]) {
      candidates.set(row.id, row);
    }
  };

  const runNameVariants = async (strict: boolean) => {
    const variants = [...new Set([term, foldAccents(term), ...normalizeBrazilSpellings(term)])].filter(
      (t) => t.length >= 2,
    );
    for (const variant of variants) {
      await collectFromIlike(strict, variant);
      if (candidates.size > 0) return;
    }
  };

  await runNameVariants(true);
  if (candidates.size === 0 && st === "hospital") await runNameVariants(false);

  if (candidates.size === 0 && st) {
    for (const token of distinctiveTokens(term)) {
      const stricts = st === "hospital" ? [true, false] : [true];
      for (const strict of stricts) {
        await collectFromIlike(strict, token);
        if (candidates.size > 0) break;
      }
      if (candidates.size > 0) break;
    }
  }

  let list = [...candidates.values()];
  const districtSafe = district ? sanitizeSearchTerm(district) : "";
  if (districtSafe.length >= 2 && list.length > 1) {
    const dFold = foldAccents(districtSafe).toLowerCase();
    const inArea = list.filter(
      (r) =>
        (r.district && foldAccents(r.district).toLowerCase().includes(dFold)) ||
        foldAccents(r.name).toLowerCase().includes(dFold),
    );
    if (inArea.length > 0) list = inArea;
  }

  const hitRated = list.find((r) => ratedIds.has(r.id));
  if (hitRated) return { blocked: true, matchedName: hitRated.name };

  const ids = [...ratedIds];
  if (ids.length === 0) return { blocked: false };
  const { data: ratedDetails } = await supabase.from("public_services").select("id, name").in("id", ids);
  for (const svc of ratedDetails || []) {
    if (svc?.name && freeTextLikelySameService(typed, svc.name)) {
      return { blocked: true, matchedName: svc.name };
    }
  }

  return { blocked: false };
}

export const InlineServicePicker = ({ serviceType, district, hideRatedToday, onSelect }: InlineServicePickerProps) => {
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<PublicService[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState(false);
  const [allInListRatedToday, setAllInListRatedToday] = useState(false);
  const [manualEntryBlock, setManualEntryBlock] = useState<string | null>(null);
  const [isCheckingManualEntry, setIsCheckingManualEntry] = useState(false);
  const [listSelectBlock, setListSelectBlock] = useState<string | null>(null);
  const [isCheckingListSelect, setIsCheckingListSelect] = useState(false);

  const searchServices = useCallback(
    async (searchQuery: string) => {
      const st = normalizeServiceTypeToDbEnum(serviceType);
      const trimmed = sanitizeSearchTerm(searchQuery ?? "");
      const hasContext = Boolean(district && st);
      /** Lista inicial: só bairro + tipo; refinamento: texto digitado */
      const bootstrap = hasContext && trimmed.length === 0;
      const effectiveTerm = bootstrap ? sanitizeSearchTerm(district ?? "") : trimmed;

      if (!effectiveTerm || effectiveTerm.length < 2) {
        setServices([]);
        return;
      }

      const districtSafe = district ? sanitizeSearchTerm(district) : "";

      setIsLoading(true);
      try {
        const baseSelect = () =>
          supabase.from("public_services").select("id, name, service_type, district, address").limit(80);

        const applyType = (
          q: ReturnType<typeof baseSelect>,
          strict: boolean
        ): ReturnType<typeof baseSelect> => {
          if (!st) return q;
          if (strict) return q.eq("service_type", st);
          // Mesma base que "Perto de você" pode classificar equipamento de saúde como `other` no import
          if (st === "hospital") {
            return q.in("service_type", ["hospital", "other"] as string[]);
          }
          return q.eq("service_type", st);
        };

        const orNeighborhood = (term: string) =>
          `district.ilike.%${term}%,address.ilike.%${term}%,name.ilike.%${term}%`;
        const orRefine = (term: string) =>
          `name.ilike.%${term}%,district.ilike.%${term}%,address.ilike.%${term}%`;

        let rows: PublicService[] = [];

        const runPrimary = async (term: string, strictType: boolean) => {
          const attempts = [term, foldAccents(term)].filter((t, i, arr) => {
            if (t.length < 2) return false;
            return arr.findIndex((x) => x === t) === i;
          });
          for (const t of attempts) {
            let q = applyType(baseSelect(), strictType);
            q = bootstrap ? q.or(orNeighborhood(t)) : q.or(orRefine(t));
            const { data, error: e1 } = await q;
            if (e1) throw e1;
            const chunk = (data || []) as PublicService[];
            if (chunk.length > 0) return chunk;
          }
          return [];
        };

        /** Busca só na coluna `name` — mais próximo do filtro por texto do Perto de você */
        const runNameOnly = async (term: string, strictType: boolean) => {
          const attempts = [term, foldAccents(term)].filter((t, i, arr) => {
            if (t.length < 2) return false;
            return arr.findIndex((x) => x === t) === i;
          });
          for (const t of attempts) {
            let q = applyType(baseSelect(), strictType);
            q = q.ilike("name", `%${t}%`);
            const { data, error: e2 } = await q;
            if (e2) throw e2;
            const chunk = (data || []) as PublicService[];
            if (chunk.length > 0) return chunk;
          }
          return [];
        };

        // 1) Busca principal (tipo alinhado ao fluxo de avaliação)
        for (const variant of normalizeBrazilSpellings(effectiveTerm)) {
          rows = await runPrimary(variant, true);
          if (rows.length > 0) break;
        }

        // Refinar: fallback direto no nome (evita 0 linhas quando .or() não casa bem com o PostgREST)
        if (!bootstrap && rows.length === 0 && st) {
          for (const variant of normalizeBrazilSpellings(effectiveTerm)) {
            rows = await runNameOnly(variant, true);
            if (rows.length > 0) break;
          }
        }
        if (!bootstrap && rows.length === 0 && st === "hospital") {
          for (const variant of normalizeBrazilSpellings(effectiveTerm)) {
            rows = await runNameOnly(variant, false);
            if (rows.length > 0) break;
          }
        }

        // Lista inicial no bairro: alguns equipamentos vêm como `other` no import — alinhar ao "Perto de você"
        if (bootstrap && rows.length === 0 && st === "hospital") {
          for (const variant of normalizeBrazilSpellings(effectiveTerm)) {
            rows = await runPrimary(variant, false);
            if (rows.length > 0) break;
          }
        }

        // 2) Refinar: se vazio, tentar tokens fortes (ex.: "Vital")
        if (!bootstrap && rows.length === 0 && st) {
          for (const token of distinctiveTokens(effectiveTerm)) {
            rows = await runNameOnly(token, true);
            if (rows.length > 0) break;
            rows = await runPrimary(token, true);
            if (rows.length > 0) break;
          }
        }

        // 3) Ainda vazio: ampliar tipos (hospital + other) — alinha com dados reais do GeoSampa/import
        if (rows.length === 0 && st === "hospital") {
          for (const variant of normalizeBrazilSpellings(effectiveTerm)) {
            rows = await runPrimary(variant, false);
            if (rows.length > 0) break;
          }
        }

        if (!bootstrap && rows.length === 0 && st === "hospital") {
          for (const token of distinctiveTokens(effectiveTerm)) {
            rows = await runNameOnly(token, false);
            if (rows.length > 0) break;
            rows = await runPrimary(token, false);
            if (rows.length > 0) break;
          }
        }

        // Com bairro + refinamento: preferir linhas que também mencionam o bairro (sem esvaziar a lista)
        if (hasContext && !bootstrap && districtSafe.length >= 2 && rows.length > 1) {
          const dFold = foldAccents(districtSafe).toLowerCase();
          const inArea = rows.filter(
            (r) =>
              (r.district && foldAccents(r.district).toLowerCase().includes(dFold)) ||
              (r.address && foldAccents(r.address).toLowerCase().includes(dFold))
          );
          if (inArea.length > 0) rows = inArea;
        }

        let dedupEmptyBootstrap = false;
        if (hideRatedToday && rows.length > 0) {
          const { data: userData } = await supabase.auth.getUser();
          const uid = userData?.user?.id;
          if (uid) {
            const { startIso, endExclusiveIso } = getSaoPauloServiceRatingDayUtcBounds();
            const { data: ratedRows, error: ratedErr } = await supabase
              .from("service_ratings")
              .select("service_id")
              .eq("user_id", uid)
              .gte("created_at", startIso)
              .lt("created_at", endExclusiveIso);
            if (!ratedErr && ratedRows?.length) {
              const excluded = new Set(
                ratedRows.map((r) => r.service_id).filter((id): id is string => Boolean(id)),
              );
              const before = rows.length;
              rows = rows.filter((r) => !excluded.has(r.id));
              if (bootstrap && before > 0 && rows.length === 0) {
                dedupEmptyBootstrap = true;
              }
            }
          }
        }

        setAllInListRatedToday(dedupEmptyBootstrap);
        setServices(rows);
      } catch (error) {
        console.error("Error searching services:", error);
        setServices([]);
      } finally {
        setIsLoading(false);
      }
    },
    [serviceType, district, hideRatedToday]
  );

  const normalizedServiceType = useMemo(
    () => normalizeServiceTypeToDbEnum(serviceType),
    [serviceType]
  );

  /** Busca inicial + refinamento: antes, com district+type o debounce era ignorado e digitar não atualizava a lista */
  useEffect(() => {
    const delay = query.trim().length === 0 && district && normalizedServiceType ? 0 : 300;
    const t = window.setTimeout(() => {
      searchServices(query);
    }, delay);
    return () => window.clearTimeout(t);
  }, [query, district, normalizedServiceType, searchServices]);

  useEffect(() => {
    setManualEntryBlock(null);
    setListSelectBlock(null);
  }, [query]);

  const handleSelect = async (service: PublicService) => {
    setListSelectBlock(null);
    if (hideRatedToday) {
      setIsCheckingListSelect(true);
      try {
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData?.user?.id;
        if (uid) {
          const ratedIds = await fetchRatedServiceIdsToday(uid);
          if (ratedIds.has(service.id)) {
            setListSelectBlock(
              `Você já avaliou "${service.name}" hoje. Escolha outro equipamento ou volte amanhã para avaliar este novamente.`,
            );
            return;
          }
        }
      } finally {
        setIsCheckingListSelect(false);
      }
    }
    setSelected(true);
    onSelect(service.name, service.district, service.address, service.id);
  };

  if (selected) {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs text-green-600 dark:text-green-400">
        <Building2 className="h-3 w-3" />
        <span>Serviço selecionado ✓</span>
      </div>
    );
  }

  const hasPreloadContext = Boolean(district && normalizedServiceType);
  const showListPanel = hasPreloadContext || query.length >= 2;

  const listPanel = showListPanel && (
    <div className={`rounded-md border bg-popover ${hasPreloadContext ? "mb-2" : "mt-2"}`}>
      {services.length > 0 ? (
        <ScrollArea className="max-h-[220px]">
          {listSelectBlock && (
            <p className="px-3 pt-2 text-sm text-amber-700 dark:text-amber-500" role="alert">
              {listSelectBlock}
            </p>
          )}
          <div className="p-1">
            {services.map((service) => (
              <button
                key={service.id}
                type="button"
                disabled={isCheckingListSelect}
                onClick={() => void handleSelect(service)}
                className="w-full text-left px-3 py-2 rounded-sm hover:bg-accent text-sm disabled:opacity-60"
              >
                <div className="font-medium">{service.name}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{service.district}</span>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      ) : !isLoading ? (
        <div className="p-3">
          <p className="text-sm text-muted-foreground mb-2">Serviço não encontrado</p>
          {manualEntryBlock && (
            <p
              className="text-sm text-amber-700 dark:text-amber-500 mb-2"
              role="alert"
            >
              {manualEntryBlock}
            </p>
          )}
          {(query || district) && (
            <button
              type="button"
              disabled={isCheckingManualEntry}
              onClick={async () => {
                const text = (query.trim() || district || "").trim();
                if (!text) return;
                setManualEntryBlock(null);
                if (hideRatedToday) {
                  setIsCheckingManualEntry(true);
                  try {
                    const { blocked, matchedName } = await validateManualEntryNotRatedToday(
                      text,
                      serviceType,
                      district,
                    );
                    if (blocked) {
                      const label = matchedName ?? text;
                      setManualEntryBlock(
                        `Você já avaliou "${label}" hoje. Escolha outro equipamento ou volte amanhã para avaliar este novamente.`,
                      );
                      return;
                    }
                  } finally {
                    setIsCheckingManualEntry(false);
                  }
                }
                setSelected(true);
                onSelect(text, district || "", "", undefined);
              }}
              className="w-full text-left px-3 py-2 rounded-sm hover:bg-accent text-sm border disabled:opacity-60"
            >
              {isCheckingManualEntry ? "Verificando…" : `Usar "${query || district}"`}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );

  const searchInput = (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={
          hasPreloadContext ? "Refinar por nome ou bairro…" : "Digite o nome ou bairro..."
        }
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="pl-9 pr-8"
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );

  return (
    <div className="mt-2 w-full max-w-xs">
      <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
        <Building2 className="h-3 w-3 flex-shrink-0" />
        <span>
          {hasPreloadContext
            ? "Selecione na lista (ou refine abaixo se não achar)"
            : "Qual o nome do serviço?"}
        </span>
      </div>
      {hasPreloadContext && services.length > 0 && !query.trim() && (
        <p className="mb-2 text-[11px] text-muted-foreground">
          Equipamentos em <strong className="text-foreground">{district}</strong> para o tipo escolhido.
        </p>
      )}
      {hideRatedToday && allInListRatedToday && !query.trim() && (
        <p className="mb-2 text-[11px] text-amber-700 dark:text-amber-500">
          Você já avaliou hoje todos os equipamentos desta lista para o tipo e bairro escolhidos. Refine o nome para
          buscar outro local ou volte amanhã para repetir a avaliação no mesmo serviço.
        </p>
      )}

      {hasPreloadContext ? (
        <>
          {listPanel}
          {searchInput}
        </>
      ) : (
        <>
          {searchInput}
          {listPanel}
        </>
      )}
    </div>
  );
};

export default InlineServicePicker;
