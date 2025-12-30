/**
 * Limpador Passivo de Service Worker
 * Remove qualquer SW existente sem forçar reloads
 */

(function() {
  'use strict';
  
  if (!('serviceWorker' in navigator)) {
    return;
  }

  // Função de limpeza passiva
  async function cleanupPWA() {
    try {
      // 1. Desregistrar todos os SWs silenciosamente
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length > 0) {
        console.log('[PWA Cleanup] Removendo ' + registrations.length + ' SW(s)...');
        
        for (const registration of registrations) {
          try {
            await registration.unregister();
          } catch (e) {
            // Ignorar erros silenciosamente
          }
        }
      }

      // 2. Limpar caches silenciosamente
      if ('caches' in window) {
        const keys = await caches.keys();
        
        if (keys.length > 0) {
          for (const key of keys) {
            try {
              await caches.delete(key);
            } catch (e) {
              // Ignorar erros silenciosamente
            }
          }
        }
      }

    } catch (err) {
      // Ignorar erros - cleanup é passivo
    }
  }

  // Executar limpeza uma vez
  cleanupPWA();

  // Listener apenas para logging (sem ação de reload)
  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SW_CLEANUP_COMPLETE') {
      console.log('[PWA Cleanup] Service Worker limpo com sucesso');
    }
  });

})();
