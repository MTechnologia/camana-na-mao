import { vi } from "vitest";

/**
 * Mock global centralizado do client Supabase para a suíte de testes (A1.3).
 *
 * Motivação: antes, cada arquivo de teste rolava o próprio `vi.mock(...)` do
 * client com cobertura diferente (uns tinham `channel`, outros não, etc.).
 * Isso gerou ~35 falhas distintas (ex.: "supabase.channel is not a function")
 * e manutenção cara. Aqui há UM padrão único — thenable, encadeável e completo.
 *
 * Dois estilos de uso:
 *
 *   // 1) Mock do módulo inteiro (vi.mock factory):
 *   import { createSupabaseModuleMock } from "@/test/mocks/supabase";
 *   vi.mock("@/integrations/supabase/client", () => createSupabaseModuleMock());
 *
 *   // 2) Spy sobre o client real (precisa das credenciais dummy do vitest.config):
 *   import { createQueryChain, createChannelMock } from "@/test/mocks/supabase";
 *   vi.spyOn(supabase, "from").mockReturnValue(createQueryChain({ data: rows, error: null }));
 */

export interface QueryResult<T = unknown> {
  data: T;
  error: unknown;
}

const DEFAULT_RESULT: QueryResult = { data: [], error: null };

/**
 * Métodos que devolvem a própria cadeia (permitem `.select().eq().order()...`).
 * Como a cadeia é thenable, dar `await` após QUALQUER um resolve para o result.
 */
const CHAINABLE_METHODS = [
  "select", "insert", "update", "upsert", "delete",
  "eq", "neq", "gt", "gte", "lt", "lte",
  "like", "ilike", "is", "in", "not", "or", "filter",
  "match", "contains", "containedBy", "overlaps", "textSearch",
  "order", "limit", "range", "returns", "abortSignal",
] as const;

/** Terminadores que resolvem direto para o result (não encadeiam). */
const TERMINAL_METHODS = ["single", "maybeSingle", "csv", "geojson"] as const;

export type QueryChainMock = Record<string, ReturnType<typeof vi.fn>> & {
  then: Promise<QueryResult>["then"];
  catch: Promise<QueryResult>["catch"];
};

/**
 * Cadeia de query thenable. Resolve para `result` ao dar `await` em qualquer
 * ponto da cadeia, e `.single()`/`.maybeSingle()` também resolvem para `result`.
 */
export function createQueryChain<T = unknown>(
  result: QueryResult<T> = DEFAULT_RESULT as QueryResult<T>,
): QueryChainMock {
  const chain = {} as QueryChainMock;
  const promise = Promise.resolve(result);
  // Torna a cadeia "awaitable" em qualquer ponto.
  chain.then = promise.then.bind(promise) as QueryChainMock["then"];
  chain.catch = promise.catch.bind(promise) as QueryChainMock["catch"];
  (chain as Record<string, unknown>).finally = promise.finally.bind(promise);

  for (const method of CHAINABLE_METHODS) {
    chain[method] = vi.fn(() => chain);
  }
  for (const method of TERMINAL_METHODS) {
    chain[method] = vi.fn(() => Promise.resolve(result));
  }
  return chain;
}

export interface ChannelMock {
  topic: string;
  on: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  unsubscribe: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

/** Canal realtime encadeável: `.on(...).subscribe()`. */
export function createChannelMock(topic = "test-channel"): ChannelMock {
  const channel = { topic } as ChannelMock;
  channel.on = vi.fn(() => channel);
  channel.subscribe = vi.fn(() => channel);
  channel.unsubscribe = vi.fn(() => Promise.resolve("ok"));
  channel.send = vi.fn(() => Promise.resolve("ok"));
  return channel;
}

export interface SupabaseMockOptions {
  /** Resultado padrão para qualquer `supabase.from(...)` aguardado. */
  fromResult?: QueryResult;
  /** Usuário devolvido por `auth.getUser()` (default: null). */
  user?: unknown;
  /** Sessão devolvida por `auth.getSession()` (default: null). */
  session?: unknown;
  /** Resultado padrão de `supabase.rpc()` (default: { data: null, error: null }). */
  rpcResult?: QueryResult;
}

export type SupabaseMock = ReturnType<typeof createSupabaseMock>;

/**
 * Constrói um objeto que imita a superfície do client Supabase usada na app:
 * `from`, `rpc`, `channel`, `removeChannel`, `auth`, `storage`, `functions`.
 */
export function createSupabaseMock(options: SupabaseMockOptions = {}) {
  const fromResult = options.fromResult ?? DEFAULT_RESULT;
  const rpcResult = options.rpcResult ?? { data: null, error: null };
  const user = options.user ?? null;
  const session = options.session ?? null;

  return {
    from: vi.fn(() => createQueryChain(fromResult)),
    rpc: vi.fn(() => Promise.resolve(rpcResult)),
    channel: vi.fn((topic?: string) => createChannelMock(topic)),
    removeChannel: vi.fn(() => Promise.resolve("ok")),
    removeAllChannels: vi.fn(() => Promise.resolve([])),
    getChannels: vi.fn(() => [] as ChannelMock[]),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user }, error: null })),
      getSession: vi.fn(() => Promise.resolve({ data: { session }, error: null })),
      signInWithPassword: vi.fn(() =>
        Promise.resolve({ data: { user, session }, error: null }),
      ),
      signInWithOtp: vi.fn(() =>
        Promise.resolve({ data: { user: null, session: null }, error: null }),
      ),
      signUp: vi.fn(() => Promise.resolve({ data: { user, session }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { id: "sub", callback: vi.fn(), unsubscribe: vi.fn() } },
      })),
      updateUser: vi.fn(() => Promise.resolve({ data: { user }, error: null })),
      resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(() => Promise.resolve({ data: { path: "" }, error: null })),
        download: vi.fn(() => Promise.resolve({ data: null, error: null })),
        remove: vi.fn(() => Promise.resolve({ data: [], error: null })),
        getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
        createSignedUrl: vi.fn(() =>
          Promise.resolve({ data: { signedUrl: "" }, error: null }),
        ),
        list: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    },
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
    },
  };
}

/**
 * Mock do MÓDULO inteiro `@/integrations/supabase/client`.
 * Use dentro do factory de `vi.mock(...)`.
 */
export function createSupabaseModuleMock(options?: SupabaseMockOptions) {
  return {
    supabase: createSupabaseMock(options),
    supabaseUrl: "http://localhost:54321",
    supabaseAnonKey: "sb_publishable_test_key",
  };
}
