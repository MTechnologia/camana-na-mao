export type CepProvider = "viacep" | "brasilapi" | "opencep";

export interface CepAddress {
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement: string;
}

export type CepLookupErrorType = "invalid_cep" | "not_found" | "service_unavailable";

export type CepLookupResult =
  | {
      ok: true;
      provider: CepProvider;
      address: CepAddress;
    }
  | {
      ok: false;
      errorType: CepLookupErrorType;
      triedProviders: CepProvider[];
    };

const DEFAULT_TIMEOUT_MS = 4000;

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

interface BrasilApiResponse {
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
}

interface OpenCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
}

const normalizeCep = (value: string): string => value.replace(/\D/g, "").slice(0, 8);

const fetchWithTimeout = async (url: string, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

const toCepAddress = (input: {
  cep?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  complement?: string;
}): CepAddress => ({
  cep: normalizeCep(input.cep ?? ""),
  street: input.street?.trim() ?? "",
  neighborhood: input.neighborhood?.trim() ?? "",
  city: input.city?.trim() ?? "",
  state: input.state?.trim().toUpperCase() ?? "",
  complement: input.complement?.trim() ?? "",
});

const lookupViaCep = async (cleanCep: string, timeoutMs: number): Promise<CepAddress | null> => {
  const response = await fetchWithTimeout(`https://viacep.com.br/ws/${cleanCep}/json/`, timeoutMs);
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) throw new Error(`ViaCEP HTTP ${response.status}`);

  const data = (await response.json()) as ViaCepResponse;
  if (data.erro) return null;

  const hasAddressData = !!(data.logradouro || data.bairro || data.localidade || data.uf);
  if (!hasAddressData) return null;

  return toCepAddress({
    cep: data.cep ?? cleanCep,
    street: data.logradouro,
    neighborhood: data.bairro,
    city: data.localidade,
    state: data.uf,
    complement: data.complemento,
  });
};

const lookupBrasilApi = async (cleanCep: string, timeoutMs: number): Promise<CepAddress | null> => {
  const response = await fetchWithTimeout(
    `https://brasilapi.com.br/api/cep/v1/${cleanCep}`,
    timeoutMs,
  );
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) throw new Error(`BrasilAPI HTTP ${response.status}`);

  const data = (await response.json()) as BrasilApiResponse;
  if (!data?.cep && !data?.city && !data?.state) return null;

  return toCepAddress({
    cep: data.cep ?? cleanCep,
    street: data.street,
    neighborhood: data.neighborhood,
    city: data.city,
    state: data.state,
  });
};

const lookupOpenCep = async (cleanCep: string, timeoutMs: number): Promise<CepAddress | null> => {
  const response = await fetchWithTimeout(`https://opencep.com/v1/${cleanCep}`, timeoutMs);
  if (response.status === 400 || response.status === 404) return null;
  if (!response.ok) throw new Error(`OpenCEP HTTP ${response.status}`);

  const data = (await response.json()) as OpenCepResponse;
  if (!data) return null;

  const street = data.logradouro ?? data.street;
  const neighborhood = data.bairro ?? data.neighborhood;
  const city = data.localidade ?? data.city;
  const state = data.uf ?? data.state;
  const hasAddressData = !!(street || neighborhood || city || state);
  if (!hasAddressData) return null;

  return toCepAddress({
    cep: data.cep ?? cleanCep,
    street,
    neighborhood,
    city,
    state,
    complement: data.complemento,
  });
};

const CEP_PROVIDERS: ReadonlyArray<{
  name: CepProvider;
  lookup: (cleanCep: string, timeoutMs: number) => Promise<CepAddress | null>;
}> = [
  { name: "viacep", lookup: lookupViaCep },
  { name: "brasilapi", lookup: lookupBrasilApi },
  { name: "opencep", lookup: lookupOpenCep },
];

export const lookupCepAddress = async (
  cep: string,
  options?: { timeoutMs?: number },
): Promise<CepLookupResult> => {
  const cleanCep = normalizeCep(cep);
  if (!/^\d{8}$/.test(cleanCep)) {
    return {
      ok: false,
      errorType: "invalid_cep",
      triedProviders: [],
    };
  }

  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const triedProviders: CepProvider[] = [];
  let gotNotFound = false;

  for (const provider of CEP_PROVIDERS) {
    triedProviders.push(provider.name);
    try {
      const address = await provider.lookup(cleanCep, timeoutMs);
      if (address) {
        return {
          ok: true,
          provider: provider.name,
          address: {
            ...address,
            cep: address.cep || cleanCep,
          },
        };
      }
      gotNotFound = true;
    } catch {
      // Tenta próximo provider; falhas de rede/timeout não devem bloquear o cadastro.
    }
  }

  return {
    ok: false,
    errorType: gotNotFound ? "not_found" : "service_unavailable",
    triedProviders,
  };
};
