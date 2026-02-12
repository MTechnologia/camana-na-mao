/**
 * No app mobile (WebView): pede o token Expo ao native e salva em profiles.expo_push_token.
 * Só roda quando window.__CAMARA_IN_APP__ é true (injetado pelo app Expo).
 * Usa Edge Function save-expo-push-token (service role) para garantir persistência.
 */

import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const MESSAGE_TYPE = "getExpoPushToken";
const EVENT_NAME = "expoPushToken";

declare global {
  interface Window {
    __CAMARA_IN_APP__?: boolean;
    __EXPO_PUSH_TOKEN__?: string;
    ReactNativeWebView?: { postMessage: (data: string) => void };
  }
}

export function useExpoPushToken(userId: string | undefined) {
  const doneRef = useRef(false);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (!window.__CAMARA_IN_APP__) return;
    if (doneRef.current) return;

    const saveToken = async (token: string) => {
      if (!token || typeof token !== "string" || !token.startsWith("ExponentPushToken")) return false;
      doneRef.current = true;
      if ((window as any).__EXPO_PUSH_TOKEN__ === token) delete (window as any).__EXPO_PUSH_TOKEN__;

      const supabaseUrl = import.meta.env.CAMARA_URL ?? import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();
      if (!supabaseUrl || !session?.access_token) {
        console.warn("[useExpoPushToken] sem sessão ou URL, tentando update direto");
        const { error } = await supabase.from("profiles").update({ expo_push_token: token }).eq("id", userId);
        if (error) console.warn("[useExpoPushToken] update error:", error);
        return true;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/save-expo-push-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.warn("[useExpoPushToken] Edge Function error:", res.status, err);
        const { error } = await supabase.from("profiles").update({ expo_push_token: token }).eq("id", userId);
        if (error) console.warn("[useExpoPushToken] update fallback error:", error);
      }
      return true;
    };

    // Token may already be injected by native (onLoadEnd or when token became ready)
    const existing = (window as any).__EXPO_PUSH_TOKEN__;
    if (existing && typeof existing === "string" && existing.startsWith("ExponentPushToken")) {
      saveToken(existing).then(() => {});
      return;
    }

    const handler = (e: CustomEvent<string>) => {
      saveToken(e.detail).then((done) => {
        if (done) window.removeEventListener(EVENT_NAME, handler as EventListener);
      });
    };

    window.addEventListener(EVENT_NAME, handler as EventListener);

    const rnw = (window as any).ReactNativeWebView;
    const requestToken = () => {
      try {
        if (rnw?.postMessage) rnw.postMessage(JSON.stringify({ type: MESSAGE_TYPE }));
      } catch (_) {}
    };
    requestToken();
    const t1 = setTimeout(() => {
      if (!doneRef.current) requestToken();
    }, 2000);
    const t2 = setTimeout(() => {
      if (!doneRef.current) requestToken();
    }, 5000);

    return () => {
      window.removeEventListener(EVENT_NAME, handler as EventListener);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [userId]);
}
