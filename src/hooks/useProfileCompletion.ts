import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProfileCompletionStatus {
  basic: boolean;
  interests: boolean;
  demographics: boolean;
  address: boolean;
  percentage: number;
}

export const useProfileCompletion = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<ProfileCompletionStatus>({
    basic: false,
    interests: false,
    demographics: false,
    address: false,
    percentage: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    checkCompletion();
  }, [user]);

  const checkCompletion = async () => {
    if (!user) return;

    try {
      // Check basic profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      // Check interests
      const { data: interests } = await supabase
        .from('user_interests')
        .select('id')
        .eq('user_id', user.id);

      // Check demographics
      const { data: demographics, error: demographicsError } = await supabase
        .from('user_demographics')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (demographicsError) {
        console.error("Error fetching demographics:", demographicsError);
      }

      // Check address
      const { data: address, error: addressError } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (addressError) {
        console.error("Error fetching address:", addressError);
      }

      const completed = {
        basic: !!(profile?.full_name && profile?.phone),
        interests: (interests?.length || 0) >= 3,
        demographics: !!(demographics?.gender && demographics?.race && demographics?.social_class),
        address: !!address,
      };

      const completedCount = Object.values(completed).filter(Boolean).length;
      const percentage = Math.round((completedCount / 4) * 100);

      setStatus({ ...completed, percentage });
    } catch (error) {
      console.error("Error checking profile completion:", error);
    } finally {
      setLoading(false);
    }
  };

  const markStepCompleted = async (step: string) => {
    if (!user) return;

    try {
      await supabase.from('profile_completion_progress').upsert({
        user_id: user.id,
        step_completed: step,
      });

      await checkCompletion();
    } catch (error) {
      console.error("Error marking step completed:", error);
    }
  };

  return { status, loading, checkCompletion, markStepCompleted };
};
