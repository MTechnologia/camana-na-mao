/**
 * Registra e mantém a assinatura Web Push do usuário.
 * Usar quando o usuário está logado e push_enabled nas preferências.
 */

import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const SW_PATH = "/sw-push.js";
const SW_SCOPE = "/";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export type PushStatus = "unsupported" | "prompt" | "granted" | "denied" | "subscribed" | "error";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushStatus>("prompt");
  const [error, setError] = useState<string | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const publicKey =
    typeof import.meta.env !== "undefined" && import.meta.env?.VITE_VAPID_PUBLIC_KEY;

  const subscribe = useCallback(
    async (userId: string): Promise<boolean> => {
      if (!supported) {
        setStatus("unsupported");
        return false;
      }
      if (!publicKey || typeof publicKey !== "string") {
        setError("VAPID público não configurado (VITE_VAPID_PUBLIC_KEY)");
        setStatus("error");
        return false;
      }

      setError(null);
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "prompt");
          return false;
        }

        const reg = await navigator.serviceWorker.register(SW_PATH, { scope: SW_SCOPE });
        await navigator.serviceWorker.ready;

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        const json = subscription.toJSON();
        const endpoint = json.endpoint;
        const p256dh = json.keys?.p256dh;
        const auth = json.keys?.auth;
        if (!endpoint || !p256dh || !auth) {
          setError("Assinatura inválida");
          setStatus("error");
          return false;
        }

        const { error: insertError } = await supabase.from("push_subscriptions").upsert(
          {
            user_id: userId,
            endpoint,
            p256dh_key: p256dh,
            auth_key: auth,
            user_agent: navigator.userAgent.slice(0, 500),
          },
          { onConflict: "user_id,endpoint" },
        );

        if (insertError) {
          setError(insertError.message);
          setStatus("error");
          return false;
        }

        setStatus("subscribed");
        return true;
      } catch (e) {
        const msg = (e as Error).message || String(e);
        setError(msg);
        setStatus("error");
        return false;
      }
    },
    [supported, publicKey],
  );

  const unsubscribe = useCallback(
    async (userId: string) => {
      if (!supported) return;
      try {
        const reg = await navigator.serviceWorker.getRegistration(SW_SCOPE);
        if (reg?.pushManager) {
          const sub = await reg.pushManager.getSubscription();
          if (sub?.endpoint) {
            await supabase
              .from("push_subscriptions")
              .delete()
              .eq("user_id", userId)
              .eq("endpoint", sub.endpoint);
          }
        }
      } catch {
        // ignore
      }
    },
    [supported],
  );

  return {
    supported,
    status,
    error,
    subscribe,
    unsubscribe,
    permission: typeof Notification !== "undefined" ? Notification.permission : "default",
  };
}
