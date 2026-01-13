import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DEFAULT_PING_URL } from './src/config';
import { FrontendWebView } from './src/screens/FrontendWebView';
import { fetchWithTimeout } from './src/utils/fetchWithTimeout';

type PingResult =
  | { ok: true; status: number; contentType: string | null; bodyPreview: string; elapsedMs: number }
  | { ok: false; error: string };

export default function App() {
  const [tab, setTab] = useState<'frontend' | 'api'>('frontend');
  const [pingUrl, setPingUrl] = useState(DEFAULT_PING_URL);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PingResult | null>(null);

  const canPing = useMemo(() => pingUrl.trim().length > 0, [pingUrl]);

  async function handlePing() {
    if (!canPing) return;
    setLoading(true);
    setResult(null);
    try {
      const started = Date.now();
      const res = await fetchWithTimeout(pingUrl.trim(), { method: 'GET' }, 10_000);
      const contentType = res.headers.get('content-type');
      const text = await res.text();
      setResult({
        ok: true,
        status: res.status,
        contentType,
        bodyPreview: text.slice(0, 4000),
        elapsedMs: Date.now() - started,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setResult({ ok: false, error: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('frontend')}
          style={[styles.tabBtn, tab === 'frontend' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, tab === 'frontend' && styles.tabTextActive]}>Frontend</Text>
        </Pressable>
        <Pressable onPress={() => setTab('api')} style={[styles.tabBtn, tab === 'api' && styles.tabBtnActive]}>
          <Text style={[styles.tabText, tab === 'api' && styles.tabTextActive]}>API</Text>
        </Pressable>
      </View>

      {tab === 'frontend' ? (
        <FrontendWebView />
      ) : (
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.h1}>Câmara na Mão — Mobile</Text>
          <Text style={styles.p}>
            Teste rápido: informe uma URL (ex.: health do Supabase local) e toque em “Testar API”.
          </Text>

          <View style={styles.card}>
            <Text style={styles.label}>URL para testar (GET)</Text>
            <TextInput
              value={pingUrl}
              onChangeText={setPingUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.15.28:54321/auth/v1/health"
              style={styles.input}
            />

            <Pressable
              onPress={handlePing}
              disabled={!canPing || loading}
              style={({ pressed }) => [
                styles.button,
                (!canPing || loading) && styles.buttonDisabled,
                pressed && !loading && canPing && styles.buttonPressed,
              ]}
            >
              {loading ? (
                <View style={styles.row}>
                  <ActivityIndicator />
                  <Text style={styles.buttonText}>Testando...</Text>
                </View>
              ) : (
                <Text style={styles.buttonText}>Testar API</Text>
              )}
            </Pressable>
          </View>

          {result && (
            <View style={styles.card}>
              <Text style={styles.label}>Resultado</Text>
              {result.ok ? (
                <>
                  <Text style={styles.mono}>HTTP {result.status}</Text>
                  <Text style={styles.mono}>tempo: {result.elapsedMs}ms</Text>
                  <Text style={styles.mono}>content-type: {result.contentType ?? '(vazio)'}</Text>
                  <Text style={styles.monoBlock}>{result.bodyPreview || '(sem corpo)'}</Text>
                </>
              ) : (
                <Text style={styles.error}>{result.error}</Text>
              )}
            </View>
          )}

          <Text style={styles.footnote}>
            Dica: no celular, use o IP da sua rede (não “localhost”) para acessar serviços rodando no seu PC.
          </Text>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F8' },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tabBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  tabBtnActive: { backgroundColor: '#2563EB' },
  tabText: { fontWeight: '700', color: '#111827' },
  tabTextActive: { color: '#FFFFFF' },
  container: {
    padding: 16,
    gap: 12,
  },
  h1: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  p: {
    color: '#374151',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  label: { fontWeight: '600', color: '#111827' },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonPressed: { opacity: 0.9 },
  buttonDisabled: { backgroundColor: '#93C5FD' },
  buttonText: { color: '#FFFFFF', fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  mono: { fontFamily: 'monospace', color: '#111827' },
  monoBlock: {
    fontFamily: 'monospace',
    color: '#111827',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 10,
  },
  error: { color: '#B91C1C', fontWeight: '600' },
  footnote: { color: '#6B7280', fontSize: 12, lineHeight: 18 },
});
