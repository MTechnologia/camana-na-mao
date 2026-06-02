import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminStats {
  pendingUrbanReports: number;
  pendingTransportReports: number;
  pendingReports: number; // Combined urban + transport
  pendingReferrals: number;
  pendingServiceCorrections: number;
  loading: boolean;
}

export const useAdminStats = () => {
  const [stats, setStats] = useState<AdminStats>({
    pendingUrbanReports: 0,
    pendingTransportReports: 0,
    pendingReports: 0,
    pendingReferrals: 0,
    pendingServiceCorrections: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Count pending urban reports
        const { count: urbanCount } = await supabase
          .from("urban_reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        // Count pending transport reports
        const { count: transportCount } = await supabase
          .from("transport_reports")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        // Count pending referrals
        const { count: referralCount } = await supabase
          .from("council_member_referrals")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        const { count: correctionsCount } = await supabase
          .from("service_corrections")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");

        const urban = urbanCount || 0;
        const transport = transportCount || 0;

        setStats({
          pendingUrbanReports: urban,
          pendingTransportReports: transport,
          pendingReports: urban + transport,
          pendingReferrals: referralCount || 0,
          pendingServiceCorrections: correctionsCount || 0,
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching admin stats:", error);
        setStats((prev) => ({ ...prev, loading: false }));
      }
    };

    fetchStats();

    // Subscribe to real-time updates
    const urbanChannel = supabase
      .channel("urban_reports_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "urban_reports" }, () => {
        fetchStats();
      })
      .subscribe();

    const transportChannel = supabase
      .channel("transport_reports_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "transport_reports" }, () => {
        fetchStats();
      })
      .subscribe();

    const correctionsChannel = supabase
      .channel("service_corrections_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "service_corrections" },
        () => {
          fetchStats();
        },
      )
      .subscribe();

    return () => {
      urbanChannel.unsubscribe();
      transportChannel.unsubscribe();
      correctionsChannel.unsubscribe();
    };
  }, []);

  return stats;
};
