import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
}

export interface JourneyDraft {
  journeyId: string;
  journeyLabel: string;
  messages: Message[];
  context: Record<string, any>;
  savedAt: number;
  conversationId?: string;
}

const STORAGE_KEY_PREFIX = 'cmsp_journey_draft_';
const DRAFT_EXPIRY_DAYS = 7;
const DEBOUNCE_MS = 500;

// Jornadas estruturadas que devem ter rascunho salvo
const STRUCTURED_JOURNEYS = ['urban_report', 'transport', 'evaluate'];

export function useJourneyDraft() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<JourneyDraft | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = user?.id ? `${STORAGE_KEY_PREFIX}${user.id}` : null;

  // Carregar rascunho ao montar
  useEffect(() => {
    if (!storageKey) {
      setDraft(null);
      setHasDraft(false);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: JourneyDraft = JSON.parse(stored);
        
        // Verificar expiração
        const expiryTime = DRAFT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        if (Date.now() - parsed.savedAt > expiryTime) {
          localStorage.removeItem(storageKey);
          setDraft(null);
          setHasDraft(false);
          return;
        }

        // Converter timestamps de volta para Date objects
        parsed.messages = parsed.messages.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));

        setDraft(parsed);
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Error loading draft:', error);
      if (storageKey) {
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  // Salvar rascunho
  const saveDraft = useCallback((
    journeyId: string,
    journeyLabel: string,
    messages: Message[],
    context: Record<string, any> = {},
    conversationId?: string
  ) => {
    if (!storageKey) return;
    
    // Só salvar para jornadas estruturadas
    if (!STRUCTURED_JOURNEYS.includes(journeyId)) return;
    
    // Não salvar se não há mensagens do usuário
    if (messages.filter(m => m.role === 'user').length === 0) return;

    // Debounce para evitar salvamentos excessivos
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      const draftData: JourneyDraft = {
        journeyId,
        journeyLabel,
        messages,
        context,
        savedAt: Date.now(),
        conversationId
      };

      try {
        localStorage.setItem(storageKey, JSON.stringify(draftData));
        setDraft(draftData);
        setHasDraft(true);
      } catch (error) {
        console.error('Error saving draft:', error);
      }
    }, DEBOUNCE_MS);
  }, [storageKey]);

  // Limpar rascunho
  const clearDraft = useCallback(() => {
    if (!storageKey) return;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    try {
      localStorage.removeItem(storageKey);
      setDraft(null);
      setHasDraft(false);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [storageKey]);

  // Calcular idade do rascunho em texto legível
  const getDraftAge = useCallback((): string => {
    if (!draft) return '';

    const diffMs = Date.now() - draft.savedAt;
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'agora mesmo';
    if (diffMinutes < 60) return `há ${diffMinutes} ${diffMinutes === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
  }, [draft]);

  // Verificar se a jornada deve ter auto-save
  const shouldAutoSave = useCallback((journeyId: string): boolean => {
    return STRUCTURED_JOURNEYS.includes(journeyId);
  }, []);

  // Cleanup no unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return {
    draft,
    hasDraft,
    saveDraft,
    clearDraft,
    getDraftAge,
    shouldAutoSave
  };
}
