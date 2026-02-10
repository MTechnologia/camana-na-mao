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
    ReactNativeWebView?: { postMessage: (data: string) => void };
  }
}

export function useExpoPushToken(userId: string | undefined) {
  const doneRef = useRef(false);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (!window.__CAMARA_IN_APP__ || !window.ReactNativeWebView) return;
    if (doneRef.current) return;

    const handler = (e: CustomEvent<string>) => {
      const token = e.detail;
      if (!token || !token.startsWith("ExponentPushToken")) return;
      window.removeEventListener(EVENT_NAME, handler as EventListener);
      doneRef.current = true;
      supabase
        .from("profiles")
        .update({ expo_push_token: token })
        .eq("id", userId)
        .then(({ error }) => {
          if (error) console.warn("[useExpoPushToken] update error:", error);
        });
    };

    window.addEventListener(EVENT_NAME, handler as EventListener);
    window.ReactNativeWebView?.postMessage(JSON.stringify({ type: MESSAGE_TYPE }));

    return () => {
      window.removeEventListener(EVENT_NAME, handler as EventListener);
    };
  }, [userId]);
}
