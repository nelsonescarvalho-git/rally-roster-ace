

## Corrigir Conflito de Unique Constraint após Soft Delete de Set

### Problema

A tabela `rallies` tem um unique index em `(match_id, set_no, rally_no, phase)` que **não exclui registos soft-deleted** (`deleted_at IS NOT NULL`). Quando um set é apagado (soft delete) e o utilizador começa a registar novos rallies no mesmo set, o INSERT falha com "duplicate key value violates unique constraint".

### Solução — 1 migração SQL

Substituir o unique index atual por um **partial unique index** que só se aplica a registos ativos:

```sql
-- Drop the old constraint
ALTER TABLE public.rallies 
  DROP CONSTRAINT rallies_match_id_set_no_rally_no_phase_key;

-- Create partial unique index (only for non-deleted rows)
CREATE UNIQUE INDEX rallies_match_id_set_no_rally_no_phase_active_key 
  ON public.rallies (match_id, set_no, rally_no, phase) 
  WHERE deleted_at IS NULL;
```

Isto permite que registos soft-deleted coexistam com novos registos para o mesmo `(match_id, set_no, rally_no, phase)`, eliminando o erro sem alterar qualquer código da aplicação.

### Ficheiros afetados
- 1 nova migração SQL (apenas)
- Zero alterações de código

