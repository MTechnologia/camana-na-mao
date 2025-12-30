import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import type { CollectionType, CollectedFields } from "@/components/ai/DataCollectionTracker";

// Sanitiza marcadores técnicos do conteúdo das mensagens
const sanitizeMessageContent = (content: string): string => {
  return content
    .replace(/\[REPORT_CREATED:[a-f0-9-]+\]/g, '')
    .replace(/\[TRANSPORT_CREATED:[a-f0-9-]+\]/g, '')
    .replace(/\[RATING_CREATED:[a-f0-9-]+\]/g, '')
    .replace(/\[COLLECTION_PROGRESS:\w+:\{[^\]]*\}\]/g, '')
    .replace(/\[FIELD_REQUEST:\w+\]/g, '')
    .trim();
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  source?: string;
}

interface CreatedReport {
  type: 'urban_report' | 'transport' | 'rating';
  id: string;
}

export const useUnifiedAIChat = (
  conversationId?: string | null,
  initialCollectionType?: CollectionType
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);
  const [createdReport, setCreatedReport] = useState<CreatedReport | null>(null);
  const [collectionType, setCollectionType] = useState<CollectionType>(initialCollectionType || null);
  const [collectedFields, setCollectedFields] = useState<CollectedFields>({});
  const conversationIdRef = useRef<string | null>(conversationId || null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Storage key for tracker persistence
  const getTrackerStorageKey = (convId: string | null) => 
    convId ? `cmsp_tracker_${convId}` : null;

  // Sync conversationIdRef with prop changes
  useEffect(() => {
    if (conversationId !== conversationIdRef.current) {
      conversationIdRef.current = conversationId || null;
    }
  }, [conversationId]);

  // Sincroniza collectionType quando initialCollectionType muda
  useEffect(() => {
    if (initialCollectionType) {
      console.log('[useUnifiedAIChat] Setting collectionType from initial:', initialCollectionType);
      setCollectionType(initialCollectionType);
    }
  }, [initialCollectionType]);

  // Load tracker state from sessionStorage when conversation changes
  useEffect(() => {
    const storageKey = getTrackerStorageKey(conversationId || null);
    if (storageKey) {
      try {
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          const { type, fields } = JSON.parse(saved);
          console.log('[useUnifiedAIChat] Restored tracker from session:', type, fields);
          if (type) setCollectionType(type);
          if (fields && Object.keys(fields).length > 0) setCollectedFields(fields);
          return; // Don't reset if we restored
        }
      } catch (e) {
        console.warn('[useUnifiedAIChat] Failed to restore tracker:', e);
      }
    }
    // Reset if no saved state (but respect initialCollectionType)
    setIsHistoryLoaded(false);
    setCreatedReport(null);
    if (!initialCollectionType) {
      setCollectionType(null);
    }
    setCollectedFields({});
  }, [conversationId, initialCollectionType]);

  // Persist tracker state to sessionStorage when it changes
  useEffect(() => {
    const storageKey = getTrackerStorageKey(conversationIdRef.current);
    if (storageKey && (collectionType || Object.keys(collectedFields).length > 0)) {
      sessionStorage.setItem(storageKey, JSON.stringify({
        type: collectionType,
        fields: collectedFields
      }));
    }
  }, [collectionType, collectedFields]);

  // Load messages from database when conversationId changes
  useEffect(() => {
    const loadConversationMessages = async () => {
      if (!conversationId || !user) {
        // Não limpa mensagens se não há conversa - preserva mensagens otimistas
        setIsHistoryLoaded(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('ai_conversations')
          .select('messages')
          .eq('id', conversationId)
          .single();

        if (error) throw error;

        const savedMessages = (data.messages as any[]) || [];
        
        if (savedMessages.length === 0) {
          // Sem greeting - preserva apenas mensagens otimistas do usuário
          setMessages(prev => prev.filter(msg => msg.role === "user"));
        } else {
          // Garante que todas as mensagens tenham timestamp e sanitiza conteúdo
          const messagesWithTimestamp = savedMessages.map(msg => ({
            ...msg,
            content: msg.role === 'assistant' ? sanitizeMessageContent(msg.content || '') : msg.content,
            timestamp: msg.timestamp || ''
          }));
          
          // Preserva mensagens otimistas que ainda não foram salvas no banco
          setMessages(prev => {
            const optimisticUserMessages = prev.filter(
              msg => msg.role === "user" && 
              !savedMessages.some(saved => saved.content === msg.content)
            );
            if (optimisticUserMessages.length > 0) {
              return [...messagesWithTimestamp, ...optimisticUserMessages];
            }
            return messagesWithTimestamp;
          });
          
          // Check for report markers in history AND reconstruct tracker state
          for (const msg of savedMessages) {
            const urbanMatch = msg.content?.match(/\[REPORT_CREATED:([a-f0-9-]+)\]/);
            if (urbanMatch) {
              setCreatedReport({ type: 'urban_report', id: urbanMatch[1] });
              
              // CRITICAL: Reconstruct tracker state from the success message
              // This ensures tracker persists after navigation away and back
              setCollectionType('urban_report');
              
              const reconstructedFields: CollectedFields = {};
              
              // Parse category
              const catMatch = msg.content?.match(/Categoria:\*?\*?\s*([^\n•\*]+)/i);
              if (catMatch) {
                reconstructedFields.category = catMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
              }
              
              // Parse description (from previous user message or summary)
              const descMatch = msg.content?.match(/Descrição:\*?\*?\s*([^\n•\*]+)/i);
              if (descMatch) {
                reconstructedFields.description = descMatch[1].trim();
              }
              
              // Parse address fields
              const ruaMatch = msg.content?.match(/Rua:\*?\*?\s*([^\n•\*]+)/i);
              if (ruaMatch) reconstructedFields.street = ruaMatch[1].trim();
              
              const bairroMatch = msg.content?.match(/Bairro:\*?\*?\s*([^\n•\*]+)/i);
              if (bairroMatch) reconstructedFields.neighborhood = bairroMatch[1].trim();
              
              const cepMatch = msg.content?.match(/CEP:\*?\*?\s*(\d{5}-?\d{3})/i);
              if (cepMatch) reconstructedFields.cep = cepMatch[1].replace('-', '');
              
              const numMatch = msg.content?.match(/Número:\*?\*?\s*([^\n•\*]+)/i);
              if (numMatch) reconstructedFields.street_number = numMatch[1].trim();
              
              // Parse risk fields
              const riskMatch = msg.content?.match(/Nível de risco:\*?\*?\s*(\w+)/i);
              if (riskMatch) {
                const riskMap: Record<string, string> = {
                  'crítico': 'critical', 'critico': 'critical',
                  'moderado': 'moderate', 'baixo': 'low', 'nenhum': 'none'
                };
                reconstructedFields.risk_level = riskMap[riskMatch[1].toLowerCase()] || riskMatch[1];
              }
              
              const scopeMatch = msg.content?.match(/Escopo[^:]*:\*?\*?\s*([^\n•\*]+)/i);
              if (scopeMatch) {
                const scopeMap: Record<string, string> = {
                  'bairro todo': 'neighborhood', 'bairro': 'neighborhood',
                  'rua toda': 'street', 'rua': 'street',
                  'apenas eu': 'individual', 'zona': 'zone', 'cidade': 'city'
                };
                const scopeKey = scopeMatch[1].toLowerCase().trim();
                reconstructedFields.affected_scope = scopeMap[scopeKey] || scopeKey;
              }
              
              console.log('[useUnifiedAIChat] Reconstructed tracker from history:', reconstructedFields);
              setCollectedFields(reconstructedFields);
              break;
            }
            const transportMatch = msg.content?.match(/\[TRANSPORT_CREATED:([a-f0-9-]+)\]/);
            if (transportMatch) {
              setCreatedReport({ type: 'transport', id: transportMatch[1] });
              setCollectionType('transport_report');
              
              // Reconstruct transport tracker from agent summary
              const reconstructedFields: CollectedFields = {};
              
              // Parse report type
              const tipoMatch = msg.content?.match(/Tipo:\*?\*?\s*([^\n•\*]+)/i);
              if (tipoMatch) reconstructedFields.report_type = tipoMatch[1].trim();
              
              // Parse line
              const linhaMatch = msg.content?.match(/Linha:\*?\*?\s*([^\n•\*]+)/i);
              if (linhaMatch) reconstructedFields.line_code = linhaMatch[1].trim();
              
              // Parse date/time
              const dataMatch = msg.content?.match(/Data:\*?\*?\s*([^\n•\*]+)/i);
              if (dataMatch) reconstructedFields.occurrence_date = dataMatch[1].trim();
              
              const horaMatch = msg.content?.match(/Horário:\*?\*?\s*([^\n•\*]+)/i);
              if (horaMatch) reconstructedFields.occurrence_time = horaMatch[1].trim();
              
              // Parse description
              const descMatch = msg.content?.match(/Descrição:\*?\*?\s*([^\n•\*]+)/i);
              if (descMatch) reconstructedFields.description = descMatch[1].trim();
              
              // Parse severity
              const sevMatch = msg.content?.match(/Gravidade:\*?\*?\s*(\w+)/i);
              if (sevMatch) {
                const sevMap: Record<string, string> = {
                  'alta': 'high', 'crítica': 'critical', 'critica': 'critical',
                  'média': 'medium', 'media': 'medium', 'moderada': 'moderate',
                  'baixa': 'low'
                };
                reconstructedFields.severity = sevMap[sevMatch[1].toLowerCase()] || sevMatch[1];
              }
              
              // Parse location
              const localMatch = msg.content?.match(/Local:\*?\*?\s*([^\n•\*]+)/i);
              if (localMatch) reconstructedFields.location = localMatch[1].trim();
              
              console.log('[useUnifiedAIChat] Reconstructed transport tracker:', reconstructedFields);
              setCollectedFields(reconstructedFields);
              break;
            }
            const ratingMatch = msg.content?.match(/\[RATING_CREATED:([a-f0-9-]+)\]/);
            if (ratingMatch) {
              setCreatedReport({ type: 'rating', id: ratingMatch[1] });
              setCollectionType('service_rating');
              
              // Reconstruct service rating tracker from agent summary
              const reconstructedFields: CollectedFields = {};
              
              // Parse service type
              const tipoMatch = msg.content?.match(/Tipo:\*?\*?\s*([^\n•\*]+)/i);
              if (tipoMatch) {
                const typeMap: Record<string, string> = {
                  'ubs': 'ubs', 'posto de saúde': 'ubs', 'unidade básica': 'ubs',
                  'escola': 'school', 'emef': 'school', 'emei': 'school',
                  'ceu': 'ceu', 'hospital': 'hospital',
                  'biblioteca': 'library', 'centro esportivo': 'sports_center'
                };
                const typeKey = tipoMatch[1].toLowerCase().trim();
                reconstructedFields.service_type = typeMap[typeKey] || tipoMatch[1].trim();
              }
              
              // Parse service name
              const nomeMatch = msg.content?.match(/Serviço:\*?\*?\s*([^\n•\*]+)/i);
              if (nomeMatch) reconstructedFields.service_name = nomeMatch[1].trim();
              
              // Parse neighborhood
              const bairroMatch = msg.content?.match(/Bairro:\*?\*?\s*([^\n•\*]+)/i);
              if (bairroMatch) reconstructedFields.service_neighborhood = bairroMatch[1].trim();
              
              // Parse rating (stars)
              const notaMatch = msg.content?.match(/Nota:\*?\*?\s*(\d)/i);
              if (notaMatch) reconstructedFields.rating_stars = parseInt(notaMatch[1]);
              
              // Parse comment
              const comentarioMatch = msg.content?.match(/Comentário:\*?\*?\s*([^\n•\*]+)/i);
              if (comentarioMatch) reconstructedFields.rating_text = comentarioMatch[1].trim();
              
              console.log('[useUnifiedAIChat] Reconstructed rating tracker:', reconstructedFields);
              setCollectedFields(reconstructedFields);
              break;
            }
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      } finally {
        setIsHistoryLoaded(true);
      }
    };

    loadConversationMessages();
  }, [conversationId, user?.id]);

  const clearCreatedReport = useCallback(() => {
    setCreatedReport(null);
  }, []);

  // Adiciona mensagem do usuário de forma otimista (antes da conversa ser criada)
  const addOptimisticMessage = useCallback((content: string) => {
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };
    setMessages([userMessage]);
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    // Heurísticas de UI: quando o assistente faz perguntas estruturadas, atualizamos o tracker
    // imediatamente no envio do usuário (sem depender de marcadores do backend).
    if (collectionType === 'urban_report') {
      const lastAssistantText = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
      const lastAssistantLower = lastAssistantText.toLowerCase();
      const raw = content.trim();
      const rawLower = raw.toLowerCase();

      // 0) Detect Address Picker structured address (from Google Places or CEP)
      // Parse different formats: "Endereço selecionado: Rua X - Bairro, Cidade - CEP: 00000-000"
      // Or simpler: "Endereço selecionado: Rua X - Bairro, Cidade"
      if (rawLower.includes('endereço selecionado:')) {
        const newFields: CollectedFields = {};
        
        // Extract street (before first " - ")
        const streetMatch = raw.match(/Endereço selecionado:\s*([^-\n]+)/i);
        if (streetMatch?.[1]?.trim()) {
          newFields.street = streetMatch[1].trim();
        }
        
        // Extract neighborhood (after first " - ", before comma or " - CEP")
        const neighborhoodMatch = raw.match(/-\s*([^,\n]+?)(?:,|\s+-\s+CEP)/i);
        if (neighborhoodMatch?.[1]?.trim()) {
          newFields.neighborhood = neighborhoodMatch[1].trim();
        }
        
        // Extract CEP if present
        const cepMatch = raw.match(/CEP:\s*(\d{5}-?\d{3})/i);
        if (cepMatch?.[1]) {
          newFields.cep = cepMatch[1].replace('-', '');
        }
        
        if (Object.keys(newFields).length > 0) {
          console.log('[useUnifiedAIChat] Parsed address from picker:', newFields);
          setCollectedFields(prev => ({ ...prev, ...newFields }));
        }
      }
      
      // 0.5) Categoria - detecta confirmação de feedback ou classificação na conversa
      if (!collectedFields.category) {
        // Detecta quando IA oferece registrar como feedback e usuário aceita
        const isOfferingFeedback = lastAssistantLower.includes('registrar') && 
                                   (lastAssistantLower.includes('feedback') || 
                                    lastAssistantLower.includes('preocupação') || 
                                    lastAssistantLower.includes('câmara'));
        const userAccepts = rawLower.includes('sim') || rawLower.includes('desejo') || 
                           rawLower.includes('quero') || rawLower.includes('pode') || 
                           rawLower.includes('ok') || rawLower.includes('aceito');
        
        if (isOfferingFeedback && userAccepts) {
          setCollectedFields(prev => ({ ...prev, category: 'feedback_camara' }));
        }
        
        // Detecta quando IA confirma categoria via texto
        const categoryConfirmPatterns = [
          { pattern: /problema de \*?\*?ilumina[çc][ãa]o\*?\*?/i, category: 'iluminacao' },
          { pattern: /problema de \*?\*?via p[úu]blica\*?\*?/i, category: 'via_publica' },
          { pattern: /problema de \*?\*?cal[çc]ada\*?\*?/i, category: 'calcada' },
          { pattern: /problema de \*?\*?lixo\*?\*?/i, category: 'lixo' },
          { pattern: /problema de \*?\*?esgoto\*?\*?/i, category: 'esgoto' },
          { pattern: /problema de \*?\*?[áa]rea verde\*?\*?/i, category: 'area_verde' },
          { pattern: /feedback.*c[âa]mara/i, category: 'feedback_camara' },
          { pattern: /registrar.*preocupa[çc][ãa]o.*c[âa]mara/i, category: 'feedback_camara' },
          { pattern: /registrar como feedback/i, category: 'feedback_camara' },
        ];
        
        for (const { pattern, category } of categoryConfirmPatterns) {
          if (pattern.test(lastAssistantText)) {
            setCollectedFields(prev => ({ ...prev, category }));
            break;
          }
        }
      }

      // 1) Número / Referência
      if (!collectedFields.street_number) {
        const askedForNumber = /\bn[úu]mero\b/i.test(lastAssistantText);
        if (askedForNumber) {
          const numberMatch = raw.match(/^(\d+[A-Za-z]?|s\/?n|sem\s*n[úu]mero)$/i) || raw.match(/^(\d+)\b/);
          if (numberMatch) {
            const extracted = (numberMatch[1] || numberMatch[0] || raw).toUpperCase();
            setCollectedFields(prev => ({ ...prev, street_number: extracted }));
          } else if (!collectedFields.reference_point && raw.length > 0) {
            // Se não for número, mas a pergunta foi "número ou ponto de referência", marca referência.
            if (lastAssistantLower.includes('ponto de referência') || lastAssistantLower.includes('referência')) {
              setCollectedFields(prev => ({ ...prev, reference_point: raw }));
            }
          }
        }
      }

      // 2) Risco (impacto) - Heurística expandida para detectar respostas variadas
      if (!collectedFields.risk_level) {
        const askedForRisk = 
          lastAssistantLower.includes('risco imediato') || 
          lastAssistantLower.includes('risco') ||
          lastAssistantLower.includes('perigo') ||
          lastAssistantLower.includes('gravidade') ||
          lastAssistantLower.includes('urgên') ||
          /\balgum\s+risco\b/i.test(lastAssistantText);
          
        if (askedForRisk && raw.length > 0) {
          let risk_level: string | null = null;
          const risk_types: string[] = [];

          // Detecção de negação
          if (rawLower.includes('sem risco') || rawLower.includes('não tem risco') || rawLower.includes('nenhum risco')) {
            risk_level = 'none';
          } 
          // Crítico - palavras de alta urgência
          else if (
            rawLower.includes('fios') || rawLower.includes('choque') || rawLower.includes('incênd') || rawLower.includes('fogo') ||
            rawLower.includes('alag') || rawLower.includes('inund') || rawLower.includes('desab') || rawLower.includes('desmor') ||
            rawLower.includes('bloqueada') || rawLower.includes('bloqueado') || rawLower.includes('não passa') || rawLower.includes('nao passa') ||
            rawLower.includes('urgente') || rawLower.includes('emergência') || rawLower.includes('emergencia') ||
            rawLower.includes('crítico') || rawLower.includes('muito perigoso') || rawLower.includes('grave')
          ) {
            risk_level = 'critical';
            if (rawLower.includes('fios') || rawLower.includes('choque') || rawLower.includes('elétric')) risk_types.push('electrical');
            if (rawLower.includes('alag') || rawLower.includes('inund')) risk_types.push('flooding');
            if (rawLower.includes('desab') || rawLower.includes('desmor') || rawLower.includes('estrutur')) risk_types.push('structural');
            if (rawLower.includes('incênd') || rawLower.includes('fogo')) risk_types.push('fire');
            if (rawLower.includes('trânsit') || rawLower.includes('bloqu') || rawLower.includes('passa')) risk_types.push('traffic');
          } 
          // Moderado - problemas de trânsito e acidentes
          else if (rawLower.includes('acident') || rawLower.includes('trânsit') || rawLower.includes('transit') || rawLower.includes('lento')) {
            risk_level = 'moderate';
            risk_types.push('traffic');
          } 
          // Baixo - incômodos
          else if (rawLower.includes('incômod') || rawLower.includes('desconfort') || rawLower.includes('pouco')) {
            risk_level = 'low';
          }
          // Resposta afirmativa simples ("sim", "sim, o trânsito está lento")
          else if (rawLower.match(/^sim\b/)) {
            // Se a resposta começa com "sim" para pergunta de risco
            if (rawLower.includes('trânsit') || rawLower.includes('bloqu') || rawLower.includes('passage')) {
              risk_level = 'critical';
              risk_types.push('traffic');
            } else {
              // Assumir moderado para respostas afirmativas genéricas
              risk_level = 'moderate';
            }
          }

          if (risk_level) {
            setCollectedFields(prev => ({
              ...prev,
              risk_level,
              ...(risk_types.length ? { risk_types } : {}),
            }));
          }
        }
      }

      // 3) Afetação / Escopo
      if (!collectedFields.affected_scope) {
        const askedForScope = lastAssistantLower.includes('isso está afetando') || lastAssistantLower.includes('toda a rua') || lastAssistantLower.includes('bairro todo') || lastAssistantLower.includes('[field_request:affected_scope]');
        if (askedForScope && raw.length > 0) {
          let affected_scope: string | null = null;
          if (rawLower.includes('só eu') || rawLower.includes('apenas eu') || rawLower.includes('somente eu')) affected_scope = 'individual';
          else if (rawLower.includes('rua')) affected_scope = 'street';
          else if (rawLower.includes('bairro')) affected_scope = 'neighborhood';
          else if (rawLower.includes('zona')) affected_scope = 'zone';
          else if (rawLower.includes('cidade')) affected_scope = 'city';

          if (affected_scope) {
            setCollectedFields(prev => ({ ...prev, affected_scope }));
          }
        }
      }
      
      // 4) Descrição - detecta resposta a pedido de detalhes OU primeira mensagem longa
      if (!collectedFields.description) {
        const askedForDescription = 
          lastAssistantLower.includes('me conte mais') || 
          lastAssistantLower.includes('descreva') ||
          lastAssistantLower.includes('mais detalhes') ||
          lastAssistantLower.includes('o que está acontecendo') ||
          lastAssistantLower.includes('qual o problema') ||
          lastAssistantLower.includes('[field_request:description]');
          
        if (askedForDescription && raw.length >= 30) {
          setCollectedFields(prev => ({ ...prev, description: raw }));
        }
        
        // Detect description from first/second user message if long enough
        const userMsgCount = messages.filter(m => m.role === 'user').length;
        if (userMsgCount <= 2 && raw.length >= 30 && !rawLower.includes('endereço selecionado:')) {
          // Not a structured address and long enough = likely description
          setCollectedFields(prev => ({ ...prev, description: raw }));
        }
      }
    }
    
    // === HEURÍSTICAS PARA TRANSPORTE ===
    if (collectionType === 'transport_report') {
      const lastAssistantText = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
      const lastAssistantLower = lastAssistantText.toLowerCase();
      const raw = content.trim();
      const rawLower = raw.toLowerCase();
      
      // Detectar tipo de problema
      if (!collectedFields.report_type) {
        const problemTypes: Record<string, string> = {
          'atraso': 'delay', 'atrasado': 'delay', 'demora': 'delay', 'demorou': 'delay',
          'lotado': 'overcrowding', 'lotação': 'overcrowding', 'cheio': 'overcrowding',
          'quebrado': 'breakdown', 'quebrou': 'breakdown', 'pane': 'breakdown',
          'sujo': 'cleanliness', 'sujeira': 'cleanliness', 'limpeza': 'cleanliness',
          'inseguro': 'safety', 'assalto': 'safety', 'perigoso': 'safety'
        };
        for (const [keyword, type] of Object.entries(problemTypes)) {
          if (rawLower.includes(keyword)) {
            setCollectedFields(prev => ({ ...prev, report_type: type }));
            break;
          }
        }
      }
      
      // Detectar linha de ônibus/metrô
      if (!collectedFields.line_code) {
        const lineMatch = raw.match(/\b(\d{3,4}[A-Za-z]?-?\d*|[A-Z]{1,3}\d{1,2})\b/i);
        if (lineMatch) {
          setCollectedFields(prev => ({ ...prev, line_code: lineMatch[1].toUpperCase() }));
        }
      }
      
      // Detectar data (hoje, ontem, ou data específica)
      if (!collectedFields.occurrence_date) {
        if (rawLower.includes('hoje')) {
          setCollectedFields(prev => ({ ...prev, occurrence_date: new Date().toISOString().split('T')[0] }));
        } else if (rawLower.includes('ontem')) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          setCollectedFields(prev => ({ ...prev, occurrence_date: yesterday.toISOString().split('T')[0] }));
        }
      }
      
      // Detectar horário
      if (!collectedFields.occurrence_time) {
        const timeMatch = raw.match(/\b(\d{1,2})[h:](\d{2})?\b/i);
        if (timeMatch) {
          const hour = timeMatch[1].padStart(2, '0');
          const minute = timeMatch[2] || '00';
          setCollectedFields(prev => ({ ...prev, occurrence_time: `${hour}:${minute}` }));
        }
      }
      
      // Detectar descrição (mensagem longa)
      if (!collectedFields.description && raw.length >= 30) {
        const askedForDescription = 
          lastAssistantLower.includes('descreva') ||
          lastAssistantLower.includes('me conte') ||
          lastAssistantLower.includes('detalhes') ||
          lastAssistantLower.includes('[field_request:description]');
        if (askedForDescription || messages.filter(m => m.role === 'user').length <= 2) {
          setCollectedFields(prev => ({ ...prev, description: raw }));
        }
      }
    }
    
    // === HEURÍSTICAS PARA AVALIAÇÃO ===
    if (collectionType === 'service_rating') {
      const lastAssistantText = [...messages].reverse().find(m => m.role === 'assistant')?.content || '';
      const lastAssistantLower = lastAssistantText.toLowerCase();
      const raw = content.trim();
      const rawLower = raw.toLowerCase();
      
      // Detectar tipo de serviço
      if (!collectedFields.service_type) {
        const serviceTypes: Record<string, string> = {
          'ubs': 'ubs', 'posto de saúde': 'ubs', 'posto': 'ubs', 'unidade básica': 'ubs',
          'escola': 'school', 'emef': 'school', 'emei': 'school',
          'ceu': 'ceu', 'hospital': 'hospital',
          'biblioteca': 'library', 'centro esportivo': 'sports_center'
        };
        for (const [keyword, type] of Object.entries(serviceTypes)) {
          if (rawLower.includes(keyword)) {
            setCollectedFields(prev => ({ ...prev, service_type: type }));
            break;
          }
        }
      }
      
      // Detectar nota (1-5 estrelas)
      if (!collectedFields.rating_stars) {
        const starsMatch = raw.match(/(\d)\s*(estrela|nota|ponto)/i);
        if (starsMatch) {
          const stars = parseInt(starsMatch[1]);
          if (stars >= 1 && stars <= 5) {
            setCollectedFields(prev => ({ ...prev, rating_stars: stars }));
          }
        }
        // Também detectar números isolados quando perguntado sobre nota
        if (lastAssistantLower.includes('nota') || lastAssistantLower.includes('estrela')) {
          const numMatch = raw.match(/^(\d)$/);
          if (numMatch) {
            const stars = parseInt(numMatch[1]);
            if (stars >= 1 && stars <= 5) {
              setCollectedFields(prev => ({ ...prev, rating_stars: stars }));
            }
          }
        }
      }
      
      // Detectar nome do serviço
      if (!collectedFields.service_name && lastAssistantLower.includes('qual') && 
          (lastAssistantLower.includes('nome') || lastAssistantLower.includes('unidade') || lastAssistantLower.includes('serviço'))) {
        if (raw.length >= 3) {
          setCollectedFields(prev => ({ ...prev, service_name: raw }));
        }
      }
      
      // Detectar comentário (mensagem longa)
      if (!collectedFields.rating_text && raw.length >= 20) {
        const askedForComment = 
          lastAssistantLower.includes('comentário') ||
          lastAssistantLower.includes('descreva') ||
          lastAssistantLower.includes('experiência') ||
          lastAssistantLower.includes('[field_request:rating_text]');
        if (askedForComment) {
          setCollectedFields(prev => ({ ...prev, rating_text: raw }));
        }
      }
    }

    // Verifica se já existe uma mensagem otimista com o mesmo conteúdo
    const hasOptimisticMessage = messages.some(
      msg => msg.role === "user" && msg.content === content
    );

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Só adiciona se não houver mensagem otimista
    if (!hasOptimisticMessage) {
      setMessages((prev) => [...prev, userMessage]);
    }
    setIsLoading(true);

    // Save user message to database
    if (conversationIdRef.current && user) {
      try {
        const { data: currentConv } = await supabase
          .from('ai_conversations')
          .select('messages, title')
          .eq('id', conversationIdRef.current)
          .single();

        if (currentConv) {
          const updatedMessages = [...((currentConv.messages as any[]) || []), userMessage];
          
          await supabase
            .from('ai_conversations')
            .update({
              messages: updatedMessages,
              last_message_at: new Date().toISOString(),
              title: currentConv.title || content.slice(0, 50),
            })
            .eq('id', conversationIdRef.current);
        }
      } catch (error) {
        console.error('Error saving user message:', error);
      }
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const payload = {
        messages: [...messages, userMessage].map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        conversationId: conversationIdRef.current,
      };

      // Always call the unified orchestrator
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-orchestrator`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          toast({
            title: "Limite de uso atingido",
            description: "Aguarde um momento antes de tentar novamente.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        if (response.status === 402) {
          toast({
            title: "Créditos insuficientes",
            description: "Adicione créditos ao workspace para continuar.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        throw new Error("Erro ao processar mensagem");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = "";
      let assistantMessageId = crypto.randomUUID();
      let textBuffer = "";

      if (!reader) throw new Error("No response body");

      const processSSELine = (line: string) => {
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") return;
        if (!line.startsWith("data: ")) return;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") return;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;

          if (content) {
            assistantMessage += content;
            
            // Check for collection progress markers (robust parsing)
            const progressRegex = /\[COLLECTION_PROGRESS:(\w+):(\{[^\]]*\})\]/g;
            let progressMatch;
            while ((progressMatch = progressRegex.exec(assistantMessage)) !== null) {
              const type = progressMatch[1] as CollectionType;
              try {
                const fields = JSON.parse(progressMatch[2]);
                console.log('[useUnifiedAIChat] Collection progress detected:', type, fields);
                setCollectionType(type);
                setCollectedFields(prev => ({ ...prev, ...fields }));
              } catch (e) {
                console.warn('[useUnifiedAIChat] Failed to parse collection progress:', progressMatch[2], e);
              }
            }
            
            // FIELD_REQUEST markers are primarily used by the backend for deterministic parsing.
            // The UI tracker updates via COLLECTION_PROGRESS and local heuristics on user send.

            // Check for report markers
            // Check for report markers - sync final fields from agent summary, then mark as created
            const urbanMatch = assistantMessage.match(/\[REPORT_CREATED:([a-f0-9-]+)\]/);
            if (urbanMatch && !createdReport) {
              // CRITICAL: Parse final fields from agent success message to sync tracker
              const finalFields: Record<string, unknown> = { ...collectedFields };
              
              // Extract risk level from summary
              const riskMatch = assistantMessage.match(/Nível de risco:\*?\*?\s*(\w+)/i);
              if (riskMatch) {
                const riskMap: Record<string, string> = {
                  'crítico': 'critical', 'critico': 'critical',
                  'moderado': 'moderate',
                  'baixo': 'low',
                  'nenhum': 'none'
                };
                finalFields.risk_level = riskMap[riskMatch[1].toLowerCase()] || riskMatch[1];
              }
              
              // Extract scope from summary
              const scopeMatch = assistantMessage.match(/Escopo[^:]*:\*?\*?\s*([^\n•\*]+)/i);
              if (scopeMatch) {
                const scopeMap: Record<string, string> = {
                  'bairro todo': 'neighborhood', 'bairro': 'neighborhood',
                  'rua toda': 'street', 'rua': 'street',
                  'apenas eu': 'individual', 'individual': 'individual',
                  'zona': 'zone', 'cidade': 'city'
                };
                const scopeKey = scopeMatch[1].toLowerCase().trim();
                finalFields.affected_scope = scopeMap[scopeKey] || scopeKey;
              }
              
              // Extract category from summary if present
              const catMatch = assistantMessage.match(/Categoria:\*?\*?\s*([^\n•\*]+)/i);
              if (catMatch && !finalFields.category) {
                finalFields.category = catMatch[1].trim().toLowerCase().replace(/\s+/g, '_');
              }
              
              // Update tracker with final fields before marking as created
              setCollectedFields(finalFields);
              
              setCreatedReport({ type: 'urban_report', id: urbanMatch[1] });
              // DO NOT clear sessionStorage - tracker should remain visible after navigation
              // The tracker serves as a "receipt" showing collected data
            }
            
            const transportMatch = assistantMessage.match(/\[TRANSPORT_CREATED:([a-f0-9-]+)\]/);
            if (transportMatch && !createdReport) {
              // Sync final fields from agent summary
              const finalFields: Record<string, unknown> = { ...collectedFields };
              
              const tipoMatch = assistantMessage.match(/Tipo:\*?\*?\s*([^\n•\*]+)/i);
              if (tipoMatch) finalFields.report_type = tipoMatch[1].trim();
              
              const linhaMatch = assistantMessage.match(/Linha:\*?\*?\s*([^\n•\*]+)/i);
              if (linhaMatch) finalFields.line_code = linhaMatch[1].trim();
              
              const dataMatch = assistantMessage.match(/Data:\*?\*?\s*([^\n•\*]+)/i);
              if (dataMatch) finalFields.occurrence_date = dataMatch[1].trim();
              
              const sevMatch = assistantMessage.match(/Gravidade:\*?\*?\s*(\w+)/i);
              if (sevMatch) {
                const sevMap: Record<string, string> = {
                  'alta': 'high', 'crítica': 'critical', 'critica': 'critical',
                  'média': 'medium', 'media': 'medium', 'baixa': 'low'
                };
                finalFields.severity = sevMap[sevMatch[1].toLowerCase()] || sevMatch[1];
              }
              
              setCollectedFields(finalFields);
              setCreatedReport({ type: 'transport', id: transportMatch[1] });
            }
            
            const ratingMatch = assistantMessage.match(/\[RATING_CREATED:([a-f0-9-]+)\]/);
            if (ratingMatch && !createdReport) {
              // Sync final fields from agent summary
              const finalFields: Record<string, unknown> = { ...collectedFields };
              
              const tipoMatch = assistantMessage.match(/Tipo:\*?\*?\s*([^\n•\*]+)/i);
              if (tipoMatch) {
                const typeMap: Record<string, string> = {
                  'ubs': 'ubs', 'escola': 'school', 'ceu': 'ceu',
                  'hospital': 'hospital', 'biblioteca': 'library'
                };
                const typeKey = tipoMatch[1].toLowerCase().trim();
                finalFields.service_type = typeMap[typeKey] || tipoMatch[1].trim();
              }
              
              const nomeMatch = assistantMessage.match(/Serviço:\*?\*?\s*([^\n•\*]+)/i);
              if (nomeMatch) finalFields.service_name = nomeMatch[1].trim();
              
              const notaMatch = assistantMessage.match(/Nota:\*?\*?\s*(\d)/i);
              if (notaMatch) finalFields.rating_stars = parseInt(notaMatch[1]);
              
              setCollectedFields(finalFields);
              setCreatedReport({ type: 'rating', id: ratingMatch[1] });
            }
            
            // Remove all markers from displayed message (robust regex)
            const displayMessage = assistantMessage
              .replace(/\[REPORT_CREATED:[a-f0-9-]+\]/g, '')
              .replace(/\[TRANSPORT_CREATED:[a-f0-9-]+\]/g, '')
              .replace(/\[RATING_CREATED:[a-f0-9-]+\]/g, '')
              .replace(/\[COLLECTION_PROGRESS:\w+:\{[^\]]*\}\]/g, '')
              .replace(/\[FIELD_REQUEST:\w+\]/g, '') // Remove FIELD_REQUEST markers
              .trim();
            
            setMessages((prev) => {
              const lastMsg = prev[prev.length - 1];
              if (lastMsg?.role === "assistant" && lastMsg.id === assistantMessageId) {
                return prev.slice(0, -1).concat({
                  ...lastMsg,
                  content: displayMessage,
                });
              }
              return [
                ...prev,
                {
                  id: assistantMessageId,
                  role: "assistant",
                  content: displayMessage,
                  timestamp: new Date().toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                  source: "Assistente Câmara na Mão",
                },
              ];
            });
          }

          if (parsed.conversationId) {
            conversationIdRef.current = parsed.conversationId;
          }
        } catch (e) {
          // Incomplete JSON, continue buffering
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          const line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          processSSELine(line);
        }
      }

      if (textBuffer.trim()) {
        processSSELine(textBuffer);
      }

      // Save assistant response
      if (conversationIdRef.current && user && assistantMessage) {
        try {
          const { data: currentConv } = await supabase
            .from('ai_conversations')
            .select('messages')
            .eq('id', conversationIdRef.current)
            .single();

          if (currentConv) {
            const finalAssistantMsg = {
              id: assistantMessageId,
              role: "assistant",
              content: sanitizeMessageContent(assistantMessage),
              timestamp: new Date().toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              }),
              source: "Assistente Câmara na Mão",
            };

            const updatedMessages = [...((currentConv.messages as any[]) || []), finalAssistantMsg];
            
            await supabase
              .from('ai_conversations')
              .update({
                messages: updatedMessages,
                last_message_at: new Date().toISOString(),
              })
              .eq('id', conversationIdRef.current);
          }
        } catch (error) {
          console.error('Error saving assistant message:', error);
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages, user, toast, createdReport, collectionType, collectedFields]);

  const clearMessages = useCallback((preserveCollectionType = false) => {
    setMessages([]);
    setCreatedReport(null);
    if (!preserveCollectionType) {
      setCollectionType(null);
      setCollectedFields({});
      // Clear tracker from sessionStorage
      const storageKey = getTrackerStorageKey(conversationIdRef.current);
      if (storageKey) sessionStorage.removeItem(storageKey);
    }
    conversationIdRef.current = null;
  }, []);

  const addAssistantMessage = (content: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      timestamp: new Date().toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      source: "Assistente Câmara na Mão",
    };
    setMessages((prev) => [...prev, newMessage]);
  };

  // Calculate missing required fields for current collection
  const getMissingRequiredFields = useCallback((): string[] => {
    if (!collectionType) return [];
    
    // Import would cause circular dependency, so inline the logic
    const RISK_CATEGORIES = ['via_publica', 'iluminacao', 'esgoto', 'area_verde'];
    
    const configs: Record<string, { key: string; required: boolean; requiredFor?: string[]; requiredWhen?: { field: string; values: string[] } }[]> = {
      urban_report: [
        { key: 'category', required: true },
        { key: 'description', required: true },
        { key: 'street', required: true },
        { key: 'neighborhood', required: true },
        { key: 'risk_level', required: false, requiredFor: RISK_CATEGORIES },
        { key: 'affected_scope', required: false, requiredWhen: { field: 'risk_level', values: ['critical', 'moderate'] } },
      ],
      transport_report: [
        { key: 'report_type', required: true },
        { key: 'description', required: true },
        { key: 'occurrence_date', required: true },
      ],
      service_rating: [
        { key: 'service_type', required: true },
        { key: 'service_name', required: true },
        { key: 'rating_stars', required: true },
        { key: 'rating_text', required: true },
      ]
    };
    
    const fields = configs[collectionType];
    if (!fields) return [];
    
    const category = collectedFields.category;
    const missing: string[] = [];
    
    for (const field of fields) {
      if (collectedFields[field.key]) continue;
      
      let isRequired = field.required;
      
      // Check conditional requirements (requiredFor)
      if (!isRequired && field.requiredFor && category) {
        isRequired = field.requiredFor.includes(category);
      }
      
      // Check conditional requirements (requiredWhen)
      if (!isRequired && field.requiredWhen) {
        const dependentValue = collectedFields[field.requiredWhen.field];
        if (dependentValue && field.requiredWhen.values.includes(dependentValue)) {
          isRequired = true;
        }
      }
      
      if (isRequired) {
        missing.push(field.key);
      }
    }
    
    return missing;
  }, [collectionType, collectedFields]);

  const isCollectionComplete = useMemo(() => {
    return getMissingRequiredFields().length === 0;
  }, [getMissingRequiredFields]);

  // Handle journey switch decision from UI buttons
  const handleJourneySwitchDecision = useCallback(async (
    decision: 'switch' | 'continue',
    newJourney?: string
  ) => {
    if (decision === 'switch' && newJourney) {
      // Reset current collection and start new one
      const newCollectionType = newJourney as CollectionType;
      setCollectionType(newCollectionType);
      setCollectedFields({});
      setCreatedReport(null);
      
      // Send confirmation message to continue in new journey
      await sendMessage(`Sim, quero iniciar ${newJourney === 'urban_report' ? 'Relato Urbano' : newJourney === 'transport_report' ? 'Diagnóstico de Transporte' : 'Avaliação de Serviço'}`);
    } else {
      // Continue current journey
      await sendMessage('Quero continuar o relato atual');
    }
  }, [sendMessage]);

  return {
    messages,
    isLoading,
    isHistoryLoaded,
    sendMessage,
    clearMessages,
    addAssistantMessage,
    addOptimisticMessage,
    createdReport,
    clearCreatedReport,
    collectionType,
    collectedFields,
    getMissingRequiredFields,
    isCollectionComplete,
    handleJourneySwitchDecision,
  };
};
