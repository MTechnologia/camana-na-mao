import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  checkConnection: () => Promise<boolean>;
}

const DEBOUNCE_MS = 2000;
const OFFLINE_RECHECK_INTERVAL_MS = 30000;

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  const failureCountRef = useRef(0);
  const recheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performConnectivityCheck = useCallback(async (): Promise<boolean> => {
    try {
      // Light HEAD request to Supabase auth endpoint
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/`,
        {
          method: "HEAD",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      return response.ok || response.status === 400; // 400 is expected for HEAD on auth
    } catch {
      return false;
    }
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    
    const isConnected = await performConnectivityCheck();
    
    if (isConnected) {
      failureCountRef.current = 0;
      setIsOnline(true);
      setIsChecking(false);
      setLastCheck(new Date());
      
      // Clear recheck interval when online
      if (recheckIntervalRef.current) {
        clearInterval(recheckIntervalRef.current);
        recheckIntervalRef.current = null;
      }
      
      return true;
    }
    
    // First failure - wait and retry
    failureCountRef.current += 1;
    
    if (failureCountRef.current === 1) {
      // Debounce: wait 2s before declaring offline
      await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS));
      const retryResult = await performConnectivityCheck();
      
      if (retryResult) {
        failureCountRef.current = 0;
        setIsOnline(true);
        setIsChecking(false);
        setLastCheck(new Date());
        return true;
      }
      
      failureCountRef.current = 2;
    }
    
    // Confirmed offline after 2 failures
    setIsOnline(false);
    setIsChecking(false);
    setLastCheck(new Date());
    
    // Start periodic recheck when offline
    if (!recheckIntervalRef.current) {
      recheckIntervalRef.current = setInterval(() => {
        checkConnection();
      }, OFFLINE_RECHECK_INTERVAL_MS);
    }
    
    return false;
  }, [performConnectivityCheck]);

  useEffect(() => {
    // Initial check on mount
    checkConnection();

    const handleOnline = () => {
      // Browser says online - verify with real check
      checkConnection();
    };

    const handleOffline = () => {
      // Clear any pending debounce
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      // Debounce before checking
      debounceTimeoutRef.current = setTimeout(() => {
        checkConnection();
      }, 500);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      
      if (recheckIntervalRef.current) {
        clearInterval(recheckIntervalRef.current);
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [checkConnection]);

  return {
    isOnline,
    isChecking,
    lastCheck,
    checkConnection,
  };
}
