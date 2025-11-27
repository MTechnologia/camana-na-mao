import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  pendingUrbanReports: number;
  pendingTransportReports: number;
  pendingReferrals: number;
  unreadNotifications: number;
  loading: boolean;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    pendingUrbanReports: 0,
    pendingTransportReports: 0,
    pendingReferrals: 0,
    unreadNotifications: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Count pending urban reports
        const { count: urbanCount } = await supabase
          .from('urban_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Count pending transport reports
        const { count: transportCount } = await supabase
          .from('transport_reports')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        // Count unread notifications (from all users)
        const { count: notificationCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })
          .eq('is_read', false);

        // Count pending referrals
        const { count: referralCount } = await supabase
          .from('council_member_referrals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        setStats({
          pendingUrbanReports: urbanCount || 0,
          pendingTransportReports: transportCount || 0,
          pendingReferrals: referralCount || 0,
          unreadNotifications: notificationCount || 0,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching admin stats:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    fetchStats();

    // Subscribe to real-time updates
    const urbanChannel = supabase
      .channel('urban_reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'urban_reports' }, () => {
        fetchStats();
      })
      .subscribe();

    const transportChannel = supabase
      .channel('transport_reports_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transport_reports' }, () => {
        fetchStats();
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel('notifications_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchStats();
      })
      .subscribe();

    return () => {
      urbanChannel.unsubscribe();
      transportChannel.unsubscribe();
      notificationsChannel.unsubscribe();
    };
  }, []);

  return stats;
};
