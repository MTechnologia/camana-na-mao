# Como Aplicar a Migration de Cursos da Escola do Parlamento

## 📋 Resumo

Esta migration cria o sistema completo de cursos e inscrições da Escola do Parlamento, incluindo:

- Tabela `parlamento_courses` para armazenar os cursos
- Tabela `parlamento_course_enrollments` para armazenar as inscrições
- RLS policies para segurança
- Função automática para atualizar contador de participantes
- Inserção dos 4 cursos iniciais

## 🚀 Passos para Aplicar

### 1. Aplicar a Migration no Supabase

#### Opção A: Via Supabase Dashboard (Recomendado)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Clique em **New Query**
5. Copie e cole o conteúdo do arquivo:
   ```
   supabase/migrations/20260202000001_parlamento_courses.sql
   ```
6. Clique em **Run** (ou pressione `Ctrl+Enter`)

#### Opção B: Via Supabase CLI

```bash
# Certifique-se de estar na raiz do projeto
cd c:\Projetos\camana-na-mao

# Aplicar a migration
supabase db push
```

### 2. Verificar se a Migration Foi Aplicada

Execute no SQL Editor do Supabase:

```sql
-- Verificar se as tabelas foram criadas
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('parlamento_courses', 'parlamento_course_enrollments');

-- Verificar se os cursos foram inseridos
SELECT id, title, level, available, participants_count 
FROM public.parlamento_courses 
ORDER BY created_at;
```

Você deve ver 4 cursos:
1. Introdução à Participação Cidadã (iniciante, disponível)
2. Processo Legislativo Municipal (intermediario, disponível)
3. Controle Social e Transparência (intermediario, disponível)
4. Elaboração de Projetos de Lei Popular (avancado, não disponível)

### 3. Verificar RLS Policies

```sql
-- Verificar políticas de RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename IN ('parlamento_courses', 'parlamento_course_enrollments');
```

## ✅ Funcionalidades Implementadas

### Frontend (`src/pages/institucional/EscolaParlamento.tsx`)

1. **Carregamento de Cursos**: Busca cursos do banco de dados
2. **Verificação de Inscrição**: Mostra se o usuário já está inscrito
3. **Botão de Inscrição**: 
   - "Inscrever-se gratuitamente" - se não inscrito
   - "Inscrito" com ícone ✓ - se já inscrito
   - "Em breve" - se curso não disponível
4. **Autenticação**: Redireciona para login se não autenticado
5. **Feedback Visual**: Toast notifications para sucesso/erro
6. **Atualização Automática**: Recarrega cursos após inscrição para atualizar contador

### Backend (Migration SQL)

1. **Tabela de Cursos**: Armazena informações dos cursos
2. **Tabela de Inscrições**: Armazena inscrições dos usuários
3. **RLS Policies**: 
   - Qualquer um pode ver cursos disponíveis
   - Usuários só podem ver/inserir suas próprias inscrições
4. **Trigger Automático**: Atualiza contador de participantes ao inscrever/cancelar
5. **Validações**: 
   - Unique constraint em (course_id, user_id) para evitar duplicatas
   - Check constraint em level e status

## 🧪 Como Testar

### Teste 1: Visualizar Cursos (Sem Login)

1. Acesse `/institucional/escola-parlamento` sem estar logado
2. Você deve ver os 4 cursos listados
3. Os botões devem estar habilitados (mas redirecionarão para login)

### Teste 2: Tentar Inscrever-se (Sem Login)

1. Clique em "Inscrever-se gratuitamente" em qualquer curso
2. Deve aparecer toast: "Você precisa estar logado para se inscrever"
3. Deve redirecionar para `/login`

### Teste 3: Inscrever-se (Com Login)

1. Faça login na aplicação
2. Acesse `/institucional/escola-parlamento`
3. Clique em "Inscrever-se gratuitamente" em um curso disponível
4. Deve aparecer toast: "Inscrição realizada com sucesso!"
5. O botão deve mudar para "Inscrito" com ícone ✓
6. O contador de participantes deve aumentar

### Teste 4: Tentar Inscrever-se Novamente

1. Tente clicar em "Inscrever-se gratuitamente" no mesmo curso
2. Deve aparecer toast: "Você já está inscrito neste curso!"
3. O botão deve continuar mostrando "Inscrito"

### Teste 5: Verificar no Banco de Dados

```sql
-- Ver suas inscrições
SELECT 
  e.id,
  c.title,
  e.status,
  e.enrolled_at
FROM public.parlamento_course_enrollments e
JOIN public.parlamento_courses c ON c.id = e.course_id
WHERE e.user_id = auth.uid()
ORDER BY e.enrolled_at DESC;

-- Verificar contador de participantes
SELECT 
  title,
  participants_count,
  (SELECT COUNT(*) FROM parlamento_course_enrollments WHERE course_id = c.id) as real_count
FROM public.parlamento_courses c;
```

Os valores de `participants_count` e `real_count` devem ser iguais.

## 🔧 Troubleshooting

### Erro: "relation 'parlamento_courses' does not exist"

**Solução**: A migration não foi aplicada. Aplique a migration seguindo os passos acima.

### Erro: "duplicate key value violates unique constraint"

**Solução**: O usuário já está inscrito. Isso é esperado e o sistema deve mostrar "Você já está inscrito neste curso!".

### Erro: "new row violates row-level security policy"

**Solução**: Verifique se:
1. O usuário está autenticado (`auth.uid()` não é NULL)
2. As RLS policies foram criadas corretamente
3. O usuário está tentando inserir uma inscrição com seu próprio `user_id`

### Contador de Participantes Não Atualiza

**Solução**: Verifique se o trigger foi criado:

```sql
-- Verificar se o trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_update_course_participants';
```

Se não existir, execute novamente a parte da migration que cria o trigger.

## 📝 Notas Importantes

1. **UUIDs dos Cursos**: Os cursos são inseridos com UUIDs gerados automaticamente. Se você precisar referenciar um curso específico, use o título como identificador.

2. **Contador de Participantes**: O contador é atualizado automaticamente via trigger. Não é necessário atualizar manualmente.

3. **Status de Inscrição**: O status padrão é `'inscrito'`. Outros status possíveis: `'em_andamento'`, `'concluido'`, `'cancelado'`.

4. **RLS**: As políticas de RLS garantem que:
   - Qualquer um pode ver cursos disponíveis
   - Usuários só podem ver suas próprias inscrições
   - Usuários só podem criar inscrições para si mesmos

## 🎯 Próximos Passos (Opcional)

- [ ] Criar página para visualizar cursos inscritos pelo usuário
- [ ] Implementar sistema de progresso do curso
- [ ] Adicionar certificado de conclusão
- [ ] Criar área administrativa para gerenciar cursos
- [ ] Adicionar notificações por e-mail ao se inscrever
