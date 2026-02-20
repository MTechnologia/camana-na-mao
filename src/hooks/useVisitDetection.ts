import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const GEOFENCE_RADIUS_M = 50;
const MIN_DWELL_MINUTES = 10;
const CHECK_INTERVAL_MS = 60_000; // 1 minuto

// Haversine: distância em metros entre dois pontos
function distanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6_371_000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

interface ServiceForVisit {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface UseVisitDetectionProps {
  /** Lat/lng do usuário (GPS real, não simulada) */
  latitude: number | null;
  longitude: number | null;
  /** Serviços próximos (ex: da useNearbyServices) */
  services: ServiceForVisit[];
  /** ID do usuário logado */
  userId: string | undefined;
  /** Se a localização é simulada (ex: Centro SP) - não detectar visita */
  isSimulated: boolean;
}

interface DetectedVisit {
  visitId: string;
  serviceName: string;
}

/**
 * Detecta quando o usuário permanece dentro do geofence (50m) de um serviço
 * por pelo menos 10 minutos, criando service_visit e disparando callback.
 * Estilo Google: "Você visitou [UBS X]. Deseja avaliar?"
 * OS 05 - Detecção de visitas a serviços.
 */
export function useVisitDetection({
  latitude,
  longitude,
  services,
  userId,
  isSimulated,
}: UseVisitDetectionProps): {
  detectedVisit: DetectedVisit | null;
  onAcknowledged: () => void;
  isChecking: boolean;
} {
  const [detectedVisit, setDetectedVisit] = useState<DetectedVisit | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const dwellStartRef = useRef<Map<string, number>>(new Map());
  const createdVisitsRef = useRef<Set<string>>(new Set());

  const onAcknowledged = useCallback(() => setDetectedVisit(null), []);

  const createVisit = useCallback(
    async (serviceId: string, serviceName: string): Promise<string | null> => {
      if (!userId) return null;
      if (createdVisitsRef.current.has(serviceId)) return null;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const { data, error } = await supabase
        .from("service_visits")
        .insert({
          user_id: userId,
          service_id: serviceId,
          expires_at: expiresAt.toISOString(),
          status: "pending",
        })
        .select("id")
        .single();

      if (error) {
        console.error("[useVisitDetection] Erro ao criar visita:", error);
        return null;
      }
      const visitId = data?.id ?? null;
      createdVisitsRef.current.add(serviceId);

      if (visitId) {
        const { error: notifError } = await supabase.from("notifications").insert({
          user_id: userId,
          title: `Você visitou ${serviceName}`,
          message: "Gostaria de avaliar este serviço?",
          action_url: `/avaliar/${visitId}`,
          type: "visita_servico",
          priority: "default",
        });
        if (notifError) {
          console.error("[useVisitDetection] Erro ao criar notificação:", notifError);
        }
      }

      return visitId;
    },
    [userId]
  );

  const checkProximity = useCallback(async () => {
    if (
      !latitude ||
      !longitude ||
      !userId ||
      isSimulated ||
      services.length === 0
    ) {
      return;
    }

    const now = Date.now();
    const minDwellMs = MIN_DWELL_MINUTES * 60 * 1000;

    for (const svc of services) {
      const dist = distanceMeters(
        latitude,
        longitude,
        svc.latitude,
        svc.longitude
      );
      if (dist > GEOFENCE_RADIUS_M) {
        dwellStartRef.current.delete(svc.id);
        continue;
      }

      let start = dwellStartRef.current.get(svc.id);
      if (!start) {
        start = now;
        dwellStartRef.current.set(svc.id, start);
      }
      const elapsed = now - start;
      if (elapsed >= minDwellMs && !createdVisitsRef.current.has(svc.id)) {
        setIsChecking(true);
        const visitId = await createVisit(svc.id, svc.name);
        dwellStartRef.current.delete(svc.id);
        setIsChecking(false);
        if (visitId) {
          setDetectedVisit({ visitId, serviceName: svc.name });
        }
      }
    }
  }, [
    latitude,
    longitude,
    userId,
    isSimulated,
    services,
    createVisit,
  ]);

  useEffect(() => {
    if (
      !latitude ||
      !longitude ||
      !userId ||
      isSimulated ||
      services.length === 0
    ) {
      return;
    }

    checkProximity();
    const interval = setInterval(checkProximity, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [latitude, longitude, userId, isSimulated, services, checkProximity]);

  return { detectedVisit, onAcknowledged, isChecking };
}
