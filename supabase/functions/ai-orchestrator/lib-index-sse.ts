export function createSsePayload(content: string): string {
  return JSON.stringify({
    choices: [{ delta: { content } }],
  });
}

export function createSseResponse(
  content: string,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(`data: ${createSsePayload(content)}\n\ndata: [DONE]\n\n`, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}
