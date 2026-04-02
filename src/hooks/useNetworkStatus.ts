import { useState, useEffect, useCallback, useRef } from "react";

interface NetworkStatus {
  isOnline: boolean;
  isChecking: boolean;
  lastCheck: Date | null;
  checkConnection: () => Promise<boolean>;
}

const DEBOUNCE_MS = 2000;
const OFFLINE_RECHECK_INTERVAL_MS = 30000;

export function useNetworkStatus(): NetworkStatus {
  // Start with navigator.onLine as initial value - trust it initially
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  const failureCountRef = useRef(0);
  const recheckIntervalRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const performConnectivityCheck = useCallback(async (): Promise<boolean> => {
    // First check navigator.onLine - if it says online, trust it
    if (navigator.onLine) {
      return true;
    }
    
    // Only do network check if navigator says offline
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/`,
        {
          method: "HEAD",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      return true; // Any response means we're online
    } catch {
      return false;
    }
  }, []);

  const checkConnection = useCallback(async (): Promise<boolean> => {
    if (!isMountedRef.current) return true;
    
    setIsChecking(true);
    
    const isConnected = await performConnectivityCheck();
    
    if (!isMountedRef.current) return true;
    
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
      
      if (!isMountedRef.current) return true;
      
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
    
    if (!isMountedRef.current) return true;
    
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
    isMountedRef.current = true;
    
    // Only check if navigator reports offline - otherwise trust navigator.onLine
    if (!navigator.onLine) {
      checkConnection();
    }

    const handleOnline = () => {
      // Browser says online - just set it, no need to verify
      setIsOnline(true);
      setIsChecking(false);
      failureCountRef.current = 0;
      
      if (recheckIntervalRef.current) {
        clearInterval(recheckIntervalRef.current);
        recheckIntervalRef.current = null;
      }
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
      isMountedRef.current = false;
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
