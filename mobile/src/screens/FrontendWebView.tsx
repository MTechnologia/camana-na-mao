import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, NativeSyntheticEvent, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

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
const DEFAULT_WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? 'https://camara-na-mao.onrender.com/';

const EXPO_PUSH_MESSAGE_TYPE = 'getExpoPushToken';

export function FrontendWebView() {
  const [reloadKey, setReloadKey] = useState(0);
  const [draftUrl, setDraftUrl] = useState(() => DEFAULT_WEB_URL.trim());
  const [activeUrl, setActiveUrl] = useState(() => normalizeAndValidate(DEFAULT_WEB_URL) ?? '');
  const [error, setError] = useState<string | null>(null);
  const expoPushTokenRef = useRef<string | null>(null);
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
      } catch (e) {
        console.warn('[FrontendWebView] Expo push token error:', e);
      }
    })();
  }, []);

  // Universal Links (iOS) / App Links (Android): quando o usuário abre um link do e-mail no celular, abrir no app
  useEffect(() => {
    const handleOpenUrl = (url: string | null) => {
      if (!url || !normalizeAndValidate(url)) return;
      const parsed = url.startsWith('http') ? url : `https://${url}`;
      if (parsed.includes(APP_LINK_HOST)) {
        setDraftUrl(parsed);
        setActiveUrl(parsed);
        setReloadKey((k) => k + 1);
      }
    };

    Linking.getInitialURL().then(handleOpenUrl);
    const sub = Linking.addEventListener('url', (event) => handleOpenUrl(event.url));
    return () => sub.remove();
  }, []);

  const handleWebViewMessage = useCallback(
    (event: NativeSyntheticEvent<WebViewMessageEvent>) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data?.type === EXPO_PUSH_MESSAGE_TYPE && webViewRef.current && expoPushTokenRef.current) {
          const token = expoPushTokenRef.current.replace(/"/g, '\\"');
          webViewRef.current.injectJavaScript(
            `window.dispatchEvent(new CustomEvent('expoPushToken', { detail: "${token}" })); true;`
          );
        }
      } catch (_) {}
    },
    []
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
        onMessage={handleWebViewMessage}
        injectedJavaScriptBeforeDOMContentLoaded={
          "window.__CAMARA_IN_APP__ = true;"
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

