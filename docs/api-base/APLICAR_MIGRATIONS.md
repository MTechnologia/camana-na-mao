# Como Aplicar Migrations no Supabase Cloud

Este guia mostra como aplicar as migrations do projeto no Supabase Cloud.

## ⚠️ Importante

O projeto está configurado para usar **Supabase Cloud**, não local. As migrations precisam ser aplicadas no projeto cloud.

## 📋 Pré-requisitos

1. **Supabase CLI instalado**
   ```bash
   supabase --version
   ```
   
   ⚠️ **IMPORTANTE**: O pacote `supabase` do npm **não suporta instalação global**.
   
   **Opções de instalação:**
   
   ### Opção 1: Via npx (recomendado - sem instalação)
   ```bash
   # Use diretamente sem instalar
   npx supabase@latest --version
   ```
   
   ### Opção 2: Via Homebrew (Linux/Mac)
   ```bash
   brew install supabase/tap/supabase
   ```
   
   ### Opção 3: Via npm como dependência local
   ```bash
   cd /home/andre/projetos/mtech/camana-na-mao
   npm install --save-dev supabase
   # Depois use: npx supabase
   ```
   
   ### Opção 4: Download direto (Linux)
   ```bash
   # Baixar binário
   wget -O supabase https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64
   chmod +x supabase
   sudo mv supabase /usr/local/bin/
   ```
   
   Veja mais opções: https://github.com/supabase/cli#install-the-cli

2. **Login no Supabase**
   ```bash
   supabase login
   ```
   Isso abrirá o navegador para autenticação.

## 🔗 Passo 1: Linkar o Projeto

O projeto atual está usando:
- **Project ID**: `vjzkzsczlbtmrzewffdx`
- **URL**: `https://vjzkzsczlbtmrzewffdx.supabase.co`

```bash
cd /home/andre/projetos/mtech/camana-na-mao

# Se instalou via Homebrew ou binário:
supabase link --project-ref vjzkzsczlbtmrzewffdx

# Se está usando npx (sem instalação):
npx supabase@latest link --project-ref vjzkzsczlbtmrzewffdx
```

Você precisará da **Database Password** do projeto:
- Acesse: [Supabase Dashboard](https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx)
- Vá em: **Settings > Database > Database Password**
- Se não souber, pode resetar a senha

## 📦 Passo 2: Aplicar Migrations

### Opção A: Aplicar todas as migrations (recomendado)

```bash
# Se instalou via Homebrew ou binário:
supabase db push

# Se está usando npx:
npx supabase@latest db push
```

Isso aplicará todas as migrations pendentes no projeto cloud.

### Opção B: Reset completo (⚠️ CUIDADO: apaga todos os dados!)

```bash
# Se instalou via Homebrew ou binário:
supabase db reset

# Se está usando npx:
npx supabase@latest db reset
```

**Use apenas em desenvolvimento!** Isso apaga todos os dados e recria o banco do zero.

## ✅ Passo 3: Verificar se as Tabelas Foram Criadas

### Via CLI

```bash
# Se instalou via Homebrew ou binário:
supabase db diff
supabase migration list

# Se está usando npx:
npx supabase@latest db diff
npx supabase@latest migration list
```

### Via Dashboard

1. Acesse: [Supabase Dashboard > SQL Editor](https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx/sql)
2. Execute:

```sql
-- Listar todas as tabelas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Verificar tabelas principais
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'user_roles',
  'council_member_referrals',
  'urban_reports',
  'transport_reports',
  'news_cache',
  'agenda_cache',
  'council_members_cache'
);
```

## 🚀 Passo 4: Deploy das Edge Functions

Após aplicar as migrations, faça deploy das funções:

```bash
# Se instalou via Homebrew ou binário:
supabase functions deploy
supabase functions deploy api-router
supabase functions deploy fetch-vereadores
supabase functions deploy fetch-noticias
supabase functions deploy fetch-agenda

# Se está usando npx:
npx supabase@latest functions deploy
npx supabase@latest functions deploy api-router
# ... etc
```

## 🐛 Problemas Comuns

### Erro: "Project not found"

**Solução:** Verifique se o project-ref está correto:
```bash
# Ver projeto linkado
cat .supabase/config.toml | grep project_id
```

### Erro: "Database password incorrect"

**Solução:** 
1. Acesse o Dashboard
2. Settings > Database > Database Password
3. Reset a senha se necessário
4. Execute `supabase link` novamente

### Erro: "Migration already applied"

**Solução:** Isso é normal. Significa que a migration já foi aplicada anteriormente.

### Verificar estado atual

```bash
# Se instalou via Homebrew ou binário:
supabase migration list
supabase db diff

# Se está usando npx:
npx supabase@latest migration list
npx supabase@latest db diff
```

## 📝 Notas

- **Não commitar senhas**: O arquivo `.supabase/config.toml` contém informações sensíveis. Não commite este arquivo.
- **Backup antes de reset**: Se for fazer `db reset`, certifique-se de ter backup dos dados importantes.
- **Ambiente de produção**: Em produção, use o Dashboard para aplicar migrations ou configure CI/CD.
