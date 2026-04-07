import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  SERVICE_VISIT_GEOFENCE_RADIUS_M,
  isOutsideServiceVisitGeofence,
  serviceVisitDistanceMeters,
} from "@/lib/serviceVisitGeofence";

const MIN_DWELL_MINUTES = 10;
const CHECK_INTERVAL_MS = 60_000; // 1 minuto

interface ServiceForVisit {
  id: string;
  name: string;
  /** Nome para exibição (ex.: "Ponto de ônibus – Av. X" em vez do ID técnico) */
  displayName?: string;
  latitude: number;
  longitude: number;
}

interface UseVisitDetectionProps {
  /** Lat/lng do usuário (GPS real) */
  latitude: number | null;
  longitude: number | null;
  /** Serviços próximos (ex: da useNearbyServices) */
  services: ServiceForVisit[];
  /** ID do usuário logado */
  userId: string | undefined;
}

interface DetectedVisit {
  visitId: string;
  serviceName: string;
}

type OpenVisitMeta = { visitId: string; lat: number; lng: number };

/**
 * Detecta quando o usuário permanece dentro do geofence (50m) de um serviço
 * por pelo menos 10 minutos, criando service_visit e disparando callback.
 * Quando o usuário se afasta (>50 m) de uma visita pending sem departed_at, preenche departed_at.
 * Estilo Google: "Você visitou [UBS X]. Deseja avaliar?"
 * OS 05 - Detecção de visitas a serviços.
 */
export function useVisitDetection({
  latitude,
  longitude,
  services,
  userId,
}: UseVisitDetectionProps): {
  detectedVisit: DetectedVisit | null;
  onAcknowledged: () => void;
  isChecking: boolean;
} {
  const [detectedVisit, setDetectedVisit] = useState<DetectedVisit | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  /** Evita criar visita duplicada antes de carregar pending do banco para o usuário. */
  const [openVisitsHydrated, setOpenVisitsHydrated] = useState(false);
  const dwellStartRef = useRef<Map<string, number>>(new Map());
  const createdVisitsRef = useRef<Set<string>>(new Set());
  /** Visitas pending sem saída: por service_id (coordenadas do equipamento no momento da detecção). */
  const openPendingVisitsRef = useRef<Map<string, OpenVisitMeta>>(new Map());

  const onAcknowledged = useCallback(() => setDetectedVisit(null), []);

  const registerOpenVisit = useCallback((serviceId: string, visitId: string, lat: number, lng: number) => {
    openPendingVisitsRef.current.set(serviceId, { visitId, lat, lng });
    createdVisitsRef.current.add(serviceId);
  }, []);

  /** Hidrata visitas pending abertas do banco (ex.: após reload ou outra aba). */
  useEffect(() => {
    if (!userId) {
      openPendingVisitsRef.current.clear();
      createdVisitsRef.current.clear();
      setOpenVisitsHydrated(true);
      return;
    }

    setOpenVisitsHydrated(false);
    openPendingVisitsRef.current.clear();
    createdVisitsRef.current.clear();

    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("service_visits")
        .select("id, service_id, public_services(latitude, longitude)")
        .eq("user_id", userId)
        .eq("status", "pending")
        .is("departed_at", null);

      if (cancelled) return;

      if (error) {
        console.error("[useVisitDetection] Hidratação de visitas abertas:", error);
        setOpenVisitsHydrated(true);
        return;
      }

      for (const row of data ?? []) {
        const sid = row.service_id as string;
        const ps = row.public_services as { latitude: unknown; longitude: unknown } | null;
        const plat = Number(ps?.latitude);
        const plng = Number(ps?.longitude);
        if (!sid || Number.isNaN(plat) || Number.isNaN(plng)) continue;
        openPendingVisitsRef.current.set(sid, {
          visitId: row.id as string,
          lat: plat,
          lng: plng,
        });
        createdVisitsRef.current.add(sid);
      }
      setOpenVisitsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const recordDeparturesIfOutside = useCallback(async () => {
    if (!latitude || !longitude || !userId) return;
    const toRemove: string[] = [];
    const nowIso = new Date().toISOString();

    for (const [serviceId, meta] of openPendingVisitsRef.current) {
      const d = serviceVisitDistanceMeters(latitude, longitude, meta.lat, meta.lng);
      if (!isOutsideServiceVisitGeofence(d)) continue;

      const { error } = await supabase
        .from("service_visits")
        .update({ departed_at: nowIso })
        .eq("id", meta.visitId)
        .eq("user_id", userId)
        .eq("status", "pending")
        .is("departed_at", null);

      if (!error) {
        toRemove.push(serviceId);
        createdVisitsRef.current.delete(serviceId);
      } else {
        console.error("[useVisitDetection] Erro ao registrar saída:", error);
      }
    }

    for (const id of toRemove) {
      openPendingVisitsRef.current.delete(id);
    }
  }, [latitude, longitude, userId]);

  const createVisit = useCallback(
    async (serviceId: string, serviceName: string, svcLat: number, svcLng: number): Promise<string | null> => {
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
      if (visitId) {
        registerOpenVisit(serviceId, visitId, svcLat, svcLng);
      }

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
    [userId, registerOpenVisit]
  );

  const checkProximity = useCallback(async () => {
    if (!latitude || !longitude || !userId) {
      if (import.meta.env?.DEV && services.length === 0) {
        console.debug("[useVisitDetection] checkProximity não roda:", { servicesLength: services.length, hasUser: !!userId });
      }
      return;
    }

    await recordDeparturesIfOutside();

    if (!openVisitsHydrated) {
      return;
    }

    if (services.length === 0) {
      return;
    }

    const now = Date.now();
    const minDwellMs = MIN_DWELL_MINUTES * 60 * 1000;
    let withinRadius = 0;
    let maxElapsed = 0;

    for (const svc of services) {
      const dist = serviceVisitDistanceMeters(latitude, longitude, svc.latitude, svc.longitude);
      if (dist > SERVICE_VISIT_GEOFENCE_RADIUS_M) {
        dwellStartRef.current.delete(svc.id);
        continue;
      }

      withinRadius += 1;
      let start = dwellStartRef.current.get(svc.id);
      if (!start) {
        start = now;
        dwellStartRef.current.set(svc.id, start);
      }
      const elapsed = now - start;
      if (elapsed > maxElapsed) maxElapsed = elapsed;
      if (elapsed >= minDwellMs && !createdVisitsRef.current.has(svc.id)) {
        setIsChecking(true);
        const visitId = await createVisit(svc.id, svc.displayName ?? svc.name, svc.latitude, svc.longitude);
        dwellStartRef.current.delete(svc.id);
        setIsChecking(false);
        if (visitId) {
          setDetectedVisit({ visitId, serviceName: svc.displayName ?? svc.name });
        }
      }
    }

    if (import.meta.env?.DEV && withinRadius > 0) {
      console.debug("[useVisitDetection] checkProximity:", { withinRadius, maxElapsedMs: maxElapsed, maxElapsedMin: (maxElapsed / 60000).toFixed(1), needMin: MIN_DWELL_MINUTES });
    }
  }, [latitude, longitude, userId, services, createVisit, recordDeparturesIfOutside, openVisitsHydrated]);

  useEffect(() => {
    if (!latitude || !longitude || !userId) {
      return;
    }

    checkProximity();
    const interval = setInterval(checkProximity, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [latitude, longitude, userId, services, checkProximity, openVisitsHydrated]);

  return { detectedVisit, onAcknowledged, isChecking };
}
