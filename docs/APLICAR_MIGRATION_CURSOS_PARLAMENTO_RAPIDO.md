# ⚠️ ERRO: Tabela `parlamento_courses` não encontrada

## 🔴 Problema

```
Error: Could not find the table 'public.parlamento_courses' in the schema cache
```

A migration `20260202000001_parlamento_courses.sql` ainda não foi aplicada no Supabase.

## ✅ Solução Rápida

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/vjzkzsczlbtmrzewffdx
2. Vá em **SQL Editor** (menu lateral)
3. Clique em **New Query**
4. Copie e cole o conteúdo completo do arquivo:
   ```
   supabase/migrations/20260202000001_parlamento_courses.sql
   ```
5. Clique em **Run** (ou `Ctrl+Enter`)

### Opção 2: Via Supabase CLI

```bash
cd c:\Projetos\camana-na-mao
supabase db push
```

## 📋 Verificar se Funcionou

Execute no SQL Editor:

```sql
-- Verificar se a tabela foi criada
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'parlamento_courses';

-- Verificar se os cursos foram inseridos
SELECT id, title, level, available, participants_count 
FROM public.parlamento_courses 
ORDER BY created_at;
```

Você deve ver 4 cursos:
1. Introdução à Participação Cidadã
2. Processo Legislativo Municipal
3. Controle Social e Transparência
4. Elaboração de Projetos de Lei Popular

## 🔄 Após Aplicar

Recarregue a página `/institucional/escola-parlamento` e o erro deve desaparecer!
