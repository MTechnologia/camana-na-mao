/**
 * Limpeza "nuclear" de PWA legado
 * 
 * Esta função é chamada no boot do app para:
 * 1. Limpar todos os Service Workers legados
 * 2. Limpar todas as caches
 * 3. Limpar storages (localStorage/sessionStorage/IndexedDB)
 * 4. Forçar reload se necessário
 */

// Versão da limpeza - usar BUILD_TIMESTAMP para forçar por build
declare const __BUILD_TIMESTAMP__: string;

const BUILD_TS = typeof __BUILD_TIMESTAMP__ !== 'undefined' 
  ? __BUILD_TIMESTAMP__ 
  : Date.now().toString();

const CLEANUP_VERSION = `nuclear-2.0-${BUILD_TS}`;
const CLEANUP_KEY = '__cmsp_pwa_cleanup_state__';

interface CleanupState {
  isClean: boolean;
  cleanedAt: string;
  version: string;
  buildTimestamp: string;
}

/**
 * Detecta se está rodando dentro do editor Lovable
 */
const isInLovableEditor = (): boolean => {
  try {
    const isIframe = window.self !== window.top;
    const hasEditorReferrer = document.referrer.includes('lovable.dev/projects');
    const isPreviewDomain = window.location.hostname.includes('lovable.app');
    return isIframe || hasEditorReferrer || isPreviewDomain;
  } catch {
    return false;
  }
};

const getCleanupState = (): CleanupState | null => {
  try {
    const stored = localStorage.getItem(CLEANUP_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

const setCleanupState = (state: CleanupState): void => {
  try {
    localStorage.setItem(CLEANUP_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Limpa TODOS os IndexedDB databases
 */
async function clearAllIndexedDB(): Promise<number> {
  let count = 0;
  try {
    if ('indexedDB' in window && indexedDB.databases) {
      const databases = await indexedDB.databases();
      for (const db of databases) {
        if (db.name) {
          indexedDB.deleteDatabase(db.name);
          console.info(`[PWA Cleanup] IndexedDB deletado: ${db.name}`);
          count++;
        }
      }
    }
  } catch (e) {
    console.warn('[PWA Cleanup] Erro ao limpar IndexedDB:', e);
  }
  return count;
}

/**
 * Limpa TODOS os caches da Cache API
 */
async function clearAllCaches(): Promise<number> {
  let count = 0;
  try {
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      for (const key of cacheKeys) {
        await caches.delete(key);
        console.info(`[PWA Cleanup] Cache deletado: ${key}`);
        count++;
      }
    }
  } catch (e) {
    console.warn('[PWA Cleanup] Erro ao limpar caches:', e);
  }
  return count;
}

/**
 * Desregistra TODOS os Service Workers
 */
async function unregisterAllServiceWorkers(): Promise<number> {
  let count = 0;
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.info(`[PWA Cleanup] SW desregistrado: ${registration.scope}`);
        count++;
      }
    }
  } catch (e) {
    console.warn('[PWA Cleanup] Erro ao desregistrar SWs:', e);
  }
  return count;
}

/**
 * Limpa localStorage (exceto nosso controle)
 */
function clearLocalStorage(): number {
  let count = 0;
  try {
    const keysToKeep = [CLEANUP_KEY];
    const allKeys = Object.keys(localStorage);
    
    for (const key of allKeys) {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
        count++;
      }
    }
    console.info(`[PWA Cleanup] localStorage: ${count} itens removidos`);
  } catch (e) {
    console.warn('[PWA Cleanup] Erro ao limpar localStorage:', e);
  }
  return count;
}

/**
 * Limpa sessionStorage (exceto keys específicas)
 */
function clearSessionStorage(keysToKeep: string[] = []): number {
  let count = 0;
  try {
    const allKeys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && !keysToKeep.includes(key)) {
        allKeys.push(key);
      }
    }
    allKeys.forEach(key => {
      sessionStorage.removeItem(key);
      count++;
    });
    console.info(`[PWA Cleanup] sessionStorage: ${count} itens removidos`);
  } catch (e) {
    console.warn('[PWA Cleanup] Erro ao limpar sessionStorage:', e);
  }
  return count;
}

/**
 * Executa limpeza agressiva de PWA legado
 * 
 * @returns true se vai recarregar a página (caller deve abortar renderização)
 */
export const cleanupLegacyPWA = async (): Promise<boolean> => {
  // Verificar se está em modo debug
  const isDebug = window.location.search.includes('debug');
  const isEditor = isInLovableEditor();
  
  if (isDebug) {
    console.log('[PWA Cleanup] Starting...');
    console.log('[PWA Cleanup] BUILD_TIMESTAMP:', BUILD_TS);
    console.log('[PWA Cleanup] CLEANUP_VERSION:', CLEANUP_VERSION);
    console.log('[PWA Cleanup] isInLovableEditor:', isEditor);
  }
  
  try {
    const state = getCleanupState();
    
    // Verificar se já limpou ESTA versão específica
    const alreadyCleanedThisVersion = state?.version === CLEANUP_VERSION && state?.buildTimestamp === BUILD_TS;
    
    // No editor, verificar também a sessão para evitar loops mas forçar limpeza em nova sessão
    const sessionCleanedKey = `__cmsp_session_cleaned_${BUILD_TS}__`;
    const sessionAlreadyCleaned = sessionStorage.getItem(sessionCleanedKey) === '1';
    
    if (isDebug) {
      console.log('[PWA Cleanup] State:', state);
      console.log('[PWA Cleanup] alreadyCleanedThisVersion:', alreadyCleanedThisVersion);
      console.log('[PWA Cleanup] sessionAlreadyCleaned:', sessionAlreadyCleaned);
    }
    
    // Se no editor e já limpou nesta sessão, não repetir (evita loop)
    if (isEditor && sessionAlreadyCleaned) {
      if (isDebug) console.log('[PWA Cleanup] Editor session already cleaned, skipping');
      return false;
    }
    
    // Se já limpou esta versão (em qualquer lugar), pular
    if (alreadyCleanedThisVersion && !isEditor) {
      if (isDebug) console.log('[PWA Cleanup] Already cleaned this version, skipping');
      return false;
    }
    
    console.log(`[PWA Cleanup] Executing cleanup for version ${CLEANUP_VERSION}`);
    
    // Marcar sessão como "em limpeza" para evitar loops
    sessionStorage.setItem(sessionCleanedKey, '1');
    
    // 1. Desregistrar todos os Service Workers
    const swCleared = await unregisterAllServiceWorkers();
    
    // 2. Limpar todas as caches
    const cachesCleared = await clearAllCaches();
    
    // 3. Limpar IndexedDB
    const idbCleared = await clearAllIndexedDB();
    
    // 4. Limpar sessionStorage (exceto nossa flag de sessão)
    clearSessionStorage([sessionCleanedKey]);
    
    // 5. Limpar localStorage (exceto nosso estado)
    clearLocalStorage();
    
    const anythingCleared = swCleared > 0 || cachesCleared > 0 || idbCleared > 0;
    
    console.log(`[PWA Cleanup] Results: SW=${swCleared}, Caches=${cachesCleared}, IDB=${idbCleared}`);
    
    // Salvar estado de limpeza
    setCleanupState({
      isClean: true,
      cleanedAt: new Date().toISOString(),
      version: CLEANUP_VERSION,
      buildTimestamp: BUILD_TS,
    });
    
    // Se limpou algo E não é a primeira vez nesta sessão com este build, recarregar
    // (evita loop infinito mas garante que mudanças sejam aplicadas)
    if (anythingCleared) {
      console.log('[PWA Cleanup] Data cleared, forcing hard reload...');
      
      // Forçar reload limpo
      const url = new URL(window.location.href);
      url.searchParams.set('_bust', Date.now().toString());
      
      // Pequeno delay para garantir que logs apareçam
      await new Promise(resolve => setTimeout(resolve, 100));
      
      window.location.replace(url.toString());
      return true;
    }
    
    if (isDebug) console.log('[PWA Cleanup] No data to clear, proceeding normally');
    return false;
    
  } catch (error) {
    console.error('[PWA Cleanup] Error:', error);
    return false;
  }
};

/**
 * Log de diagnóstico de PWA (melhorado para debug)
 */
export const logPWADiagnostics = async (): Promise<void> => {
  const isDebug = window.location.search.includes('debug');
  
  console.group('[PWA Diagnostics]');
  console.log('Timestamp:', new Date().toISOString());
  console.log('BUILD_TIMESTAMP:', BUILD_TS);
  console.log('CLEANUP_VERSION:', CLEANUP_VERSION);
  console.log('URL:', window.location.href);
  console.log('Referrer:', document.referrer);
  console.log('Is in iframe:', window.self !== window.top);
  console.log('Is in Lovable Editor:', isInLovableEditor());
  console.log('Cleanup State:', getCleanupState());
  
  // Service Workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('Service Workers:', registrations.length);
    registrations.forEach((reg, i) => {
      console.log(`  SW[${i}]: ${reg.scope} - active: ${!!reg.active}`);
    });
  }
  
  // Caches
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log('Caches:', cacheNames.length, cacheNames);
  }
  
  // Storage estimate
  if (navigator.storage?.estimate) {
    const estimate = await navigator.storage.estimate();
    console.log('Storage:', {
      usage: `${Math.round((estimate.usage || 0) / 1024)}KB`,
      quota: `${Math.round((estimate.quota || 0) / 1024 / 1024)}MB`,
    });
  }
  
  // localStorage keys
  console.log('localStorage keys:', Object.keys(localStorage).length);
  
  // Meta tag de build
  const buildMeta = document.querySelector('meta[name="build-timestamp"]');
  console.log('Build meta tag:', buildMeta?.getAttribute('content'));
  
  console.groupEnd();
  
  // Se debug mode, mostrar alerta visual
  if (isDebug) {
    console.log('%c[DEBUG MODE ACTIVE]', 'background: #DC0032; color: white; padding: 4px 8px; border-radius: 4px;');
  }
};

/**
 * Força limpeza nuclear (para uso manual no console)
 */
export const forceNuclearCleanup = async (): Promise<void> => {
  console.log('[PWA Cleanup] Forcing nuclear cleanup...');
  
  // Remove estado para forçar re-limpeza
  localStorage.removeItem(CLEANUP_KEY);
  
  // Limpa flags de sessão
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.includes('cmsp_session_cleaned') || key?.includes('lvb_bust')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
  
  // Executa limpeza
  await cleanupLegacyPWA();
};

// Expor funções globalmente para debug via console
if (typeof window !== 'undefined') {
  (window as any).forceNuclearCleanup = forceNuclearCleanup;
  (window as any).logPWADiagnostics = logPWADiagnostics;
  (window as any).BUILD_TIMESTAMP = BUILD_TS;
  (window as any).CLEANUP_VERSION = CLEANUP_VERSION;
}
