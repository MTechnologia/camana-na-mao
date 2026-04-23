# Padrão Operacional do Time para Migrations

Use este fluxo como regra padrão para qualquer mudança de banco:

1. **Atualize a base antes de criar migrations**
   ```bash
   git switch dev
   git pull --ff-only
   ```

2. **Crie migrations sempre pelo CLI**
   ```bash
   npx supabase migration new nome_da_migration
   ```

3. **Nunca crie manualmente dois arquivos com o mesmo timestamp**
   - cada migration deve ter uma `version` única
   - evite editar nomes de migrations antigas já versionadas

4. **Antes de aplicar no remoto, confira o histórico**
   ```bash
   npx supabase migration list
   ```

5. **Aplique migrations novas com**
   ```bash
   npx supabase db push
   ```

6. **Revalide depois da aplicação**
   ```bash
   npx supabase migration list
   ```
