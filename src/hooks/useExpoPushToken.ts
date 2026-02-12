/**
 * No app mobile (WebView): pede o token Expo ao native e salva em profiles.expo_push_token.
 * Só roda quando window.__CAMARA_IN_APP__ é true (injetado pelo app Expo).
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

    const saveToken = (token: string) => {
      if (!token || typeof token !== "string" || !token.startsWith("ExponentPushToken")) return false;
      doneRef.current = true;
      if ((window as any).__EXPO_PUSH_TOKEN__ === token) delete (window as any).__EXPO_PUSH_TOKEN__;
      supabase
        .from("profiles")
        .update({ expo_push_token: token })
        .eq("id", userId)
        .then(({ error }) => {
          if (error) console.warn("[useExpoPushToken] update error:", error);
        });
      return true;
    };

    // Token may already be injected by native (onLoadEnd or when token became ready)
    const existing = (window as any).__EXPO_PUSH_TOKEN__;
    if (existing && saveToken(existing)) return;

    const handler = (e: CustomEvent<string>) => {
      if (saveToken(e.detail)) window.removeEventListener(EVENT_NAME, handler as EventListener);
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
