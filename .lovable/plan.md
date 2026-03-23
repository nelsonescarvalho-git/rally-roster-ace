

## Problema

Após apagar um set (soft delete), o lineup antigo permanece na tabela com `deleted_at` preenchido. Quando se tenta criar um novo lineup para o mesmo set, o `getLineupForSet` não encontra nada (filtra `deleted_at IS NULL`) e tenta fazer INSERT — que falha porque a unique constraint `lineups_match_id_set_no_side_key` ainda vê o registo soft-deleted.

## Solução

Alterar `saveLineup` em `src/pages/Setup.tsx` para, antes de inserir, verificar se existe um lineup soft-deleted para o mesmo `(match_id, set_no, side)` e, nesse caso, fazer UPDATE (reactivar) em vez de INSERT.

### Alteração em `src/pages/Setup.tsx` — função `saveLineup`

No ramo `else` (quando `existing` é `null`), antes do INSERT:

1. Consultar se existe um lineup soft-deleted: `supabase.from('lineups').select('id').eq('match_id', matchId).eq('set_no', activeSet).eq('side', activeSide).not('deleted_at', 'is', null).maybeSingle()`
2. Se existir → fazer UPDATE nesse registo, limpando `deleted_at` e `deleted_by` e preenchendo as rotações
3. Se não existir → INSERT normal (comportamento actual)

### Detalhe técnico

```typescript
// Inside saveLineup, replace the else branch:
} else {
  // Check for soft-deleted lineup
  const { data: softDeleted } = await supabase
    .from('lineups')
    .select('id')
    .eq('match_id', matchId)
    .eq('set_no', activeSet)
    .eq('side', activeSide)
    .not('deleted_at', 'is', null)
    .maybeSingle();

  if (softDeleted) {
    // Reactivate soft-deleted lineup
    const { error } = await supabase.from('lineups').update({
      rot1: ..., rot2: ..., ..., rot6: ...,
      deleted_at: null, deleted_by: null,
    }).eq('id', softDeleted.id);
  } else {
    // Normal insert
    const { error } = await supabase.from('lineups').insert([...]);
  }
}
```

Nenhuma migração necessária — apenas alteração de código.

