import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface N8NLog {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  status: string | null;
  payload: unknown;
  response: unknown;
  error_message: string | null;
  created_at: string | null;
}

export interface N8NMetrics {
  totalProcessed: number;
  pending: number;
  failed: number;
  successRate: number;
  avgProcessingTime: number;
}

export interface N8NEventTypeData {
  type: string;
  count: number;
}

export interface N8NVolumeData {
  date: string;
  sent: number;
  received: number;
}

export const useN8NMonitoring = () => {
  const [logs, setLogs] = useState<N8NLog[]>([]);
  const [metrics, setMetrics] = useState<N8NMetrics>({
    totalProcessed: 0,
    pending: 0,
    failed: 0,
    successRate: 0,
    avgProcessingTime: 0
  });
  const [eventTypeData, setEventTypeData] = useState<N8NEventTypeData[]>([]);
  const [volumeData, setVolumeData] = useState<N8NVolumeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from('n8n_integration_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data) {
      setLogs(data);
    }
  }, []);

  const calculateMetrics = useCallback(async () => {
    // Get counts from logs
    const { data: allLogs } = await supabase
      .from('n8n_integration_logs')
      .select('status, event_type, created_at');

    if (!allLogs) return;

    const sent = allLogs.filter(l => l.status === 'sent').length;
    const received = allLogs.filter(l => l.status === 'received').length;
    const failed = allLogs.filter(l => l.status === 'error').length;
    const pending = sent - received;

    // Get processed reports counts
    const { count: urbanProcessed } = await supabase
      .from('urban_reports')
      .select('*', { count: 'exact', head: true })
      .eq('n8n_processed', true);

    const { count: transportProcessed } = await supabase
      .from('transport_reports')
      .select('*', { count: 'exact', head: true })
      .eq('n8n_processed', true);

    const totalProcessed = (urbanProcessed || 0) + (transportProcessed || 0);
    const total = sent + received;
    const successRate = total > 0 ? ((received / (sent || 1)) * 100) : 0;

    setMetrics({
      totalProcessed,
      pending: pending > 0 ? pending : 0,
      failed,
      successRate: Math.round(successRate * 10) / 10,
      avgProcessingTime: 3.2 // Placeholder - would need timestamps comparison
    });
  }, []);

  const calculateEventTypeData = useCallback(async () => {
    const { data } = await supabase
      .from('n8n_integration_logs')
      .select('event_type');

    if (!data) return;

    const counts: Record<string, number> = {};
    data.forEach(log => {
      counts[log.event_type] = (counts[log.event_type] || 0) + 1;
    });

    const formatted = Object.entries(counts).map(([type, count]) => ({
      type: formatEventType(type),
      count
    }));

    setEventTypeData(formatted);
  }, []);

  const calculateVolumeData = useCallback(async () => {
    const { data } = await supabase
      .from('n8n_integration_logs')
      .select('status, created_at')
      .order('created_at', { ascending: true });

    if (!data || data.length === 0) return;

    const volumeByDate: Record<string, { sent: number; received: number }> = {};

    data.forEach(log => {
      if (!log.created_at) return;
      const date = new Date(log.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });

      if (!volumeByDate[date]) {
        volumeByDate[date] = { sent: 0, received: 0 };
      }

      if (log.status === 'sent') {
        volumeByDate[date].sent++;
      } else if (log.status === 'received') {
        volumeByDate[date].received++;
      }
    });

    const formatted = Object.entries(volumeByDate).map(([date, values]) => ({
      date,
      ...values
    }));

    setVolumeData(formatted);
  }, []);

  const formatEventType = (type: string): string => {
    const labels: Record<string, string> = {
      'urban_report_created': 'Relato Urbano',
      'transport_report_created': 'Transporte',
      'service_rating_created': 'Avaliação',
      'callback_received': 'Callback'
    };
    return labels[type] || type;
  };

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await Promise.all([
      fetchLogs(),
      calculateMetrics(),
      calculateEventTypeData(),
      calculateVolumeData()
    ]);
    setLastUpdated(new Date());
    setIsLoading(false);
  }, [fetchLogs, calculateMetrics, calculateEventTypeData, calculateVolumeData]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('n8n-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'n8n_integration_logs'
        },
        (payload) => {
          console.log('New N8N log received:', payload);
          setLogs(prev => [payload.new as N8NLog, ...prev.slice(0, 99)]);
          // Recalculate metrics on new log
          calculateMetrics();
          calculateEventTypeData();
          calculateVolumeData();
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [calculateMetrics, calculateEventTypeData, calculateVolumeData]);

  return {
    logs,
    metrics,
    eventTypeData,
    volumeData,
    isLoading,
    lastUpdated,
    refresh
  };
};
