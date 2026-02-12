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

    const supabaseUrlBuild = import.meta.env.CAMARA_URL ?? import.meta.env.VITE_SUPABASE_URL;
    console.log("[useExpoPushToken] ativo no app (WebView), userId:", userId, "| Supabase URL do build:", supabaseUrlBuild ?? "(VAZIO - confira trigger Cloud Build)");

    const saveToken = async (token: string) => {
      if (!token || typeof token !== "string" || !token.startsWith("ExponentPushToken")) return false;
      doneRef.current = true;
      if ((window as any).__EXPO_PUSH_TOKEN__ === token) delete (window as any).__EXPO_PUSH_TOKEN__;

      const supabaseUrl = import.meta.env.CAMARA_URL ?? import.meta.env.VITE_SUPABASE_URL;
      const { data: { session } } = await supabase.auth.getSession();

      if (!supabaseUrl || !session?.access_token) {
        console.warn(
          "[useExpoPushToken] Edge Function não chamada:",
          !supabaseUrl ? "URL do Supabase ausente (CAMARA_URL/VITE_SUPABASE_URL)" : "sem sessão no WebView"
        );
        const { error } = await supabase.from("profiles").update({ expo_push_token: token }).eq("id", userId);
        if (error) console.warn("[useExpoPushToken] update direto error:", error);
        return true;
      }

      const fnUrl = `${supabaseUrl}/functions/v1/save-expo-push-token`;
      console.log("[useExpoPushToken] chamando Edge Function", fnUrl);
      try {
        const res = await fetch(fnUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ token }),
        });
        if (res.ok) {
          console.log("[useExpoPushToken] token salvo via Edge Function");
        } else {
          const err = await res.text();
          console.warn("[useExpoPushToken] Edge Function error:", res.status, err);
          const { error } = await supabase.from("profiles").update({ expo_push_token: token }).eq("id", userId);
          if (error) console.warn("[useExpoPushToken] update fallback error:", error);
        }
      } catch (e) {
        console.warn("[useExpoPushToken] fetch falhou (rede/CORS?):", e);
        const { error } = await supabase.from("profiles").update({ expo_push_token: token }).eq("id", userId);
        if (error) console.warn("[useExpoPushToken] update fallback error:", error);
      }
      return true;
    };

    // Token may already be injected by native (onLoadEnd or when token became ready)
    const existing = (window as any).__EXPO_PUSH_TOKEN__;
    if (existing && typeof existing === "string" && existing.startsWith("ExponentPushToken")) {
      console.log("[useExpoPushToken] token já injetado, salvando");
      saveToken(existing).then(() => {});
      return;
    }

    console.log("[useExpoPushToken] aguardando token do app (postMessage/evento + polling)");

    const handler = (e: CustomEvent<string>) => {
      saveToken(e.detail).then((done) => {
        if (done) window.removeEventListener(EVENT_NAME, handler as EventListener);
      });
    };

    window.addEventListener(EVENT_NAME, handler as EventListener);

    // Poll: native pode injetar __EXPO_PUSH_TOKEN__ depois do hook montar (ex.: onLoadEnd atrasado)
    const pollMs = 800;
    const pollMax = 15000;
    let pollCount = 0;
    const pollId = setInterval(() => {
      if (doneRef.current) return;
      pollCount += 1;
      if (pollCount * pollMs > pollMax) {
        clearInterval(pollId);
        return;
      }
      const t = (window as any).__EXPO_PUSH_TOKEN__;
      if (t && typeof t === "string" && t.startsWith("ExponentPushToken")) {
        clearInterval(pollId);
        console.log("[useExpoPushToken] token encontrado no polling, salvando");
        saveToken(t).then(() => {});
      }
    }, pollMs);

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
      clearInterval(pollId);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [userId]);
}
