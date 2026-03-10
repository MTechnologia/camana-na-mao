# Web e Mobile — Diferença entre as aplicações

## Visão geral

O **Câmara na Mão** existe em duas formas de uso:

| | **Web** | **Mobile** |
|---|---------|------------|
| **O que é** | Aplicação React (Vite) acessada no navegador | App instalável (Expo/React Native) para Android (e iOS, se configurado) |
| **Onde roda** | Navegador (desktop ou celular) | Dispositivo nativo (APK/App Store) |
| **Código principal** | `src/` (páginas, componentes, hooks) | **O mesmo frontend web** carregado dentro de uma **WebView** |
| **Backend** | Supabase (auth, banco, Edge Functions) | O mesmo Supabase; o app mobile não tem backend próprio |

Ou seja: a **experiência de uso** (telas, fluxos, dados) é a mesma; o que muda é **onde** essa experiência roda (navegador vs app nativo) e o que o **app mobile adiciona** em volta (notificações push, links que abrem no app, etc.).

---

## Por que usamos React Native WebView no mobile?

O app mobile **não reimplementa** as telas em React Native. Em vez disso, ele usa **React Native WebView** para exibir o **mesmo frontend web** que você acessa no navegador. Em resumo:

1. **Um único frontend**  
   Toda a lógica de UI, rotas, integração com Supabase e regras de negócio ficam no projeto web (`src/`). O app mobile só carrega a URL desse frontend (ex.: produção no Render) dentro da WebView. Assim evitamos duplicar código e manter duas bases (web pura e app 100% nativo).

2. **Entrega e atualização mais simples**  
   Ajustes e novas funcionalidades são feitos no frontend web e publicados (deploy). Os usuários do app passam a ver a versão nova na próxima abertura, sem precisar de atualização do app nas lojas — exceto quando há mudanças que dependem do “casco” nativo (ex.: permissões, push, deep links).

3. **Casco nativo só onde faz sentido**  
   O que **precisa** ser nativo fica no app Expo/React Native:
   - **Notificações push** (Expo Push), para alertas na bandeja do celular
   - **Deep links / App Links**, para links em e-mails ou sites abrirem direto no app
   - **Permissões** e integração com o sistema (canais de notificação, etc.)

4. **Stack alinhada**  
   O frontend já é React; o mobile usa React Native. A WebView é a ponte: o mesmo React roda no navegador (web) e dentro do app (WebView), com comunicação opcional via `postMessage` e scripts injetados quando precisamos de dados nativos (ex.: token de push).

---

## Resumo

- **Web**: aplicação completa no navegador; é o “produto” principal.
- **Mobile**: mesmo produto dentro de um app instalável, usando **React Native WebView** para reutilizar o frontend e adicionar apenas o que exige o dispositivo (push, links que abrem no app, etc.), sem manter duas UIs em paralelo.
