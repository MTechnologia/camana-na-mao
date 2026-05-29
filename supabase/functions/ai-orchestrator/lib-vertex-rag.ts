/** CHB-033: feature flag para Vertex RAG. */
export function isVertexRagEnabled(envGet: (key: string) => string | undefined = Deno.env.get.bind(Deno.env)): boolean {
  const disable = String(envGet("AI_DISABLE_VERTEX_RAG") ?? "").trim().toLowerCase();
  if (disable === "1" || disable === "true" || disable === "yes" || disable === "on") {
    return false;
  }
  const enable = String(envGet("AI_ENABLE_VERTEX_RAG") ?? "").trim().toLowerCase();
  if (enable === "1" || enable === "true" || enable === "yes" || enable === "on") {
    return true;
  }
  return !!(envGet("VERTEX_RAG_DATASTORE") || envGet("VERTEX_RAG_CORPUS"));
}
