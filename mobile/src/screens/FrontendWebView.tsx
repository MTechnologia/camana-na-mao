import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, NativeSyntheticEvent, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { AUTH_STORAGE_KEY, VISIT_DETECTION_TASK } from '../tasks/visitDetectionTask';

// Faz a notificação aparecer na bandeja do celular (foreground e usar canal no Android)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

function normalizeAndValidate(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return null;
}

// Para builds distribuídos (APK), use EXPO_PUBLIC_WEB_URL apontando para uma URL pública.
// Fallback: URL pública do Render (e ainda dá pra editar no próprio app).
const DEFAULT_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://camana-na-mao-767943602990.southamerica-east1.run.app/';

let APP_LINK_HOST = '';
try {
  APP_LINK_HOST = new URL(DEFAULT_WEB_URL.trim()).hostname;
} catch {
  APP_LINK_HOST = '';
}

/** action_url relativo (ex. /avaliar/uuid) ou absoluto → URL do WebView */
function resolveNotificationTargetUrl(pathOrUrl: string, baseWebUrl: string): string | null {
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return normalizeAndValidate(trimmed);
  }
  try {
    const base = baseWebUrl.replace(/\/$/, '');
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return new URL(path, `${base}/`).href;
  } catch {
    return null;
  }
}

const EXPO_PUSH_MESSAGE_TYPE = 'getExpoPushToken';
const CAMARA_AUTH_STATE_TYPE = 'CAMARA_AUTH_STATE';

export function FrontendWebView() {
  const [reloadKey, setReloadKey] = useState(0);
  const [draftUrl, setDraftUrl] = useState(() => DEFAULT_WEB_URL.trim());
  const [activeUrl, setActiveUrl] = useState(() => normalizeAndValidate(DEFAULT_WEB_URL) ?? '');
  const [error, setError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const expoPushTokenRef = useRef<string | null>(null);
  const pendingTokenRequestRef = useRef(false);
  const webViewRef = useRef<WebView>(null);

  const normalizedDraft = useMemo(() => draftUrl.trim(), [draftUrl]);
  const normalizedActive = useMemo(() => activeUrl.trim(), [activeUrl]);

  // Canal Android com alta importância para a notificação aparecer na bandeja do celular
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    Notifications.setNotificationChannelAsync('default', {
      name: 'Notificações',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
    }).catch((e) => console.warn('[FrontendWebView] Channel setup:', e));
  }, []);

  const sendTokenToWeb = useCallback(() => {
    const token = expoPushTokenRef.current;
    if (!webViewRef.current || !token || !token.startsWith('ExponentPushToken')) return;
    const escaped = token.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    // Set global so web can read on mount if event was missed; then dispatch event
    webViewRef.current.injectJavaScript(
      `(function(){ window.__EXPO_PUSH_TOKEN__ = "${escaped}"; window.dispatchEvent(new CustomEvent('expoPushToken', { detail: window.__EXPO_PUSH_TOKEN__ })); })(); true;`
    );
  }, []);

  useEffect(() => {
    if (!Device.isDevice) return;
    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let final = existing;
      if (existing !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        final = status;
      }
      if (final !== 'granted') return;
      try {
        const projectId = process.env.EXPO_PUBLIC_PROJECT_ID ?? Constants.expoConfig?.extra?.eas?.projectId;
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: projectId ?? undefined,
        });
        expoPushTokenRef.current = tokenData.data;
        if (pendingTokenRequestRef.current) {
          pendingTokenRequestRef.current = false;
          setTimeout(sendTokenToWeb, 100);
        }
      } catch (e) {
        console.warn('[FrontendWebView] Expo push token error:', e);
      }
    })();
  }, [sendTokenToWeb]);

  // Universal Links (iOS) / App Links (Android): quando o usuário abre um link do e-mail no celular, abrir no app
  useEffect(() => {
    const handleOpenUrl = (url: string | null) => {
      if (!url || !normalizeAndValidate(url)) return;
      const parsed = url.startsWith('http') ? url : `https://${url}`;
      if (APP_LINK_HOST && parsed.includes(APP_LINK_HOST)) {
        setDraftUrl(parsed);
        setActiveUrl(parsed);
        setReloadKey((k) => k + 1);
      }
    };

    Linking.getInitialURL().then(handleOpenUrl);
    const sub = Linking.addEventListener('url', (event) => handleOpenUrl(event.url));
    return () => sub.remove();
  }, []);

  // Toque em notificação push (Expo): data.url vem de send-web-push (ex. /avaliar/:visitId)
  const openFromNotificationData = useCallback(
    (data: Record<string, unknown> | undefined) => {
      const raw = data?.url;
      if (typeof raw !== 'string') return;
      const base = normalizedActive || DEFAULT_WEB_URL.trim();
      const full = resolveNotificationTargetUrl(raw, base);
      if (!full) return;
      setDraftUrl(full);
      setActiveUrl(full);
      setReloadKey((k) => k + 1);
    },
    [normalizedActive],
  );

  useEffect(() => {
    if (!Device.isDevice) return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      openFromNotificationData(
        response.notification.request.content.data as Record<string, unknown>,
      );
    });
    void Notifications.getLastNotificationResponseAsync().then((last) => {
      const data = last?.notification?.request?.content?.data as Record<string, unknown> | undefined;
      if (data) openFromNotificationData(data);
    });
    return () => sub.remove();
  }, [openFromNotificationData]);

  // Background location para detecção de visitas (OS 05)
  useEffect(() => {
    if (!Device.isDevice) return;
    (async () => {
      try {
        const { status: foreground } = await Location.requestForegroundPermissionsAsync();
        if (foreground !== 'granted') return;
        const { status: background } = await Location.requestBackgroundPermissionsAsync();
        if (background !== 'granted') return;
        const isRegistered = await TaskManager.isTaskRegisteredAsync(VISIT_DETECTION_TASK);
        if (!isRegistered) {
          await Location.startLocationUpdatesAsync(VISIT_DETECTION_TASK, {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 100,
            timeInterval: 60_000,
            foregroundService: {
              notificationTitle: 'Câmara na Mão',
              notificationBody: 'Monitorando visitas a serviços públicos',
            },
          });
        }
      } catch (e) {
        // Silencioso; permissão negada ou não disponível
      }
    })();
  }, []);

  // Android: seta/voltar da barra de navegação deve voltar na página do WebView; só minimiza se não houver histórico
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  const handleWebViewMessage = useCallback(
    (event: NativeSyntheticEvent<WebViewMessageEvent>) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === EXPO_PUSH_MESSAGE_TYPE) {
          if (webViewRef.current && expoPushTokenRef.current) {
            sendTokenToWeb();
          } else {
            pendingTokenRequestRef.current = true;
          }
          return;
        }
        if (data?.type === CAMARA_AUTH_STATE_TYPE) {
          const userId = typeof data?.user_id === 'string' ? data.user_id : null;
          const accessToken = typeof data?.access_token === 'string' ? data.access_token : null;
          if (userId && accessToken) {
            AsyncStorage.setItem(
              AUTH_STORAGE_KEY,
              JSON.stringify({ user_id: userId, access_token: accessToken })
            ).catch(() => {});
          } else {
            AsyncStorage.removeItem(AUTH_STORAGE_KEY).catch(() => {});
          }
        }
      } catch {
        // Ignore parse errors from invalid postMessage payload
      }
    },
    [sendTokenToWeb]
  );

  if (!normalizedActive) {
    return (
      <View style={styles.center}>
        <Text style={styles.h1}>Frontend (WebView)</Text>
        <Text style={styles.p}>
          Informe a URL do frontend abaixo (ou configure <Text style={styles.mono}>EXPO_PUBLIC_WEB_URL</Text>).
        </Text>
        <Text style={styles.p}>
          Exemplo (seu PC): <Text style={styles.mono}>http://192.168.15.28:5173/</Text>
        </Text>
        <TextInput
          value={draftUrl}
          onChangeText={(t) => {
            setDraftUrl(t);
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="http://192.168.15.28:5173/"
          style={styles.input}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          onPress={() => {
            const valid = normalizeAndValidate(normalizedDraft);
            if (!valid) {
              setError('URL inválida. Use http:// ou https:// (ex.: http://192.168.15.28:8080/)');
              return;
            }
            setActiveUrl(valid);
            setReloadKey((k) => k + 1);
          }}
          style={styles.openBtn}
        >
          <Text style={styles.openText}>Abrir</Text>
        </Pressable>
      </View>
    );
  }

  // Em produção: não mostrar barra de URL (campo, Abrir, Reload)
  const showUrlBar = __DEV__;

  return (
    <View style={styles.flex}>
      {showUrlBar && (
        <>
          <View style={styles.topBar}>
            <TextInput
              value={draftUrl}
              onChangeText={(t) => {
                setDraftUrl(t);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.15.28:5173/"
              style={styles.urlInput}
            />
            <Pressable
              onPress={() => {
                const valid = normalizeAndValidate(normalizedDraft);
                if (!valid) {
                  setError('URL inválida. Use http:// ou https://');
                  return;
                }
                setActiveUrl(valid);
                setReloadKey((k) => k + 1);
              }}
              style={styles.reloadBtn}
            >
              <Text style={styles.reloadText}>Abrir</Text>
            </Pressable>
            <Pressable
              onPress={() => setReloadKey((k) => k + 1)}
              style={[styles.reloadBtn, styles.secondaryBtn]}
            >
              <Text style={styles.reloadText}>Reload</Text>
            </Pressable>
          </View>
          {error && (
            <View style={styles.errorBar}>
              <Text style={styles.error}>{error}</Text>
            </View>
          )}
        </>
      )}

      <WebView
        ref={webViewRef}
        key={reloadKey}
        source={{ uri: normalizedActive }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator />
            <Text style={styles.p}>Carregando…</Text>
          </View>
        )}
        allowsBackForwardNavigationGestures
        onNavigationStateChange={(navState) => setCanGoBack(navState.canGoBack ?? false)}
        onMessage={handleWebViewMessage}
        onLoadEnd={() => {
          if (expoPushTokenRef.current && webViewRef.current) {
            setTimeout(sendTokenToWeb, 100);
          }
          // No app: remove foco automático (vários horários para pegar foco tardio do WebView)
          if (webViewRef.current) {
            const blurScript = `
              (function(){
                [400, 800, 1200, 1800].forEach(function(ms){
                  setTimeout(function(){
                    try {
                      if (document.activeElement && typeof document.activeElement.blur === 'function') {
                        document.activeElement.blur();
                      }
                    } catch(e) {}
                  }, ms);
                });
              })();
              true;
            `;
            webViewRef.current.injectJavaScript(blurScript);
          }
        }}
        injectedJavaScriptBeforeContentLoaded={
          [
            "window.__CAMARA_IN_APP__ = true;",
            "(function(){ var end = Date.now() + 4000; var iv = setInterval(function(){ if (Date.now() > end) { clearInterval(iv); return; } try { var el = document.activeElement; if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) el.blur(); } catch(e){} }, 150); })();",
          ].join("\n")
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#FFFFFF' },
  center: { flex: 1, padding: 16, justifyContent: 'center', gap: 10 },
  h1: { fontSize: 18, fontWeight: '700', color: '#111827' },
  p: { color: '#374151', lineHeight: 20 },
  mono: { fontFamily: 'monospace', color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  error: { color: '#B91C1C', fontWeight: '600' },
  openBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  openText: { color: '#FFFFFF', fontWeight: '700' },
  topBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  urlInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontFamily: 'monospace',
    color: '#111827',
  },
  reloadBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryBtn: { backgroundColor: '#374151' },
  reloadText: { color: '#FFFFFF', fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  errorBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FEF2F2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
  },
});

