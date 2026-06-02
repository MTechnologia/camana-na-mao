import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  SERVICE_VISIT_GEOFENCE_RADIUS_M,
  SERVICE_VISIT_MIN_DWELL_MINUTES,
  isOutsideServiceVisitGeofence,
  serviceVisitDistanceMeters,
} from "@/lib/serviceVisitGeofence";
import {
  RECENT_SERVICE_VISIT_LOOKBACK_MS,
  pickClosestByDistanceMeters,
} from "@/lib/visitDetectionMulti";

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
  /** Quando false (preferência no perfil), não monitora nem cria visitas. */
  visitDetectionEnabled?: boolean;
}

interface DetectedVisit {
  visitId: string;
  serviceName: string;
}

type OpenVisitMeta = { visitId: string; lat: number; lng: number };

/**
 * Detecta quando o usuário permanece dentro do geofence (SERVICE_VISIT_GEOFENCE_RADIUS_M) de serviço(s)
 * por pelo menos SERVICE_VISIT_MIN_DWELL_MINUTES, criando service_visit (um por equipamento sem visita em 24h)
 * e uma única notificação/toast para o mais próximo (RN-VISIT-002).
 * Quando o usuário se afasta além do raio de uma visita pending sem departed_at, preenche departed_at.
 * OS 05/06 — Detecção de visitas, múltiplos equipamentos e toggle de privacidade.
 */
export function useVisitDetection({
  latitude,
  longitude,
  services,
  userId,
  visitDetectionEnabled = true,
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

  const registerOpenVisit = useCallback(
    (serviceId: string, visitId: string, lat: number, lng: number) => {
      openPendingVisitsRef.current.set(serviceId, { visitId, lat, lng });
      createdVisitsRef.current.add(serviceId);
    },
    [],
  );

  useEffect(() => {
    if (!visitDetectionEnabled) {
      dwellStartRef.current.clear();
    }
  }, [visitDetectionEnabled]);

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

  /** Insere visita e registra pending local; notificação/toast ficam para o ciclo (só o mais próximo). */
  const insertVisitRecord = useCallback(
    async (serviceId: string, svcLat: number, svcLng: number): Promise<string | null> => {
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
      return visitId;
    },
    [userId, registerOpenVisit],
  );

  const checkProximity = useCallback(async () => {
    if (!latitude || !longitude || !userId) {
      if (import.meta.env?.DEV && services.length === 0) {
        console.debug("[useVisitDetection] checkProximity não roda:", {
          servicesLength: services.length,
          hasUser: !!userId,
        });
      }
      return;
    }

    if (!visitDetectionEnabled) {
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
    const minDwellMs = SERVICE_VISIT_MIN_DWELL_MINUTES * 60 * 1000;
    let withinRadius = 0;
    let maxElapsed = 0;
    type Eligible = { svc: ServiceForVisit; distanceMeters: number };
    const eligibleForInsert: Eligible[] = [];

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
        eligibleForInsert.push({ svc, distanceMeters: dist });
      }
    }

    if (eligibleForInsert.length > 0) {
      const sinceIso = new Date(Date.now() - RECENT_SERVICE_VISIT_LOOKBACK_MS).toISOString();
      const candidateIds = eligibleForInsert.map((e) => e.svc.id);
      const { data: recentRows, error: recentErr } = await supabase
        .from("service_visits")
        .select("service_id")
        .eq("user_id", userId)
        .in("service_id", candidateIds)
        .gte("visited_at", sinceIso);

      if (recentErr) {
        console.error("[useVisitDetection] Erro ao checar visitas recentes (24h):", recentErr);
      } else {
        const recentSet = new Set((recentRows ?? []).map((r) => r.service_id as string));
        const newlyCreated: { visitId: string; serviceName: string; distanceMeters: number }[] = [];

        setIsChecking(true);
        for (const { svc, distanceMeters } of eligibleForInsert) {
          if (recentSet.has(svc.id)) {
            dwellStartRef.current.delete(svc.id);
            continue;
          }
          const visitId = await insertVisitRecord(svc.id, svc.latitude, svc.longitude);
          dwellStartRef.current.delete(svc.id);
          if (visitId) {
            newlyCreated.push({
              visitId,
              serviceName: svc.displayName ?? svc.name,
              distanceMeters,
            });
            recentSet.add(svc.id);
          }
        }
        setIsChecking(false);

        const closest = pickClosestByDistanceMeters(newlyCreated);
        if (closest) {
          const { error: notifError } = await supabase.from("notifications").insert({
            user_id: userId,
            title: `Você visitou ${closest.serviceName}`,
            message: "Gostaria de avaliar este serviço?",
            action_url: `/avaliar/${closest.visitId}`,
            type: "visita_servico",
            priority: "default",
          });
          if (notifError) {
            console.error("[useVisitDetection] Erro ao criar notificação:", notifError);
          }
          setDetectedVisit({ visitId: closest.visitId, serviceName: closest.serviceName });
        }
      }
    }

    if (import.meta.env?.DEV && withinRadius > 0) {
      console.debug("[useVisitDetection] checkProximity:", {
        withinRadius,
        maxElapsedMs: maxElapsed,
        maxElapsedMin: (maxElapsed / 60000).toFixed(1),
        needMin: SERVICE_VISIT_MIN_DWELL_MINUTES,
      });
    }
  }, [
    latitude,
    longitude,
    userId,
    services,
    insertVisitRecord,
    recordDeparturesIfOutside,
    openVisitsHydrated,
    visitDetectionEnabled,
  ]);

  useEffect(() => {
    if (!latitude || !longitude || !userId || !visitDetectionEnabled) {
      return;
    }

    checkProximity();
    const interval = setInterval(checkProximity, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [
    latitude,
    longitude,
    userId,
    services,
    checkProximity,
    openVisitsHydrated,
    visitDetectionEnabled,
  ]);

  return { detectedVisit, onAcknowledged, isChecking };
}
