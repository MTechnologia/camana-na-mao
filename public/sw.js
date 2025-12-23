/**
 * Service Worker "Destruidor"
 * Este arquivo substitui qualquer SW legado e se auto-desativa
 */

// Ativar imediatamente, sem esperar
self.addEventListener('install', (event) => {
  console.log('[SW Destroyer] Instalando e ativando imediatamente...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW Destroyer] Ativado. Limpando caches e desativando...');
  
  event.waitUntil(
    (async () => {
      try {
        // Limpar todas as caches
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map(key => {
          console.log('[SW Destroyer] Deletando cache:', key);
          return caches.delete(key);
        }));

        // Tomar controle de todos os clientes
        await self.clients.claim();

        // Auto-desregistrar após limpeza
        const registration = self.registration;
        if (registration) {
          await registration.unregister();
          console.log('[SW Destroyer] Auto-desregistrado com sucesso');
        }

        // Notificar clientes para recarregar
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach(client => {
          client.postMessage({ type: 'SW_DESTROYED', action: 'reload' });
        });

      } catch (err) {
        console.error('[SW Destroyer] Erro:', err);
      }
    })()
  );
});

// Não interceptar nenhuma requisição - deixar passar direto
self.addEventListener('fetch', (event) => {
  // Não fazer nada - deixar o browser buscar normalmente
  return;
});
