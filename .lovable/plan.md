

# Fix: Remover "#0 Desconhecido" da tab Distribuicao

## Problema
Acoes de `setter` na `rally_actions` com `player_id = NULL` mas com `pass_destination` preenchido sao agrupadas como "#0 Desconhecido".

## Alteracao

### Ficheiro: `src/hooks/useDistributionStatsFromActions.ts` (linha 64)

Adicionar `&& a.player_id` ao filtro de setter actions:

```typescript
// Antes
const setterActions = actions.filter(a => a.action_type === 'setter' && a.pass_destination);

// Depois
const setterActions = actions.filter(a => a.action_type === 'setter' && a.pass_destination && a.player_id);
```

Isto remove as acoes sem distribuidor identificado da tabela. O aviso de "distribuicoes incompletas" no topo da tab ja cobre estes casos.

