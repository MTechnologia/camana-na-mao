import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  handleSubscribeAudienciaTopicAlert,
  handleSubscribeService,
} from "./lib-subscription-and-audiencia-handlers.ts";

type QueryResult = { data: unknown; error: null };

class QueryMock {
  constructor(private readonly result: QueryResult) {}

  select(_columns: string) {
    return this;
  }

  eq(_column: string, _value: string) {
    return this;
  }

  ilike(_column: string, _value: string) {
    return this;
  }

  limit(_value: number) {
    return this;
  }

  maybeSingle() {
    return Promise.resolve(this.result);
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve(this.result).then(onfulfilled);
  }
}

function createSupabaseMock(results: QueryResult[]) {
  const insertedRows: Array<Record<string, unknown>> = [];
  let publicServicesQueryIndex = 0;

  const client = {
    from: (table: string) => {
      if (table === "public_services") {
        const result = results[publicServicesQueryIndex++] ?? { data: [], error: null };
        return new QueryMock(result);
      }
      if (table === "service_subscriptions") {
        return {
          upsert: async (row: Record<string, unknown>) => {
            insertedRows.push(row);
            return { error: null };
          },
        };
      }
      throw new Error(`Tabela inesperada no teste: ${table}`);
    },
  } as unknown as SupabaseClient;

  return { client, insertedRows };
}

Deno.test("handleSubscribeService registra acompanhamento pelo nome do equipamento", async () => {
  const { client, insertedRows } = createSupabaseMock([
    {
      data: [{ id: "svc-1", name: "UBS Vila Mariana", district: "Vila Mariana" }],
      error: null,
    },
  ]);

  const result = await handleSubscribeService(
    { service_name: "UBS Vila Mariana" },
    client,
    "user-1",
  );

  assertEquals(result.success, true);
  assertEquals(insertedRows, [{ user_id: "user-1", service_id: "svc-1" }]);
  assertEquals(
    result.message.includes("UBS Vila Mariana"),
    true,
  );
});

Deno.test("handleSubscribeService pede mais contexto quando encontra vários equipamentos parecidos", async () => {
  const { client, insertedRows } = createSupabaseMock([
    {
      data: [
        { id: "svc-1", name: "UBS Central", district: "Sé" },
        { id: "svc-2", name: "UBS Central", district: "Butantã" },
      ],
      error: null,
    },
    {
      data: [
        { id: "svc-1", name: "UBS Central", district: "Sé" },
        { id: "svc-2", name: "UBS Central", district: "Butantã" },
      ],
      error: null,
    },
  ]);

  const result = await handleSubscribeService(
    { service_name: "UBS Central" },
    client,
    "user-1",
  );

  assertEquals(result.success, false);
  assertEquals(insertedRows.length, 0);
  assertEquals(
    result.message.includes("mais de um equipamento parecido"),
    true,
  );
});

Deno.test("handleSubscribeAudienciaTopicAlert registra tema e dispara backfill inicial", async () => {
  const upsertedRows: Array<Record<string, unknown>> = [];
  const rpcCalls: Array<{ fn: string; args: Record<string, unknown> }> = [];

  const client = {
    from: (table: string) => {
      assertEquals(table, "audiencia_topic_alerts");
      return {
        upsert: async (row: Record<string, unknown>) => {
          upsertedRows.push(row);
          return { error: null };
        },
      };
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      rpcCalls.push({ fn, args });
      return { error: null };
    },
  } as unknown as SupabaseClient;

  const result = await handleSubscribeAudienciaTopicAlert(
    { tema: "Saúde" },
    client,
    "user-1",
  );

  assertEquals(result.success, true);
  assertEquals(upsertedRows, [{ user_id: "user-1", tema: "Saúde" }]);
  assertEquals(rpcCalls, [
    {
      fn: "backfill_audiencia_topic_alert_notifications_for_user",
      args: { p_user_id: "user-1", p_tema: "Saúde" },
    },
  ]);
});
