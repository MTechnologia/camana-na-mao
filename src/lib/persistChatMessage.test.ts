import { describe, expect, it, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
  },
}));

import { persistChatMessage } from "@/lib/persistChatMessage";

describe("persistChatMessage", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    fromMock.mockReset();
  });

  it("usa RPC quando disponível", async () => {
    rpcMock.mockResolvedValue({ error: null });

    await persistChatMessage("conv-id", { id: "m1", role: "user", content: "oi" });

    expect(rpcMock).toHaveBeenCalledWith("append_ai_conversation_message", {
      p_conversation_id: "conv-id",
      p_message: { id: "m1", role: "user", content: "oi" },
      p_title: null,
    });
    expect(fromMock).not.toHaveBeenCalled();
  });
});
