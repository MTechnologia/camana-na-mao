/**
 * Service Worker "Clean Self-Destruct"
 * Este SW se auto-destrói e limpa caches SEM forçar reload
 * Versão: 3.0 - Sem reload forçado
 */

const SW_VERSION = '3.0-clean';

// Ativar imediatamente
self.addEventListener('install', (event) => {
  console.log(`[SW ${SW_VERSION}] Instalando e ativando imediatamente...`);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[SW ${SW_VERSION}] Ativado. Executando limpeza silenciosa...`);
  
  event.waitUntil(
    (async () => {
      try {
        // 1. Tomar controle de todos os clientes
        await self.clients.claim();
        console.log(`[SW ${SW_VERSION}] Controle assumido`);

        // 2. Limpar TODAS as caches
        const cacheKeys = await caches.keys();
        console.log(`[SW ${SW_VERSION}] Limpando ${cacheKeys.length} caches...`);
        await Promise.all(cacheKeys.map(key => {
          console.log(`[SW ${SW_VERSION}] Deletando cache: ${key}`);
          return caches.delete(key);
        }));

        // 3. Notificar clientes (sem pedir reload)
        const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        console.log(`[SW ${SW_VERSION}] Notificando ${clients.length} cliente(s)...`);
        
        for (const client of clients) {
          client.postMessage({ 
            type: 'SW_CLEANUP_COMPLETE', 
            version: SW_VERSION,
            timestamp: Date.now()
          });
        }

        // 4. Auto-desregistrar
        const registration = self.registration;
        if (registration) {
          const success = await registration.unregister();
          console.log(`[SW ${SW_VERSION}] Auto-desregistrado: ${success}`);
        }

        console.log(`[SW ${SW_VERSION}] Limpeza completa!`);

      } catch (err) {
        console.error(`[SW ${SW_VERSION}] Erro na limpeza:`, err);
        
        // Tentar desregistrar mesmo em caso de erro
        try {
          await self.registration.unregister();
        } catch {}
      }
    })()
  );
});

// NÃO interceptar NENHUMA requisição - deixar passar direto para a rede
self.addEventListener('fetch', (event) => {
  // Explicitamente NÃO fazer nada
  return;
});

// Listener para mensagens do cliente
self.addEventListener('message', (event) => {
  console.log(`[SW ${SW_VERSION}] Mensagem recebida:`, event.data);
  
  if (event.data === 'FORCE_UNREGISTER' || event.data?.type === 'FORCE_UNREGISTER') {
    console.log(`[SW ${SW_VERSION}] Forçando desregistro por comando...`);
    self.registration.unregister().then(() => {
      console.log(`[SW ${SW_VERSION}] Desregistrado por comando`);
    });
  }
});
