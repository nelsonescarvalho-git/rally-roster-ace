

# Plano: Corrigir Race Condition no Auto-Finish Point

## Problema Identificado

No fluxo **Distribuição → Ataque** com finalização automática (Kill, ACE, Erro):

1. O `handleKillTypeWithAutoConfirm` chama:
   ```typescript
   onConfirm({ playerId: selectedPlayer, code: 3, killType: type });
   onAutoFinishPoint?.(side, 'KILL');  // ← SEM passar dados do ataque!
   ```

2. O `handleAutoFinishPoint` no `Live.tsx` (linha 1502):
   ```typescript
   const handleAutoFinishPoint = useCallback((winner: Side, reason: Reason) => {
     handleFinishPoint(winner, reason);  // ← SEM overrides!
   }, [handleFinishPoint]);
   ```

3. O `handleFinishPoint` procura o ataque em `registeredActions`:
   ```typescript
   const attackAction = registeredActions.find(a => a.type === 'attack');
   a_player_id: attackAction?.playerId || null,  // ← AINDA NÃO ATUALIZADO!
   ```

### Cenários Afetados

| Cenário | Chamada | Dados Perdidos |
|---------|---------|----------------|
| Kill (a_code 3) | `onAutoFinishPoint(side, 'KILL')` | `playerId`, `code`, `killType` |
| Erro Ataque (a_code 0) | `onAutoFinishPoint(opponent, 'AE')` | `playerId`, `code` |
| ACE (s_code 3) | `onAutoFinishPoint(side, 'ACE')` | Serviço OK (está em `serveData`) |
| Erro Serviço (s_code 0) | `onAutoFinishPoint(opponent, 'SE')` | Serviço OK |
| Block Fault (b_code 0) | `onAutoFinishPoint(side, 'BLK')` | `playerId`, `blockCode` |
| Stuff Block (b_code 3) | `onAutoFinishPoint(blockerSide, 'BLK')` | `playerId`, `blockCode`, `blocker1Id` |

---

## Solução

### 1. Expandir Interface do `onAutoFinishPoint`

**Ficheiro:** `src/components/live/ActionEditor.tsx` (linha 86)

```typescript
// Antes:
onAutoFinishPoint?: (winner: Side, reason: Reason) => void;

// Depois:
onAutoFinishPoint?: (winner: Side, reason: Reason, attackOverrides?: {
  attackPlayerId?: string | null;
  attackCode?: number | null;
  killType?: KillType | null;
  blockCode?: number | null;
  blocker1Id?: string | null;
}) => void;
```

### 2. Passar Overrides em Todas as Chamadas

**Ficheiro:** `src/components/live/ActionEditor.tsx`

**handleKillTypeWithAutoConfirm (linha 408):**
```typescript
onAutoFinishPoint?.(side, 'KILL', { 
  attackPlayerId: selectedPlayer, 
  attackCode: 3, 
  killType: type 
});
```

**handleCodeWithAutoConfirm - Attack Error (linha 321):**
```typescript
onAutoFinishPoint?.(opponent, 'AE', {
  attackPlayerId: selectedPlayer,
  attackCode: 0
});
```

**handleBlockCodeWithAutoConfirm - Block Fault (linha 367):**
```typescript
onAutoFinishPoint?.(side, 'BLK', {
  attackPlayerId: selectedPlayer,
  attackCode: 1,
  blockCode: 0
});
```

**handleStuffBlockConfirm (linha 395):**
```typescript
onAutoFinishPoint?.(blockerSide, 'BLK', {
  attackPlayerId: selectedPlayer,
  attackCode: 1,
  blockCode: 3,
  blocker1Id: blockerId
});
```

### 3. Atualizar `handleAutoFinishPoint` no Live.tsx

**Ficheiro:** `src/pages/Live.tsx` (linha 1501-1504)

```typescript
interface AttackOverrides {
  attackPlayerId?: string | null;
  attackCode?: number | null;
  killType?: KillType | null;
  blockCode?: number | null;
  blocker1Id?: string | null;
}

const handleAutoFinishPoint = useCallback((
  winner: Side, 
  reason: Reason,
  attackOverrides?: AttackOverrides
) => {
  handleFinishPoint(winner, reason, undefined, attackOverrides);
}, [handleFinishPoint]);
```

### 4. Atualizar `handleFinishPoint` para Usar Overrides

**Ficheiro:** `src/pages/Live.tsx` (linha 1232)

```typescript
const handleFinishPoint = async (
  winner: Side, 
  reason: Reason, 
  faultPlayerId?: string | null,
  attackOverrides?: AttackOverrides
) => {
  // ... código existente ...
  
  const attackAction = registeredActions.find(a => a.type === 'attack');
  
  // Priorizar overrides sobre registeredActions
  const effectiveAttackPlayerId = attackOverrides?.attackPlayerId ?? attackAction?.playerId ?? null;
  const effectiveAttackCode = attackOverrides?.attackCode ?? attackAction?.code ?? null;
  const effectiveKillType = attackOverrides?.killType ?? attackAction?.killType ?? null;
  const effectiveBlockCode = attackOverrides?.blockCode ?? attackAction?.blockCode ?? null;
  const effectiveBlocker1Id = attackOverrides?.blocker1Id ?? blockAction?.b1PlayerId ?? null;
  
  const rallyData: Partial<Rally> = {
    // ... outros campos ...
    a_player_id: effectiveAttackPlayerId,
    a_no: getPlayerNo(effectiveAttackPlayerId),
    a_code: effectiveAttackCode,
    kill_type: effectiveAttackCode === 3 ? effectiveKillType : null,
    b1_player_id: effectiveBlocker1Id,
    b1_no: getPlayerNo(effectiveBlocker1Id),
    b_code: effectiveBlockCode ?? blockAction?.code ?? null,
    // ...
  };
  
  // Atualizar lastAttacker se temos dados válidos
  if (effectiveAttackPlayerId && effectiveAttackCode !== null) {
    const attackerPlayer = effectivePlayers.find(p => p.id === effectiveAttackPlayerId);
    if (attackerPlayer) {
      setLastAttacker({
        playerId: effectiveAttackPlayerId,
        playerNumber: attackerPlayer.jersey_number,
        playerName: attackerPlayer.name || '',
        side: attackAction?.side || gameState.recvSide,
      });
    }
  }
};
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/ActionEditor.tsx` | Expandir interface `onAutoFinishPoint` e passar overrides em todas as chamadas |
| `src/pages/Live.tsx` | Atualizar `handleAutoFinishPoint` e `handleFinishPoint` para processar overrides |

---

## Critérios de Sucesso

- Atacante #8 aparece corretamente em kills e blockouts
- `kill_type` (FLOOR/BLOCKOUT) gravado corretamente
- Erros de ataque gravam o atacante
- Stuff blocks gravam atacante e bloqueador
- `lastAttacker` atualizado corretamente para modo ultra-rápido

---

## Validação

1. Registar Receção → Distribuição (destino P4) → Ataque #8 → Kill → Blockout
2. Verificar no RallyHistory que atacante #8 e kill_type BLOCKOUT aparecem
3. Verificar na tabela Stats que a coluna "Atq" mostra "#8 3 BLK"
4. Testar erro de ataque: verificar que atacante aparece
5. Testar stuff block: verificar que atacante e bloqueador aparecem

