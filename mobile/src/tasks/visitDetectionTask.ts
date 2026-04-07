/**
 * Background task para detecção de visitas a serviços (OS 05).
 * Usa expo-location + expo-task-manager.
 * O defineTask DEVE estar no escopo global (não em lifecycle React).
 *
 * A lógica de criação de visita, geofence 50 m, dwell 10 min e registro de
 * `departed_at` ao sair do raio está na Edge Function `detect-service-visit`
 * (este arquivo apenas envia lat/lng + JWT).
 */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const VISIT_DETECTION_TASK = 'visit-detection-background';

const AUTH_STORAGE_KEY = '@camara_visit_auth';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_CAMARA_URL ?? '';

interface StoredAuth {
  user_id: string;
  access_token: string;
}

async function callDetectServiceVisit(lat: number, lng: number): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_URL.startsWith('https://')) return;

  try {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const auth = JSON.parse(raw) as StoredAuth;
    if (!auth?.user_id || !auth?.access_token) return;

    const url = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/detect-service-visit`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.access_token}`,
      },
      body: JSON.stringify({ latitude: lat, longitude: lng }),
    });
    if (!res.ok) {
      // Token expirado: limpar para não ficar chamando em vão
      if (res.status === 401) {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      }
    }
  } catch (e) {
    // Silencioso em background
  }
}

TaskManager.defineTask(
  VISIT_DETECTION_TASK,
  async ({ data, error }: { data?: { locations?: Array<{ coords: { latitude: number; longitude: number } }> }; error?: Error }) => {
    if (error) return;
    const locs = data?.locations;
    if (!locs?.length) return;
    const last = locs[locs.length - 1];
    const { latitude, longitude } = last.coords;
    await callDetectServiceVisit(latitude, longitude);
  }
);

export { AUTH_STORAGE_KEY };
