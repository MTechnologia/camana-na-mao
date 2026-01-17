# 🐳 Guia Rápido - Docker

Guia rápido para usar Docker no projeto Câmara na Mão.

## 📋 Pré-requisitos

- Docker instalado ([Instalar Docker](https://docs.docker.com/get-docker/))
- Docker Compose instalado (geralmente vem com Docker Desktop)
- Arquivo `.env` configurado (veja `.env.example`)

## 🚀 Início Rápido

### 1. Configure o arquivo `.env`

Copie o arquivo de exemplo e preencha com suas credenciais:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione:
- `VITE_SUPABASE_URL` - URL do seu projeto Supabase
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Chave pública do Supabase

### 2. Inicie o ambiente

```bash
# Desenvolvimento (com hot-reload)
docker-compose up

# Ou em background
docker-compose up -d
```

### 3. Acesse a aplicação

Abra seu navegador em: http://localhost:8080

## 📝 Comandos Úteis

### Desenvolvimento

```bash
# Iniciar serviços
docker-compose up

# Iniciar em background
docker-compose up -d

# Ver logs
docker-compose logs -f frontend

# Parar serviços
docker-compose down

# Parar e remover volumes (limpar node_modules)
docker-compose down -v

# Rebuild após mudanças no Dockerfile
docker-compose build --no-cache

# Rebuild e iniciar
docker-compose up --build
```

### Produção

```bash
# Build de produção
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Executar em produção
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Ver logs
docker-compose -f docker-compose.yml -f docker-compose.prod.yml logs -f
```

### Debugging

```bash
# Entrar no container
docker-compose exec frontend sh

# Ver processos rodando
docker-compose ps

# Ver uso de recursos
docker stats

# Limpar tudo (cuidado!)
docker-compose down -v --rmi all
```

## 🔧 Solução de Problemas

### Porta 8080 já está em uso

```bash
# Edite docker-compose.yml e mude a porta:
ports:
  - "3000:8080"  # Agora acesse em http://localhost:3000
```

### node_modules não está sincronizado

```bash
# Remova o volume e recrie
docker-compose down -v
docker-compose up --build
```

### Variáveis de ambiente não funcionam

```bash
# Verifique se o arquivo .env existe
ls -la .env

# Verifique se as variáveis estão corretas
cat .env

# Recrie o container
docker-compose down
docker-compose up --build
```

### Hot-reload não funciona

```bash
# Verifique se os volumes estão montados corretamente
docker-compose exec frontend ls -la /app/src

# Reinicie o container
docker-compose restart frontend
```

### Erro de permissão

```bash
# No Linux, pode ser necessário ajustar permissões
sudo chown -R $USER:$USER .
```

## 📊 Estrutura

```
.
├── Dockerfile                 # Build da aplicação
├── docker-compose.yml         # Configuração desenvolvimento
├── docker-compose.prod.yml    # Override para produção
├── .dockerignore              # Arquivos ignorados no build
├── .env.example               # Template de variáveis
└── .env                       # Suas variáveis (não commitado)
```

## 🔄 Workflow de Desenvolvimento

1. **Primeira vez**:
   ```bash
   cp .env.example .env
   # Edite .env com suas credenciais
   docker-compose up --build
   ```

2. **Desenvolvimento diário**:
   ```bash
   docker-compose up
   # Faça suas mudanças no código
   # O hot-reload atualiza automaticamente
   ```

3. **Após mudanças no Dockerfile**:
   ```bash
   docker-compose build --no-cache
   docker-compose up
   ```

4. **Ao finalizar**:
   ```bash
   docker-compose down
   ```

## 🌐 Integração com Supabase e Backend

### Backend (Edge Functions)

O backend roda no **Supabase Cloud**, não em containers Docker. As Edge Functions são deployadas diretamente:

```bash
# Deploy das Edge Functions (fora do Docker)
supabase functions deploy api-router

# Ver logs
supabase functions logs api-router --follow
```

**📚 Documentação completa do backend:** Veja [docs/api-rest-mobile/](../api-rest-mobile/)

### Frontend + Backend

O frontend em Docker se conecta ao backend Supabase através das variáveis de ambiente:

```bash
# No arquivo .env
VITE_SUPABASE_URL=https://vzkwkcypkfrpfhhsghwn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_aqui
```

**Fluxo:**
1. Frontend roda em Docker (porta 8080)
2. Backend roda no Supabase Cloud
3. Frontend faz requisições para o Supabase usando as variáveis acima

### Testando a API

Com o frontend em Docker, você pode testar a API diretamente:

```bash
# Testar endpoint da API
curl https://vzkwkcypkfrpfhhsghwn.supabase.co/functions/v1/api/v1/vereadores

# Ou usar o script de testes
./scripts/test-api-rest.sh
```

### Supabase Local (Opcional)

Se você quiser rodar o Supabase localmente, será necessário configuração adicional (veja `DOCKER_PLANEJAMENTO.md`). Atualmente, o projeto usa Supabase remoto.

## 📚 Mais Informações

- [Planejamento Completo](./DOCKER_PLANEJAMENTO.md)
- [Integração Docker + Backend](../INTEGRACAO_DOCKER_BACKEND.md) - Como Docker e Backend trabalham juntos
- [Documentação da API](../api-rest-mobile/) - Guias sobre o backend
- [Documentação Docker](https://docs.docker.com/)
- [Documentação Docker Compose](https://docs.docker.com/compose/)

## ⚠️ Notas Importantes

1. **Não commite o arquivo `.env`** - Ele contém credenciais sensíveis
2. **O arquivo `.env` já está no `.gitignore`** - Mas verifique antes de commitar
3. **Hot-reload funciona** - Mudanças no código são refletidas automaticamente
4. **node_modules está em volume** - Para melhor performance e evitar problemas de permissão
