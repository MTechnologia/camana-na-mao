import { useCallback, useEffect, useState } from "react";
import {
  fetchCouncilMemberDestinations,
  fetchThematicCommissions,
  type ReferralDestination,
} from "@/lib/referralDestinations";

export function useReferralDestinations() {
  const [commissions, setCommissions] = useState<ReferralDestination[]>([]);
  const [councilMembers, setCouncilMembers] = useState<ReferralDestination[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [com, council] = await Promise.all([
        fetchThematicCommissions(),
        fetchCouncilMemberDestinations(),
      ]);
      setCommissions(com);
      setCouncilMembers(council);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { commissions, councilMembers, loading, refresh };
}
