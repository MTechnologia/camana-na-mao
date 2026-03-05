/**
 * Limpeza de Service Workers legados
 * 
 * Cleanup passivo e leve - apenas remove SWs antigos se existirem
 */

const CLEANUP_KEY = '__cmsp_pwa_cleanup_v2__';

/**
 * Desregistra todos os Service Workers
 */
async function unregisterServiceWorkers(): Promise<number> {
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
 * Limpa caches da Cache API
 */
async function clearCaches(): Promise<number> {
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
 * Executa limpeza de PWA legado (passiva, sem reload)
 */
export const cleanupLegacyPWA = async (): Promise<boolean> => {
  try {
    // Verificar se já limpou
    const alreadyCleaned = localStorage.getItem(CLEANUP_KEY);
    if (alreadyCleaned) {
      return false;
    }
    
    // Desregistrar SWs
    const swCleared = await unregisterServiceWorkers();
    
    // Limpar caches
    const cachesCleared = await clearCaches();
    
    if (swCleared > 0 || cachesCleared > 0) {
      console.log(`[PWA Cleanup] Limpeza concluída: SW=${swCleared}, Caches=${cachesCleared}`);
    }
    
    // Marcar como limpo
    localStorage.setItem(CLEANUP_KEY, new Date().toISOString());
    
    return false; // Nunca força reload
  } catch (error) {
    console.error('[PWA Cleanup] Error:', error);
    return false;
  }
};

/**
 * Log de diagnóstico básico
 */
export const logPWADiagnostics = async (): Promise<void> => {
  console.group('[PWA Diagnostics]');
  console.log('Timestamp:', new Date().toISOString());
  
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('Service Workers:', registrations.length);
  }
  
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    console.log('Caches:', cacheNames.length, cacheNames);
  }
  
  console.groupEnd();
};

/**
 * Força limpeza (para uso manual no console)
 * Retorna true se limpou algo, caller decide se quer reload
 */
export const forceNuclearCleanup = async (): Promise<boolean> => {
  localStorage.removeItem(CLEANUP_KEY);
  const swCleared = await unregisterServiceWorkers();
  const cachesCleared = await clearCaches();
  return swCleared > 0 || cachesCleared > 0;
};

// Expor para debug via console
if (typeof window !== 'undefined') {
  const w = window as unknown as { forceNuclearCleanup?: typeof forceNuclearCleanup; logPWADiagnostics?: typeof logPWADiagnostics };
  w.forceNuclearCleanup = forceNuclearCleanup;
  w.logPWADiagnostics = logPWADiagnostics;
}
