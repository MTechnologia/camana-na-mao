const OLHOVIVO_BASE = "https://api.olhovivo.sptrans.com.br/v2.1";
const OLHOVIVO_GATEWAY_BASE = "https://gateway.apilib.prefeitura.sp.gov.br/sptrans/olhovivo/v2.1";

let olhoVivoCookie: string | null = null;
let olhoVivoUseBearer = false;
let olhoVivoBearerToken: string | null = null;

export type OlhoVivoLine = {
  cl: number;
  lt: string;
  tp: string;
  ts: string;
  sl: number;
};

async function olhoVivoLogin(): Promise<boolean> {
  const token = Deno.env.get("OLHOVIVO_API_TOKEN");
  if (!token?.trim()) {
    console.warn("[olhoVivo] OLHOVIVO_API_TOKEN not set");
    return false;
  }
  const trimmedToken = token.trim();

  try {
    const loginUrl = `${OLHOVIVO_BASE}/Login/Autenticar?token=${encodeURIComponent(trimmedToken)}`;
    const res = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "CamaraNaMao/1.0",
      },
      body: new URLSearchParams({ token: trimmedToken }).toString(),
      redirect: "follow",
    });
    const text = await res.text();
    const setCookies = (res.headers as Headers & { getSetCookie?(): string[] }).getSetCookie?.() ?? [];
    if (setCookies.length > 0) {
      olhoVivoCookie = setCookies.map((c) => c.split(";")[0].trim()).join("; ");
    } else {
      const single = res.headers.get("set-cookie");
      if (single) olhoVivoCookie = single.split(";")[0].trim();
    }
    const trimmed = text?.trim() ?? "";
    let ok = trimmed === "true";
    if (!ok && trimmed.length < 20) {
      try {
        const parsed = JSON.parse(trimmed);
        ok = parsed === true;
      } catch {
        // ignore
      }
    }
    if (ok) {
      olhoVivoUseBearer = false;
      olhoVivoBearerToken = null;
      return true;
    }
  } catch (e) {
    console.warn("[olhoVivo] Classic login failed:", (e as Error).message);
  }

  const looksLikeSptransKey = /^[a-f0-9]{64}$/i.test(trimmedToken);
  if (!looksLikeSptransKey) {
    try {
      const testUrl = `${OLHOVIVO_GATEWAY_BASE}/Linha/Buscar?termosBusca=0`;
      const testRes = await fetch(testUrl, {
        headers: { Authorization: `Bearer ${trimmedToken}` },
      });
      if (testRes.ok) {
        olhoVivoCookie = null;
        olhoVivoUseBearer = true;
        olhoVivoBearerToken = trimmedToken;
        return true;
      }
    } catch (e) {
      console.warn("[olhoVivo] Gateway Bearer test failed:", (e as Error).message);
    }
  }

  return false;
}

async function olhoVivoGet(path: string): Promise<{ ok: boolean; data?: unknown; status: number }> {
  const base = olhoVivoUseBearer ? OLHOVIVO_GATEWAY_BASE : OLHOVIVO_BASE;
  const url = path.startsWith("http") ? path : `${base}${path.startsWith("/") ? path : "/" + path}`;

  if (olhoVivoUseBearer && olhoVivoBearerToken) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${olhoVivoBearerToken}` },
    });
    const contentType = res.headers.get("content-type") || "";
    const data = contentType.includes("application/json") ? await res.json() : await res.text();
    return { ok: res.ok, data, status: res.status };
  }

  if (!olhoVivoCookie) {
    const loggedIn = await olhoVivoLogin();
    if (!loggedIn) return { ok: false, status: 401 };
    return olhoVivoGet(path);
  }

  const res = await fetch(url, {
    headers: { Cookie: olhoVivoCookie },
  });
  if (res.status === 401) {
    olhoVivoCookie = null;
    const loggedIn = await olhoVivoLogin();
    if (!loggedIn) return { ok: false, status: 401 };
    return olhoVivoGet(path);
  }
  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();
  return { ok: res.ok, data, status: res.status };
}

export async function olhoVivoSearchLines(
  termosBusca: string,
): Promise<{ success: boolean; lines?: OlhoVivoLine[]; error?: string }> {
  const q = encodeURIComponent(termosBusca.trim());
  const { ok, data, status } = await olhoVivoGet(`/Linha/Buscar?termosBusca=${q}`);
  if (!ok || !Array.isArray(data)) {
    return {
      success: false,
      error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível buscar linhas.",
    };
  }
  return { success: true, lines: data as OlhoVivoLine[] };
}

export function mapOlhoVivoLineToCatalog(line: OlhoVivoLine) {
  const lineCode = String(line.lt ?? "").trim();
  const sentido = line.sl === 1 ? `${line.tp} → ${line.ts}` : `${line.ts} → ${line.tp}`;
  const lineName = sentido.trim() || lineCode;
  const lineType = /linha\s*\d|metr[oô]/i.test(lineCode) ? "metro" : "bus";
  return {
    line_code: lineCode,
    line_name: lineName,
    line_type: lineType,
    sptrans_codigo_linha: line.cl,
    direction_label: sentido,
  };
}

/** Agrupa variantes de sentido pela mesma sigla (lt). */
export function dedupeOlhoVivoLines(lines: OlhoVivoLine[]): ReturnType<typeof mapOlhoVivoLineToCatalog>[] {
  const byCode = new Map<string, ReturnType<typeof mapOlhoVivoLineToCatalog>>();
  for (const raw of lines) {
    const mapped = mapOlhoVivoLineToCatalog(raw);
    if (!mapped.line_code) continue;
    const existing = byCode.get(mapped.line_code);
    if (!existing) {
      byCode.set(mapped.line_code, mapped);
      continue;
    }
    if (mapped.line_name.length > existing.line_name.length) {
      byCode.set(mapped.line_code, mapped);
    }
  }
  return [...byCode.values()];
}
