/**
 * Shallow typings for the Deno global so the IDE's TypeScript (Node-style) accepts
 * `Deno.test` and `Deno.env.get` in this folder. Runtime remains Deno / Supabase Edge.
 */
declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>,
  ): void;
}

declare module "https://deno.land/std@0.168.0/testing/asserts.ts" {
  export function assertEquals<T>(actual: T, expected: T, msg?: string): void;
  export function assertExists<T>(actual: T, msg?: string): asserts actual is NonNullable<T>;
  export function assertStringIncludes(str: string, sub: string, msg?: string): void;
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  test(name: string, fn: () => void | Promise<void>): void;
  test(
    name: string,
    options: { ignore?: boolean; only?: boolean; sanitizeOps?: boolean; sanitizeResources?: boolean },
    fn: () => void | Promise<void>,
  ): void;
};
