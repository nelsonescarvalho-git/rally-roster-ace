
# Corrigir Indicador de Discrepância Legacy vs Rally Actions

## Problema
O indicador de discrepância (badge laranja com GitCompare) aparece incorretamente nos Rallies #35 e #33 porque compara `actionsCount !== legacyActionsCount`. Para rallies longos com multiplos ciclos ataque/defesa, a tabela `rally_actions` tem naturalmente **mais** registos que o legacy (que so guarda 1 por tipo, maximo 6).

- Rally #35: 6 legacy / 18 actions -- rally longo com 18 toques, perfeitamente normal
- Rally #33: 6 legacy / 7 actions -- tambem normal

## Solucao
Mudar a comparacao de `!==` para `<` (menor que). So deve alertar quando `rally_actions` tem **menos** acoes que o legacy, o que indica acoes em falta na tabela nova.

## Alteracao

**Ficheiro**: `src/components/rally/RallySummary.tsx` (linha 62-64)

De:
```typescript
const hasDiscrepancy = actionsCount !== undefined && 
  legacyActionsCount !== undefined && 
  actionsCount !== legacyActionsCount;
```

Para:
```typescript
// Only flag when rally_actions has FEWER than legacy
// (rally_actions having MORE is normal for long rallies)
const hasDiscrepancy = actionsCount !== undefined && 
  legacyActionsCount !== undefined && 
  actionsCount < legacyActionsCount;
```

## Resultado Esperado
- Rallies #35 e #33 deixam de mostrar o badge laranja (18 actions > 6 legacy esta correcto)
- O badge so aparece quando ha acoes legacy que faltam sincronizar para `rally_actions`
