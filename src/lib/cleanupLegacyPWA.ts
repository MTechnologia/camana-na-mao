/**
 * LIMPEZA AGRESSIVA DE PWA LEGADO
 * Versão "nuclear" - remove TUDO que pode estar cacheado
 */

const CLEANUP_VERSION = '2.0.0'; // Incrementar para forçar nova limpeza
const CLEANUP_KEY = 'cmsp_nuclear_cleanup';
const BUILD_TIMESTAMP = typeof __BUILD_TIMESTAMP__ !== 'undefined' ? __BUILD_TIMESTAMP__ : Date.now().toString();

// Declare global for TypeScript
declare const __BUILD_TIMESTAMP__: string;

interface CleanupState {
  version: string;
  timestamp: string;
  completed: boolean;
}

function getCleanupState(): CleanupState | null {
  try {
    const stored = localStorage.getItem(CLEANUP_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function setCleanupState(state: CleanupState): void {
  try {
    localStorage.setItem(CLEANUP_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('[CMSP Nuclear] Erro ao salvar estado:', e);
  }
}

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
          console.info(`[CMSP Nuclear] IndexedDB deletado: ${db.name}`);
          count++;
        }
      }
    }
  } catch (e) {
    console.warn('[CMSP Nuclear] Erro ao limpar IndexedDB:', e);
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
        console.info(`[CMSP Nuclear] Cache deletado: ${key}`);
        count++;
      }
    }
  } catch (e) {
    console.warn('[CMSP Nuclear] Erro ao limpar caches:', e);
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
        console.info(`[CMSP Nuclear] SW desregistrado: ${registration.scope}`);
        count++;
      }
    }
  } catch (e) {
    console.warn('[CMSP Nuclear] Erro ao desregistrar SWs:', e);
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
    console.info(`[CMSP Nuclear] localStorage: ${count} itens removidos`);
  } catch (e) {
    console.warn('[CMSP Nuclear] Erro ao limpar localStorage:', e);
  }
  return count;
}

/**
 * Limpa sessionStorage
 */
function clearSessionStorage(): number {
  let count = 0;
  try {
    count = sessionStorage.length;
    sessionStorage.clear();
    console.info(`[CMSP Nuclear] sessionStorage: ${count} itens removidos`);
  } catch (e) {
    console.warn('[CMSP Nuclear] Erro ao limpar sessionStorage:', e);
  }
  return count;
}

/**
 * Força reload com bypass de cache completo
 */
function forceHardReload(): void {
  console.info('[CMSP Nuclear] Forçando hard reload...');
  
  // Adicionar query param único para garantir novo download
  const url = new URL(window.location.href);
  url.searchParams.set('_cache_bust', Date.now().toString());
  
  // Tentar métodos diferentes de reload
  try {
    // Método 1: location.replace com cache bust
    window.location.replace(url.toString());
  } catch {
    // Método 2: location.href
    window.location.href = url.toString();
  }
}

/**
 * Execução principal da limpeza nuclear
 */
export async function cleanupLegacyPWA(): Promise<boolean> {
  console.group('[CMSP Nuclear] Iniciando limpeza agressiva...');
  console.info('Build:', BUILD_TIMESTAMP);
  console.info('Cleanup Version:', CLEANUP_VERSION);
  
  // Verificar se já limpamos nesta versão
  const state = getCleanupState();
  if (state?.version === CLEANUP_VERSION && state?.completed) {
    console.info('Limpeza já executada nesta versão. Pulando...');
    console.groupEnd();
    return false;
  }
  
  let totalCleaned = 0;
  
  try {
    // 1. Desregistrar todos os Service Workers
    const swCount = await unregisterAllServiceWorkers();
    totalCleaned += swCount;
    
    // 2. Limpar todos os caches
    const cacheCount = await clearAllCaches();
    totalCleaned += cacheCount;
    
    // 3. Limpar IndexedDB
    const idbCount = await clearAllIndexedDB();
    totalCleaned += idbCount;
    
    // 4. Limpar sessionStorage
    const sessionCount = clearSessionStorage();
    totalCleaned += sessionCount;
    
    // 5. Limpar localStorage (exceto nosso controle)
    const localCount = clearLocalStorage();
    totalCleaned += localCount;
    
    console.info(`[CMSP Nuclear] Total de itens limpos: ${totalCleaned}`);
    
    // Se limpamos algo significativo, marcar e recarregar
    if (totalCleaned > 0) {
      setCleanupState({
        version: CLEANUP_VERSION,
        timestamp: BUILD_TIMESTAMP,
        completed: true,
      });
      
      console.info('[CMSP Nuclear] Limpeza completa! Forçando reload...');
      console.groupEnd();
      
      // Pequeno delay para garantir que logs apareçam
      await new Promise(resolve => setTimeout(resolve, 100));
      
      forceHardReload();
      return true; // Vai recarregar
    }
    
    // Se não tinha nada para limpar, marcar como completo
    setCleanupState({
      version: CLEANUP_VERSION,
      timestamp: BUILD_TIMESTAMP,
      completed: true,
    });
    
    console.info('[CMSP Nuclear] Nenhum cache legado encontrado.');
    console.groupEnd();
    return false;
    
  } catch (err) {
    console.error('[CMSP Nuclear] Erro durante limpeza:', err);
    console.groupEnd();
    return false;
  }
}

/**
 * Log de diagnóstico completo para debug
 */
export async function logPWADiagnostics(): Promise<void> {
  console.group('[CMSP] Diagnóstico PWA');
  console.info('Build Timestamp:', BUILD_TIMESTAMP);
  console.info('Cleanup Version:', CLEANUP_VERSION);
  console.info('URL:', window.location.href);
  
  try {
    // Service Worker status
    if ('serviceWorker' in navigator) {
      const controller = navigator.serviceWorker.controller;
      console.info('SW Controller:', controller?.scriptURL || 'Nenhum');
      
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.info('SW Registrations:', registrations.length);
      registrations.forEach((reg, i) => {
        console.info(`  [${i}] Scope: ${reg.scope}, Active: ${reg.active?.state}, Waiting: ${reg.waiting?.state || 'none'}`);
      });
    } else {
      console.info('ServiceWorker não suportado');
    }

    // Caches
    if ('caches' in window) {
      const keys = await caches.keys();
      console.info('Caches:', keys.length > 0 ? keys : 'Nenhuma');
    }

    // Storage
    console.info('localStorage items:', localStorage.length);
    console.info('sessionStorage items:', sessionStorage.length);
    
    // Cleanup state
    const state = getCleanupState();
    console.info('Cleanup State:', state);
    
  } catch (err) {
    console.error('Erro no diagnóstico:', err);
  }
  
  console.groupEnd();
}

/**
 * Força limpeza manual (para usar em debug/console)
 */
export async function forceNuclearCleanup(): Promise<void> {
  console.warn('[CMSP Nuclear] FORÇANDO LIMPEZA MANUAL!');
  
  // Remover estado de cleanup para forçar nova execução
  localStorage.removeItem(CLEANUP_KEY);
  
  // Executar limpeza
  await cleanupLegacyPWA();
}

// Expor no window para debug via console
if (typeof window !== 'undefined') {
  (window as any).cmspNuclearCleanup = forceNuclearCleanup;
  (window as any).cmspDiagnostics = logPWADiagnostics;
}
