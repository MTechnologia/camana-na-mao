import { useState, useEffect } from "react";

interface SessionData {
  lastTopic: string;
  timestamp: number;
  messages: any[];
}

export const useSessionContext = () => {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);

  useEffect(() => {
    const checkSession = () => {
      const savedSession = localStorage.getItem("aiSession");
      if (savedSession) {
        const session: SessionData = JSON.parse(savedSession);
        const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
        
        if (session.timestamp > thirtyMinutesAgo) {
          setHasActiveSession(true);
          setSessionData(session);
        } else {
          localStorage.removeItem("aiSession");
        }
      }
    };

    checkSession();
  }, []);

  const saveSession = (lastTopic: string, messages: any[]) => {
    const session: SessionData = {
      lastTopic,
      timestamp: Date.now(),
      messages,
    };
    localStorage.setItem("aiSession", JSON.stringify(session));
    setSessionData(session);
    setHasActiveSession(true);
  };

  const clearSession = () => {
    localStorage.removeItem("aiSession");
    setHasActiveSession(false);
    setSessionData(null);
  };

  const getTimeAgo = () => {
    if (!sessionData) return "";
    
    const minutes = Math.floor((Date.now() - sessionData.timestamp) / 60000);
    if (minutes < 1) return "Agora mesmo";
    if (minutes === 1) return "Há 1 minuto";
    return `Há ${minutes} minutos`;
  };

  return {
    hasActiveSession,
    sessionData,
    saveSession,
    clearSession,
    getTimeAgo,
  };
};
