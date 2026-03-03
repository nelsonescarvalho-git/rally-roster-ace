

# Bug: Ações do ponto anulado permanecem nas estatísticas em tempo real

## Causa raiz

Quando o utilizador anula o último ponto (`deleteLastRally`), a função faz **hard delete** dos registos na tabela `rallies` mas:

1. **Não apaga os `rally_actions`** associados — ficam órfãos na BD
2. **Não invalida a query `rally-actions-match`** — o cache do React Query mantém os dados stale

Embora `useRallyActionsForMatch` filtre por rally IDs existentes, como a query não é re-executada após o delete, o cache continua a servir as ações do rally apagado. Isto faz com que as estatísticas de destino (kills/attempts por zona P2, P3, P4, etc.) mostrem dados do ponto anulado.

## Fix — `src/hooks/useMatch.ts`

### 1. Soft-delete `rally_actions` do rally apagado

Antes do hard delete do rally, soft-delete as ações associadas:

```typescript
// Inside deleteLastRally, before deleting from rallies:
// Get rally IDs to delete
const rallyIdsToDelete = setRallies
  .filter(r => r.rally_no === lastRallyNo)
  .map(r => r.id);

// Soft-delete associated rally_actions
await supabase
  .from('rally_actions')
  .update({ deleted_at: new Date().toISOString() })
  .in('rally_id', rallyIdsToDelete);
```

### 2. Invalidar cache de `rally-actions-match`

Após o delete, adicionar invalidação da query:

```typescript
// After the hard delete + loadMatch:
await queryClient.invalidateQueries({ queryKey: ['rally-actions-match', matchId] });
```

Isto garante que a próxima leitura re-executa a query, excluindo as ações dos rallies apagados.

### Impacto

Corrige o problema para **todas as ações** (serviço, receção, distribuição, ataque, bloco, defesa) e **ambas as equipas**, pois a invalidação força o refetch completo do mapa de ações.

