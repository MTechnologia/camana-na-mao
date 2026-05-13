/**
 * HU-12 fix: Bridge JS → React Native para downloads dentro do APK.
 *
 * O APK Android é um wrapper Expo com `react-native-webview` que carrega
 * o site web. WebViews Android NÃO suportam `<a download>` nem
 * `window.open(blob:)` para download de arquivos — o JS pode chamar mas
 * o browser embarcado simplesmente ignora.
 *
 * Solução: detectar se estamos dentro do WebView do app (via flag
 * `window.__CAMARA_IN_APP__` que o nativo injeta antes do site carregar),
 * e nesse caso enviar o conteúdo do arquivo para o nativo via
 * `window.ReactNativeWebView.postMessage`. O nativo decodifica, salva no
 * cache e abre o menu nativo de Compartilhar.
 *
 * Em qualquer outro contexto (browser desktop, browser mobile, PWA
 * standalone), retorna false para que o caller use o método web padrão.
 */

interface RNWebView {
  postMessage(message: string): void;
}

declare global {
  interface Window {
    __CAMARA_IN_APP__?: boolean;
    ReactNativeWebView?: RNWebView;
  }
}

/** Detecta se estamos rodando dentro do WebView do APK. */
export function isInsideNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.__CAMARA_IN_APP__ === true
    || typeof window.ReactNativeWebView?.postMessage === "function"
  );
}

/**
 * Converte uma string (ex: CSV) para base64. Usa TextEncoder + btoa via
 * binary string, preservando UTF-8 multi-byte corretamente (incluindo BOM
 * e acentos).
 */
function stringToBase64(input: string): string {
  if (typeof TextEncoder !== "undefined") {
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    const chunkSize = 0x8000; // 32k — evita stack overflow em arrays grandes
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    return btoa(binary);
  }
  // Fallback antigo (raro): assume input é binary-safe.
  return btoa(unescape(encodeURIComponent(input)));
}

/**
 * Converte um ArrayBuffer (ex: XLSX) para base64.
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

/**
 * Envia um arquivo para o nativo via postMessage. Retorna true se enviou
 * com sucesso, false se não estiver dentro do app.
 */
export function postFileToNative(
  content: string | ArrayBuffer,
  filename: string,
  mime: string,
): boolean {
  if (!isInsideNativeApp() || !window.ReactNativeWebView) {
    return false;
  }
  const base64 =
    typeof content === "string"
      ? stringToBase64(content)
      : arrayBufferToBase64(content);

  try {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "CAMARA_DOWNLOAD_FILE",
        filename,
        base64,
        mime,
      }),
    );
    return true;
  } catch (err) {
    console.warn("[nativeBridge] postFileToNative failed:", err);
    return false;
  }
}
