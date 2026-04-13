# Segurança do projeto (web + Supabase)

Este documento resume práticas obrigatórias e verificações periódicas. Detalhes de variáveis: `docs/ENVIRONMENT_VARIABLES.md`.

## Segredos e repositório

- **Não commitar** `.env`, chaves de API, `service_role`, tokens Firebase/VAPID completos ou JSON de contas de serviço.
- **Modelo versionado:** apenas `.env.example` e `.env.e2e.example` (valores fictícios ou vazios).
- Se `.env` chegou a ser versionado no passado, **rode `git rm --cached .env`**, confirme que está no `.gitignore` e **considere rodar chaves** (Supabase, Maps, etc.) se alguma vez tenham ido para o histórico remoto.

## Frontend (Vite)

- `CAMARA_*` e `VITE_*` públicas entram no bundle; a proteção de dados é **RLS e políticas no Supabase**, não “esconder” a anon key.
- **Google Maps:** restrinja a chave no Google Cloud (HTTP referrers / apps), não dependa só do código.

## Backend (Supabase)

- **Service role** só em Edge Functions, scripts server-side ou CI com secrets — nunca no app cliente.
- Secrets de funções: **Dashboard → Edge Functions → Secrets** (ou CLI), não em ficheiros no repo.

## Dependências

- **CI:** o workflow `security-audit.yml` executa `npm audit --audit-level=critical` em cada PR/push nas branches configuradas.
- Localmente: `npm run audit` ou `npm run audit:high` para ver alertas de nível alto.
- Após alterar `package.json`, **atualize o lockfile** com `npm install` e commit `package-lock.json` junto.

## Checklist rápido (release / onboarding)

- [ ] `.env` local existe e **não** está no Git (`git status` limpo para `.env`).
- [ ] Novas integrações documentadas em `.env.example` sem valores reais.
- [ ] Políticas RLS revisadas para tabelas novas ou novos `anon`/`authenticated`.
- [ ] `npm run audit` sem vulnerabilidades **critical** (ou plano documentado para exceção).
