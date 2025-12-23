/**
 * Limpeza automática de Service Workers e caches legados
 * Resolve o problema de conteúdo antigo sendo servido por SW obsoletos
 */

const CLEANUP_FLAG = 'cmsp_pwa_cleanup_done';
const BUILD_VERSION = Date.now().toString(); // Timestamp da build

export async function cleanupLegacyPWA(): Promise<boolean> {
  // Evitar loop infinito de reloads
  if (sessionStorage.getItem(CLEANUP_FLAG) === 'true') {
    console.info('[CMSP] Cleanup já executado nesta sessão');
    return false;
  }

  let cleanupPerformed = false;

  try {
    // 1. Desregistrar todos os Service Workers
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length > 0) {
        console.warn(`[CMSP] Encontrados ${registrations.length} SW(s) legados. Removendo...`);
        
        for (const registration of registrations) {
          try {
            const success = await registration.unregister();
            if (success) {
              console.info(`[CMSP] SW desregistrado: ${registration.scope}`);
              cleanupPerformed = true;
            }
          } catch (err) {
            console.error('[CMSP] Erro ao desregistrar SW:', err);
          }
        }
      }
    }

    // 2. Limpar todas as caches
    if ('caches' in window) {
      const cacheKeys = await caches.keys();
      
      if (cacheKeys.length > 0) {
        console.warn(`[CMSP] Encontradas ${cacheKeys.length} cache(s) legadas. Limpando...`);
        
        for (const key of cacheKeys) {
          try {
            const deleted = await caches.delete(key);
            if (deleted) {
              console.info(`[CMSP] Cache deletada: ${key}`);
              cleanupPerformed = true;
            }
          } catch (err) {
            console.error('[CMSP] Erro ao deletar cache:', err);
          }
        }
      }
    }

    // 3. Se limpeza foi realizada, marcar e recarregar
    if (cleanupPerformed) {
      sessionStorage.setItem(CLEANUP_FLAG, 'true');
      console.info('[CMSP] Limpeza completa. Recarregando para aplicar...');
      
      // Pequeno delay para garantir que os logs apareçam
      await new Promise(resolve => setTimeout(resolve, 100));
      
      window.location.reload();
      return true; // Indica que vai recarregar
    }

    console.info(`[CMSP] Nenhum SW/cache legado encontrado. Build: ${BUILD_VERSION}`);
    return false;

  } catch (err) {
    console.error('[CMSP] Erro durante limpeza de PWA legado:', err);
    return false;
  }
}

/**
 * Log de diagnóstico para debug
 */
export async function logPWADiagnostics(): Promise<void> {
  console.group('[CMSP] Diagnóstico PWA');
  
  try {
    // SW Controller atual
    if ('serviceWorker' in navigator) {
      const controller = navigator.serviceWorker.controller;
      console.info('SW Controller:', controller?.scriptURL || 'Nenhum');
      
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.info('SW Registrations:', registrations.length);
      registrations.forEach((reg, i) => {
        console.info(`  [${i}] Scope: ${reg.scope}, Active: ${reg.active?.state}`);
      });
    } else {
      console.info('ServiceWorker não suportado');
    }

    // Caches
    if ('caches' in window) {
      const keys = await caches.keys();
      console.info('Caches:', keys.length > 0 ? keys : 'Nenhuma');
    }

    console.info('Build Version:', BUILD_VERSION);
    
  } catch (err) {
    console.error('Erro no diagnóstico:', err);
  }
  
  console.groupEnd();
}
