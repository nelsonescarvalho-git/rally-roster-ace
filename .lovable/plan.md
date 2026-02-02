
## Plano: Auto-Finish Point para Ações Definitivas

### Objetivo
Reduzir o número de cliques ao terminar pontos automaticamente quando uma ação é definitiva (resulta em ponto). Exceto "Falta na Rede" que continua a requerer seleção de jogador.

---

### Ações que Terminam em Ponto Automático

| Ação | Código | Significado | Quem ganha | Auto-finish? |
|------|--------|-------------|------------|--------------|
| Ataque | a_code=0 | **Erro** | Adversário | ✅ Sim |
| Ataque | a_code=3 + killType | **Kill** | Atacante | ✅ Sim (após escolher tipo) |
| Ataque→Bloco | b_code=0 | **Falta Bloco** | Atacante | ✅ Sim |
| Ataque→Bloco | b_code=3 | **Bloco Ponto** | Bloqueador | ✅ Sim |
| Serviço | s_code=3 | **ACE** | Servidor | ✅ Sim |
| Serviço | s_code=0 | **Erro Serviço** | Recetor | ✅ Sim |
| Bloco | b_code=3 | **Bloco Ponto** | Bloqueador | ✅ Sim |
| Bloco | b_code=0 | **Falta Bloco** | Adversário | ✅ Sim |

---

### Arquitetura da Solução

```
┌──────────────────────────────────────────────────────────────────┐
│                      ActionEditor                                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  User selects a_code=0 (Erro)                              │ │
│  │       ↓                                                    │ │
│  │  1. onCodeChange(0)  ← registar código                     │ │
│  │  2. onConfirm()      ← confirmar ação                      │ │
│  │  3. onAutoFinishPoint(winner, reason) ← NOVO! fechar ponto │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────────────┐
│                        Live.tsx                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  handleAutoFinishPoint(winner, reason)                     │ │
│  │       ↓                                                    │ │
│  │  handleFinishPoint(winner, reason)  ← reutiliza lógica     │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

### 1. Alterar `ActionEditor.tsx`

**Adicionar nova prop e interface:**

```typescript
interface ActionEditorProps {
  // ... existing props
  onAutoFinishPoint?: (winner: Side, reason: Reason) => void;
}
```

**Atualizar `handleCodeWithAutoConfirm` para atacke (linhas ~228-243):**

```typescript
// Attack: code 0 = error → auto-finish point for opponent
if (actionType === 'attack') {
  if (code === 0) {
    // Error: opponent wins
    onCodeChange(code);
    const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
    requestAnimationFrame(() => {
      setTimeout(() => {
        onConfirm();
        onAutoFinishPoint?.(opponent, 'AE');
      }, 0);
    });
    return;
  }
  
  if (code === 1 || code === 3) {
    // Go to Step 3 for block result (code 1) or kill type (code 3)
    setCurrentStep(3);
    return;
  }
  
  // code 2 (defended) - just confirm, rally continues
  // ... existing code
}
```

**Atualizar `handleKillTypeWithAutoConfirm` (linhas ~263-270):**

```typescript
const handleKillTypeWithAutoConfirm = useCallback((type: KillType) => {
  onKillTypeChange?.(type);
  const player = players.find(p => p.id === selectedPlayer);
  setTimeout(() => {
    showConfirmToast(player?.jersey_number, 3);
    onConfirm();
    // Kill: attacking team wins
    onAutoFinishPoint?.(side, 'KILL');
  }, 50);
}, [onKillTypeChange, onConfirm, onAutoFinishPoint, side, selectedPlayer, players, showConfirmToast]);
```

**Atualizar `handleBlockCodeWithAutoConfirm` (linhas ~247-261):**

```typescript
const handleBlockCodeWithAutoConfirm = useCallback((bCode: number) => {
  onBlockCodeChange?.(bCode);
  const player = players.find(p => p.id === selectedPlayer);
  const bCodeLabels = ['Falta', 'Ofensivo', 'Defensivo', 'Ponto'];
  
  requestAnimationFrame(() => {
    setTimeout(() => {
      toast.success(
        `#${player?.jersey_number || '?'} · Ataque → Bloco ${bCodeLabels[bCode]}`,
        { duration: 2500 }
      );
      onConfirm();
      
      // Auto-finish point based on block result
      if (bCode === 0) {
        // Block fault: attacker wins
        onAutoFinishPoint?.(side, 'BLK'); // side is the attacker
      } else if (bCode === 3) {
        // Stuff block: blocker wins (opponent of attacker)
        const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
        onAutoFinishPoint?.(blockerSide, 'BLK');
      }
      // bCode 1 or 2: rally continues, no auto-finish
    }, 0);
  });
}, [onBlockCodeChange, onConfirm, onAutoFinishPoint, side, selectedPlayer, players]);
```

**Atualizar serviço/receção com auto-finish (serve):**

```typescript
// Serve: code 3 = ACE, code 0 = error
if (actionType === 'serve') {
  if (!selectedPlayer) {
    toast.warning('Selecione um jogador primeiro');
    return;
  }
  
  onCodeChange(code);
  const player = players.find(p => p.id === selectedPlayer);
  
  if (code === 3) {
    // ACE: server wins
    requestAnimationFrame(() => {
      setTimeout(() => {
        showConfirmToast(player?.jersey_number, code);
        onConfirm();
        onAutoFinishPoint?.(side, 'ACE');
      }, 0);
    });
    return;
  }
  
  if (code === 0) {
    // Serve error: receiver wins
    const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
    requestAnimationFrame(() => {
      setTimeout(() => {
        showConfirmToast(player?.jersey_number, code);
        onConfirm();
        onAutoFinishPoint?.(opponent, 'SE');
      }, 0);
    });
    return;
  }
  
  // code 1 or 2: just confirm, continue to reception
  // ... existing code
}
```

---

### 2. Alterar `Live.tsx`

**Criar handler para auto-finish (usar `handleFinishPoint` existente):**

```typescript
// Auto-finish point handler (reuses handleFinishPoint)
const handleAutoFinishPoint = useCallback((winner: Side, reason: Reason) => {
  handleFinishPoint(winner, reason);
}, [handleFinishPoint]);
```

**Passar prop para ActionEditor (linha ~2133):**

```tsx
<ActionEditor
  // ... existing props
  onConfirm={handleConfirmAction}
  onAutoFinishPoint={handleAutoFinishPoint}  // NEW
  onCancel={handleCancelAction}
  // ...
/>
```

---

### 3. Atualizar Labels no QualityPad para Ataque

Já discutimos anteriormente, vamos incluir:

```typescript
<QualityPad
  selectedCode={selectedCode ?? null}
  onSelect={handleCodeWithAutoConfirm}
  labels={{
    0: 'Erro',
    1: 'Bloco',
    2: 'Defendido',
    3: 'Kill',
  }}
/>
```

---

### Fluxo Visual Final

**Antes (3 cliques para erro de ataque):**
```
1. Seleciona "Erro" no QualityPad
2. Confirma ação
3. Clica "Erro Ataque" no PointFinisher
```

**Depois (1 clique):**
```
1. Seleciona "Erro" no QualityPad → Ponto fechado automaticamente ✓
```

---

### Ficheiros a Alterar

| Ficheiro | Alteração | Descrição |
|----------|-----------|-----------|
| `src/components/live/ActionEditor.tsx` | Props + handlers | Adicionar onAutoFinishPoint, atualizar handlers |
| `src/pages/Live.tsx` | Handler + prop | Criar handleAutoFinishPoint, passar para ActionEditor |

---

### Exceções (Sem Auto-Finish)

| Cenário | Motivo |
|---------|--------|
| Ataque Defendido (a_code=2) | Rally continua |
| Bloco Ofensivo (b_code=1) | Rally continua |
| Bloco Defensivo (b_code=2) | Rally continua |
| Falta na Rede (NET) | Requer seleção de jogador |
| Receção (qualquer código) | Rally continua após receção |
| Defesa (qualquer código) | Rally continua após defesa |

---

### Benefícios

1. **Menos cliques**: 1 clique em vez de 3 para ações terminantes
2. **UX mais rápida**: Fluxo natural sem passos redundantes
3. **Consistência**: Mantém seleção de jogador para falta na rede
4. **Feedback imediato**: Toast + ponto fechado instantaneamente

