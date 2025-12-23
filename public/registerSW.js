/**
 * Desinstalador de Service Worker
 * Substitui o registerSW.js legado e remove qualquer SW existente
 */

(function() {
  'use strict';
  
  console.log('[RegisterSW Destroyer] Iniciando limpeza de PWA legado...');

  if (!('serviceWorker' in navigator)) {
    console.log('[RegisterSW Destroyer] ServiceWorker não suportado');
    return;
  }

  // Função principal de limpeza
  async function cleanupPWA() {
    try {
      // 1. Desregistrar todos os SWs
      const registrations = await navigator.serviceWorker.getRegistrations();
      
      if (registrations.length > 0) {
        console.log('[RegisterSW Destroyer] Encontrados ' + registrations.length + ' SW(s). Removendo...');
        
        for (const registration of registrations) {
          try {
            await registration.unregister();
            console.log('[RegisterSW Destroyer] SW desregistrado:', registration.scope);
          } catch (e) {
            console.error('[RegisterSW Destroyer] Erro ao desregistrar:', e);
          }
        }
      }

      // 2. Limpar caches
      if ('caches' in window) {
        const keys = await caches.keys();
        
        if (keys.length > 0) {
          console.log('[RegisterSW Destroyer] Limpando ' + keys.length + ' cache(s)...');
          
          for (const key of keys) {
            try {
              await caches.delete(key);
              console.log('[RegisterSW Destroyer] Cache deletada:', key);
            } catch (e) {
              console.error('[RegisterSW Destroyer] Erro ao deletar cache:', e);
            }
          }
        }
      }

      console.log('[RegisterSW Destroyer] Limpeza completa');

    } catch (err) {
      console.error('[RegisterSW Destroyer] Erro geral:', err);
    }
  }

  // Executar limpeza
  cleanupPWA();

  // Listener para mensagens do SW destruidor
  navigator.serviceWorker.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SW_DESTROYED') {
      console.log('[RegisterSW Destroyer] Recebido sinal de SW destruído');
      // Não recarregar automaticamente aqui - deixar o main.tsx controlar
    }
  });

})();
