/**
 * Envia o estado de autenticação para o app nativo (WebView) quando o usuário está no app mobile.
 * Usado para detecção de visitas em background: o native armazena user_id e access_token
 * para chamar a edge function detect-service-visit.
 */
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

const CAMARA_AUTH_STATE_TYPE = "CAMARA_AUTH_STATE";

export function BackgroundAuthBridge() {
  const { user, session } = useAuth();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as Window & {
      __CAMARA_IN_APP__?: boolean;
      ReactNativeWebView?: { postMessage: (data: string) => void };
    };
    if (!win.__CAMARA_IN_APP__ || !win.ReactNativeWebView?.postMessage) return;

    const userId = user?.id ?? null;
    const accessToken = session?.access_token ?? null;

    win.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: CAMARA_AUTH_STATE_TYPE,
        user_id: userId,
        access_token: accessToken,
      }),
    );
  }, [user?.id, session?.access_token]);

  return null;
}
