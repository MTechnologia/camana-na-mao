import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type HeatmapPoint = { x: string; y: string; value: number };
type DailyPoint = { day_label: string; value: number };

type TopEquipment = {
  service_id: string;
  service_name: string | null;
  users_count: number;
  last_ping_at: string | null;
};

/** Caller genérico para RPCs ausentes nos tipos gerados do Supabase. */
type RpcCaller = (
  fn: string,
  args: Record<string, unknown>,
) => Promise<{ data: unknown; error: unknown }>;

type TopRow = {
  service_id: unknown;
  service_name: unknown;
  users_count: unknown;
  last_ping_at: unknown;
};
type HeatRow = { hour_label: unknown; day_label: unknown; value: unknown };
type DailyRow = { day_label: unknown; value: unknown };

function formatIsoDayToPt(iso: string): string {
  // iso: YYYY-MM-DD
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const [y, m, d] = parts;
  return `${d}/${m}`;
}

export function useEquipmentOccupancyAdminStats() {
  const [loadingTop, setLoadingTop] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(false);

  const [topEquipments, setTopEquipments] = useState<TopEquipment[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");

  const [heatmap, setHeatmap] = useState<HeatmapPoint[]>([]);
  const [dailyBars, setDailyBars] = useState<{ label: string; value: number; color: string }[]>([]);

  useEffect(() => {
    const fetchTop = async () => {
      try {
        setLoadingTop(true);
        const callRpc = supabase.rpc as unknown as RpcCaller;

        const { data: topRows } = await callRpc("get_equipment_occupancy_top", {
          p_days: 14,
          p_limit: 10,
        });

        const list: TopEquipment[] = ((topRows as TopRow[]) || []).map((r) => ({
          service_id: String(r.service_id),
          service_name: r.service_name ? String(r.service_name) : null,
          users_count: Number(r.users_count ?? 0),
          last_ping_at: r.last_ping_at ? String(r.last_ping_at) : null,
        }));

        setTopEquipments(list);
        if (!selectedServiceId && list.length > 0) {
          setSelectedServiceId(list[0].service_id);
        }
      } catch (err) {
        console.error("[equipment_occupancy] fetch top failed:", err);
      } finally {
        setLoadingTop(false);
      }
    };

    void fetchTop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchCharts = async () => {
      if (!selectedServiceId) return;
      try {
        setLoadingCharts(true);
        const callRpc = supabase.rpc as unknown as RpcCaller;

        const { data: heatmapRows } = await callRpc("get_equipment_occupancy_heatmap_for_service", {
          p_service_id: selectedServiceId,
          p_days: 7,
        });

        const { data: dailyRows } = await callRpc("get_equipment_occupancy_daily_for_service", {
          p_service_id: selectedServiceId,
          p_days: 14,
        });

        const heatmapData: HeatmapPoint[] =
          ((heatmapRows as HeatRow[]) || []).map((r) => ({
            x: String(r.hour_label),
            y: String(r.day_label),
            value: Number(r.value ?? 0),
          })) ?? [];

        const daily: DailyPoint[] = ((dailyRows as DailyRow[]) || []).map((r) => ({
          day_label: String(r.day_label),
          value: Number(r.value ?? 0),
        }));

        const maxValue = Math.max(...daily.map((d) => d.value), 1);
        const dailySorted = daily.slice().sort((a, b) => a.day_label.localeCompare(b.day_label));

        const bars = dailySorted.map((d) => {
          const t = d.value / maxValue; // 0..1
          const hue = (1 - t) * 120; // baixo = verde, alto = amarelo/vermelho conforme t
          const color = `hsl(${hue}, 70%, 50%)`;
          return { label: formatIsoDayToPt(d.day_label), value: d.value, color };
        });

        setHeatmap(heatmapData);
        setDailyBars(bars);
      } catch (err) {
        console.error("[equipment_occupancy] fetch charts failed:", err);
      } finally {
        setLoadingCharts(false);
      }
    };

    void fetchCharts();
  }, [selectedServiceId]);

  const dailyTotal = useMemo(() => dailyBars.reduce((acc, d) => acc + d.value, 0), [dailyBars]);

  return {
    loadingTop,
    loadingCharts,
    topEquipments,
    selectedServiceId,
    setSelectedServiceId,
    heatmap,
    dailyBars,
    dailyTotal,
  };
}
