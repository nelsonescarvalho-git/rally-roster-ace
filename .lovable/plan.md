

## Plano: Permitir Escolha de Ação Após "Passou Rede"

### Problema Identificado

Quando a receção é marcada como "Passou Rede", o sistema força automaticamente a abertura de um **Ataque** para o adversário:

```typescript
// handleReceptionOverTheNet (linhas 690-707)
setPendingAction({
  type: 'attack',  // ← Forçado, não permite escolha
  side: opponentSide,
  // ...
  isFreeballAttack: true,
});
```

Isto impede que o utilizador escolha **Defesa** como próxima ação, que é válida quando a "bola de graça" ainda precisa ser controlada.

---

### Solução

1. **Não forçar ataque** após "Passou Rede" - deixar o `ActionSelector` aparecer
2. **Registar `overTheNet: true`** na ação de receção para o sistema saber o contexto
3. **Ajustar inferência de lado** no `ActionSelector` para receções com `overTheNet`
4. **Definir `isFreeballAttack`** apenas quando o utilizador escolhe "Ataque" após receção `overTheNet`

---

### Alterações Técnicas

#### 1. `src/types/volleyball.ts` - Adicionar `overTheNet` a `RallyAction`

```typescript
export interface RallyAction {
  type: RallyActionType;
  side: Side;
  phase: number;
  // ... campos existentes ...
  blockCode?: number | null;
  overTheNet?: boolean; // NOVO: indica se receção passou a rede
}
```

#### 2. `src/pages/Live.tsx` - Modificar `handleReceptionOverTheNet`

**Remover** a criação forçada de `pendingAction` e **adicionar** `overTheNet: true` à ação de receção:

```typescript
const handleReceptionOverTheNet = () => {
  if (!receptionData.playerId) {
    toast({ title: 'Seleciona o recetor', ... });
    return;
  }
  
  const recAction: RallyAction = {
    type: 'reception',
    side: gameState!.recvSide,
    phase: 1,
    playerId: receptionData.playerId,
    code: 0,
    overTheNet: true, // NOVO
  };
  
  setRegisteredActions(prev => {
    const existingIndex = prev.findIndex(a => a.type === 'reception');
    if (existingIndex >= 0) {
      const updated = [...prev];
      updated[existingIndex] = recAction;
      return updated;
    }
    return [...prev, recAction];
  });
  
  setReceptionData(prev => ({ ...prev, code: 0, overTheNet: true }));
  setReceptionCompleted(true);
  
  // REMOVER: setPendingAction({ type: 'attack', ... })
  // → Deixar o ActionSelector aparecer naturalmente
};
```

#### 3. `src/components/live/ActionSelector.tsx` - Ajustar `inferredSide`

Quando a última ação é uma receção com `overTheNet`, o lado inferido deve ser o **adversário**:

```typescript
const inferredSide = useMemo(() => {
  const lastAction = actions[actions.length - 1];
  
  if (!lastAction) {
    return recvSide;
  }
  
  // NOVO: Receção que passou a rede → adversário joga
  if (lastAction.type === 'reception' && lastAction.overTheNet) {
    return lastAction.side === 'CASA' ? 'FORA' : 'CASA';
  }
  
  // Receção normal → mesma equipa continua
  if (lastAction.type === 'reception') {
    return lastAction.side;
  }
  
  // ... resto da lógica existente ...
}, [actions, recvSide]);
```

#### 4. `src/pages/Live.tsx` - Modificar `handleSelectAction`

Detetar quando um ataque é selecionado após receção `overTheNet` e definir `isFreeballAttack`:

```typescript
const handleSelectAction = (type: RallyActionType, side: Side) => {
  // ... código existente para reception ...
  
  let inheritedPassQuality: number | null = null;
  let isFreeballAttackFlag = false; // NOVO
  
  if (type === 'attack') {
    const setterAction = registeredActions.find(a => a.type === 'setter' && a.side === side);
    if (setterAction?.passCode !== null && setterAction?.passCode !== undefined) {
      inheritedPassQuality = setterAction.passCode;
    }
    
    // NOVO: Verificar se é ataque após receção overTheNet
    const lastAction = registeredActions[registeredActions.length - 1];
    if (lastAction?.type === 'reception' && lastAction.overTheNet) {
      isFreeballAttackFlag = true;
    }
  }
  
  setPendingAction({
    type,
    side,
    // ... outros campos ...
    attackPassQuality: inheritedPassQuality,
    isFreeballAttack: isFreeballAttackFlag, // NOVO
  });
};
```

---

### Fluxo Resultante

| Passo | Ação | Resultado |
|-------|------|-----------|
| 1 | Receção → "Passou Rede" | Regista receção com `overTheNet: true`, aparece `ActionSelector` |
| 2 | `ActionSelector` infere lado adversário | Botões Ataque/Defesa/etc. para equipa adversária |
| 3a | Utilizador escolhe **Ataque** | Abre `ActionEditor` com `isFreeballAttack: true` (sem qualidade passe) |
| 3b | Utilizador escolhe **Defesa** | Abre `ActionEditor` para defesa normal |

---

### Resumo das Alterações

| Ficheiro | Localização | Alteração |
|----------|-------------|-----------|
| `src/types/volleyball.ts` | `RallyAction` | Adicionar `overTheNet?: boolean` |
| `src/pages/Live.tsx` | `handleReceptionOverTheNet` | Remover `setPendingAction`, adicionar `overTheNet: true` à receção |
| `src/pages/Live.tsx` | `handleSelectAction` | Detetar `overTheNet` e definir `isFreeballAttack` |
| `src/components/live/ActionSelector.tsx` | `inferredSide` | Inferir lado adversário para receções `overTheNet` |

---

### Benefícios

1. **Flexibilidade**: Utilizador pode escolher Ataque OU Defesa após bola de graça
2. **Fluxo lógico**: Sistema infere automaticamente o lado correto
3. **Dados precisos**: `isFreeballAttack` só é ativado quando Ataque é escolhido
4. **Consistência**: Mantém o comportamento de saltar qualidade de passe para freeballs

