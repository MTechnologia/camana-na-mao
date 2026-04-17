const OLHOVIVO_BASE = "https://api.olhovivo.sptrans.com.br/v2.1";
const OLHOVIVO_GATEWAY_BASE = "https://gateway.apilib.prefeitura.sp.gov.br/sptrans/olhovivo/v2.1";

let olhoVivoCookie: string | null = null;
let olhoVivoUseBearer = false;
let olhoVivoBearerToken: string | null = null;

async function olhoVivoLogin(): Promise<boolean> {
  const token = Deno.env.get("OLHOVIVO_API_TOKEN");
  if (!token?.trim()) {
    console.warn("[olhoVivo] OLHOVIVO_API_TOKEN not set");
    return false;
  }
  const trimmedToken = token.trim();

  try {
    console.warn("[olhoVivo] Trying classic login (POST)...");
    const loginUrl = `${OLHOVIVO_BASE}/Login/Autenticar?token=${encodeURIComponent(trimmedToken)}`;
    const res = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "CamaraNaMao/1.0 (https://github.com/camara-na-mao)",
      },
      body: new URLSearchParams({ token: trimmedToken }).toString(),
      redirect: "follow",
    });
    const text = await res.text();
    console.warn(
      "[olhoVivo] Classic login status:",
      res.status,
      "bodyLen:",
      text?.length ?? 0,
      "bodySample:",
      text?.trim().slice(0, 120) ?? "",
    );
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
        // ignore malformed text body
      }
    }
    if (trimmed === "false") {
      console.warn(
        "[olhoVivo] API retornou false no login. A SPTrans pode estar rejeitando requisições da origem (ex.: datacenter). Considere: (1) pedir à SPTrans liberação para uso server-side; (2) usar token do API Store (Prefeitura) com app inscrito na API Olho Vivo v2.1.",
      );
    }
    if (ok) {
      olhoVivoUseBearer = false;
      olhoVivoBearerToken = null;
      return true;
    }
  } catch (e) {
    console.warn("[olhoVivo] Classic login failed:", (e as Error).message, (e as Error).stack?.slice(0, 300));
  }

  const looksLikeSptransKey = /^[a-f0-9]{64}$/i.test(trimmedToken);
  if (looksLikeSptransKey) {
    console.warn("[olhoVivo] Token parece chave SPTrans; não tentando gateway Bearer.");
  }
  if (!looksLikeSptransKey) {
    try {
      const testUrl = `${OLHOVIVO_GATEWAY_BASE}/Linha/Buscar?termosBusca=0`;
      const testRes = await fetch(testUrl, {
        headers: { Authorization: `Bearer ${trimmedToken}` },
      });
      if (testRes.ok || testRes.status === 200) {
        olhoVivoCookie = null;
        olhoVivoUseBearer = true;
        olhoVivoBearerToken = trimmedToken;
        console.log("[olhoVivo] Using gateway (Bearer) auth");
        return true;
      }
      const body = await testRes.text();
      if (testRes.status === 403) {
        console.warn(
          "[olhoVivo] Gateway 403 Forbidden: o token do API Store não tem permissão para a API Olho Vivo. No portal apilib.prefeitura.sp.gov.br, inscreva o aplicativo na API Olho Vivo v2.1 (Production/Sandbox).",
        );
      } else {
        console.warn("[olhoVivo] Gateway Bearer test status:", testRes.status, "body:", body?.slice(0, 200));
      }
    } catch (e) {
      console.warn("[olhoVivo] Gateway Bearer test failed:", (e as Error).message);
    }
  }

  console.warn("[olhoVivo] Login returned: false (classic and gateway failed)");
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
): Promise<{ success: boolean; lines?: Array<{ cl: number; lt: string; tp: string; ts: string; sl: number }>; error?: string }> {
  const q = encodeURIComponent(termosBusca.trim());
  const { ok, data, status } = await olhoVivoGet(`/Linha/Buscar?termosBusca=${q}`);
  if (!ok || !Array.isArray(data)) {
    return { success: false, error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível buscar linhas." };
  }
  return { success: true, lines: data as Array<{ cl: number; lt: string; tp: string; ts: string; sl: number }> };
}

export async function olhoVivoSearchStops(
  termosBusca: string,
): Promise<{ success: boolean; stops?: Array<{ cp: number; np: string; ed: string; py: number; px: number }>; error?: string }> {
  const q = encodeURIComponent(termosBusca.trim());
  const { ok, data, status } = await olhoVivoGet(`/Parada/Buscar?termosBusca=${q}`);
  if (!ok || !Array.isArray(data)) {
    return { success: false, error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível buscar paradas." };
  }
  return { success: true, stops: data as Array<{ cp: number; np: string; ed: string; py: number; px: number }> };
}

export async function olhoVivoGetStopsByLine(
  codigoLinha: number,
): Promise<{ success: boolean; stops?: Array<{ cp: number; np: string; ed: string; py: number; px: number }>; error?: string }> {
  const { ok, data, status } = await olhoVivoGet(`/Parada/BuscarParadasPorLinha?codigoLinha=${codigoLinha}`);
  if (!ok || !Array.isArray(data)) {
    return { success: false, error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível buscar itinerário." };
  }
  return { success: true, stops: data as Array<{ cp: number; np: string; ed: string; py: number; px: number }> };
}

type OlhoVivoParada = {
  np?: string;
  l?: Array<{ c: string; cl: number; lt0: string; lt1: string; vs: Array<{ p: string; t?: string; a?: boolean }> }>;
};

export async function olhoVivoPrevisao(
  codigoParada: number,
  codigoLinha: number,
): Promise<{ success: boolean; parada?: OlhoVivoParada; error?: string }> {
  const { ok, data, status } = await olhoVivoGet(`/Previsao?codigoParada=${codigoParada}&codigoLinha=${codigoLinha}`);
  if (!ok || !data || typeof data !== "object") {
    return { success: false, error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível obter previsão." };
  }
  const obj = data as { p?: OlhoVivoParada };
  return { success: true, parada: obj.p };
}

export async function olhoVivoPrevisaoParada(
  codigoParada: number,
): Promise<{ success: boolean; parada?: OlhoVivoParada; error?: string }> {
  const { ok, data, status } = await olhoVivoGet(`/Previsao/Parada?codigoParada=${codigoParada}`);
  if (!ok || !data || typeof data !== "object") {
    return { success: false, error: status === 401 ? "API Olho Vivo não configurada." : "Não foi possível obter previsão." };
  }
  const obj = data as { p?: OlhoVivoParada };
  return { success: true, parada: obj.p };
}
