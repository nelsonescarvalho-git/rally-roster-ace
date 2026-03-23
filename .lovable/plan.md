

## Corrigir Soft Delete de Set — Dados Órfãos

### Problema

A função `soft_delete_set` não marca como apagados os registos nas tabelas `rally_actions`, `timeouts` e `sanctions`. Isto faz com que, após apagar um set, as ações dos rallies continuem visíveis nos insights e KPIs.

O mesmo problema existe em `soft_delete_match` (falta `rally_actions`, `timeouts`, `sanctions`) e em `purge_deleted` (falta purgar essas mesmas tabelas).

### Correção — 1 migração SQL

Recriar as 3 funções:

**`soft_delete_set`** — adicionar:
- `rally_actions`: soft-delete via JOIN com rallies do set
- `timeouts`: soft-delete por match_id + set_no
- `sanctions`: soft-delete por match_id + set_no

**`soft_delete_match`** — adicionar:
- `rally_actions`: soft-delete via JOIN com rallies do match
- `timeouts`: soft-delete por match_id
- `sanctions`: soft-delete por match_id

**`purge_deleted`** — adicionar (antes dos rallies, pela integridade referencial):
- `DELETE FROM rally_actions WHERE deleted_at < now() - interval '15 days'`
- `DELETE FROM timeouts WHERE deleted_at < now() - interval '15 days'`
- `DELETE FROM sanctions WHERE deleted_at < now() - interval '15 days'`

### Correção imediata dos dados actuais

Após a migração, executar uma query de limpeza para soft-deletar `rally_actions` órfãos cujo `rally_id` aponta para rallies já soft-deleted:

```sql
UPDATE rally_actions 
SET deleted_at = now()
WHERE deleted_at IS NULL 
  AND rally_id IN (SELECT id FROM rallies WHERE deleted_at IS NOT NULL);
```

E o mesmo para timeouts/sanctions cujo match_id+set_no corresponda a sets apagados.

