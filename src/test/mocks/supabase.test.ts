import { describe, it, expect } from "vitest";
import {
  createChannelMock,
  createQueryChain,
  createSupabaseMock,
  createSupabaseModuleMock,
} from "./supabase";

/**
 * Self-test do mock global (A1.3). Garante que o mock é confiável — a PO
 * apontou risco de "falsos positivos/negativos", então o mock precisa se
 * comportar como o client real nos pontos que a app usa.
 */

describe("createQueryChain", () => {
  it("é thenable e resolve para o result ao dar await direto", async () => {
    const res = await createQueryChain({ data: [1, 2, 3], error: null });
    expect(res).toEqual({ data: [1, 2, 3], error: null });
  });

  it("resolve para o MESMO result após qualquer cadeia de filtros", async () => {
    const chain = createQueryChain({ data: [{ id: "a" }], error: null });
    const res = await chain
      .select("*")
      .eq("user_id", "u1")
      .in("status", ["pending"])
      .gte("created_at", "2026-01-01")
      .order("created_at", { ascending: false })
      .range(0, 999);
    expect(res).toEqual({ data: [{ id: "a" }], error: null });
  });

  it("single() e maybeSingle() resolvem para o result", async () => {
    const chain = createQueryChain({ data: { id: "x" }, error: null });
    expect(await chain.select("*").eq("id", "x").single()).toEqual({
      data: { id: "x" },
      error: null,
    });
    expect(await chain.maybeSingle()).toEqual({ data: { id: "x" }, error: null });
  });

  it("propaga error quando o result tem error", async () => {
    const chain = createQueryChain({ data: null, error: { message: "boom" } });
    const { data, error } = await chain.select("*");
    expect(data).toBeNull();
    expect(error).toEqual({ message: "boom" });
  });

  it("registra as chamadas dos métodos (spies)", async () => {
    const chain = createQueryChain();
    await chain.select("id").eq("a", 1);
    expect(chain.select).toHaveBeenCalledWith("id");
    expect(chain.eq).toHaveBeenCalledWith("a", 1);
  });
});

describe("createChannelMock", () => {
  it("encadeia on(...).subscribe() e expõe spies", () => {
    const ch = createChannelMock("relatos");
    const ret = ch.on("postgres_changes", {}, () => {}).subscribe();
    expect(ret).toBe(ch);
    expect(ch.on).toHaveBeenCalledTimes(1);
    expect(ch.subscribe).toHaveBeenCalledTimes(1);
    expect(ch.topic).toBe("relatos");
  });
});

describe("createSupabaseMock", () => {
  it("expõe from/channel/removeChannel/auth/rpc — superfície que faltava nos mocks ad-hoc", () => {
    const supabase = createSupabaseMock();
    expect(typeof supabase.from).toBe("function");
    expect(typeof supabase.channel).toBe("function");
    expect(typeof supabase.removeChannel).toBe("function");
    expect(typeof supabase.rpc).toBe("function");
    expect(typeof supabase.auth.getUser).toBe("function");
  });

  it("from() devolve a cadeia com o fromResult configurado", async () => {
    const supabase = createSupabaseMock({ fromResult: { data: [{ n: 1 }], error: null } });
    const res = await supabase.from("urban_reports").select("*").eq("id", 1);
    expect(res).toEqual({ data: [{ n: 1 }], error: null });
  });

  it("channel().on().subscribe() funciona e removeChannel resolve", async () => {
    const supabase = createSupabaseMock();
    const ch = supabase
      .channel("t")
      .on("x", {}, () => {})
      .subscribe();
    expect(ch).toBeDefined();
    await expect(supabase.removeChannel(ch)).resolves.toBe("ok");
  });

  it("auth.getUser() devolve o usuário configurado", async () => {
    const supabase = createSupabaseMock({ user: { id: "user-1" } });
    const { data } = await supabase.auth.getUser();
    expect(data.user).toEqual({ id: "user-1" });
  });

  it("rpc() resolve para o rpcResult configurado", async () => {
    const supabase = createSupabaseMock({ rpcResult: { data: 42, error: null } });
    expect(await supabase.rpc("minha_funcao")).toEqual({ data: 42, error: null });
  });
});

describe("createSupabaseModuleMock", () => {
  it("expõe supabase + supabaseUrl + supabaseAnonKey (formato do módulo real)", () => {
    const mod = createSupabaseModuleMock();
    expect(mod.supabase).toBeDefined();
    expect(mod.supabaseUrl).toMatch(/^http/);
    expect(typeof mod.supabaseAnonKey).toBe("string");
  });
});
