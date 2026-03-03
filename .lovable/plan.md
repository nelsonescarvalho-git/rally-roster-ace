

# Bug: Última ação terminal nunca é gravada na tabela `rally_actions`

## Causa raiz

Quando uma ação terminal é confirmada (Kill, Ace, Bloco Ponto, Erro), o fluxo é:

1. `onConfirm()` → chama `handleConfirmAction` → `setRegisteredActions(prev => [...prev, newAction])` **(async — React state)**
2. `onAutoFinishPoint()` → chama `handleFinishPoint` → lê `registeredActions` **(stale — ainda sem a ação do passo 1)**

A tabela `rallies` recebe os dados correctos porque usa `attackOverrides`. Mas a tabela `rally_actions` (linha 1449-1467) itera sobre `registeredActions` que ainda não inclui a última ação confirmada. **Resultado: a ação terminal nunca é persistida em `rally_actions`.**

Isto afecta: Kills, Aces, Erros de serviço, Erros de ataque, Blocos ponto — qualquer acção que auto-finalize o rally.

## Fix — `src/pages/Live.tsx`

### Alterar `handleFinishPoint` para receber as ações actuais como parâmetro

Em vez de ler `registeredActions` (stale), o `handleFinishPoint` deve construir a lista de ações a partir de `registeredActions` + as ações que acabaram de ser confirmadas via `attackOverrides`.

**Abordagem concreta**: No `handleFinishPoint` (linha ~1449), antes de mapear `registeredActions` para `actionsToInsert`, construir uma lista completa que inclui ações inferidas dos `attackOverrides`:

```typescript
// Build complete actions list including terminal action from overrides
let allActions = [...registeredActions];

// If attackOverrides contain data not yet in registeredActions, add them
if (attackOverrides) {
  const hasAttack = allActions.some(a => a.type === 'attack');
  if (!hasAttack && attackOverrides.attackPlayerId) {
    allActions.push({
      type: 'attack', side: /* infer */, phase: 1,
      playerId: attackOverrides.attackPlayerId,
      playerNo: getPlayerNo(attackOverrides.attackPlayerId),
      code: attackOverrides.attackCode ?? null,
      killType: attackOverrides.killType ?? null,
    });
  }
  // Same for block if blockCode exists but no block in registeredActions
  const hasBlock = allActions.some(a => a.type === 'block');
  if (!hasBlock && attackOverrides.blockCode !== undefined) {
    allActions.push({
      type: 'block', side: /* opponent */, phase: 1,
      playerId: attackOverrides.blocker1Id ?? null,
      code: attackOverrides.blockCode,
    });
  }
}
```

Além disso, tratar os casos sem `attackOverrides` (ex: Ace, Erro de serviço) onde `onConfirm` é chamado imediatamente antes de `onAutoFinishPoint`:
- Para o **serviço** (ace/SE), a ação de serviço já deveria estar em `registeredActions` antes do auto-finish. Verificar se o `setTimeout(0)` no ActionEditor causa o mesmo problema.

Verificando o ActionEditor: nas linhas 315-318, o fluxo é `onConfirm({serveType})` seguido de `onAutoFinishPoint` dentro de um `setTimeout(0)`. Ambos usam `setTimeout(0)`, o que coloca ambos na mesma microtask queue — `registeredActions` ainda não terá a ação de serviço.

**Fix mais robusto**: adicionar as ações do `registeredActions` mais a ação pendente como parâmetro directo:

Modificar `handleAutoFinishPoint` para capturar `pendingAction` no momento da chamada e passá-lo como parâmetro adicional a `handleFinishPoint`. Assim, `handleFinishPoint` pode reconstruir a lista completa.

**Alternativa mais simples**: no `handleFinishPoint`, ao construir `actionsToInsert`, reconstruir a lista a partir dos dados já disponíveis no `rallyData` (que usa overrides correctamente). Isto garante que o `rally_actions` reflecte exactamente o que está no `rallies`.

### Implementação preferida

No `handleFinishPoint`, após `saveRally` e obter o `createdRally.id`, reconstruir `actionsToInsert` a partir de `rallyData` em vez de `registeredActions`. Assim:

1. Manter `registeredActions` para as ações intermédias (receção, distribuição, defesa)
2. Complementar com dados do `rallyData`/`attackOverrides` para garantir que ações terminais são incluídas
3. Comparar com `registeredActions` para evitar duplicados

