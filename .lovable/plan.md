

## Plano: Auto-Chain de Ações para Melhorar UX

### Objetivo
Quando uma ação não termina o ponto mas define claramente a próxima ação lógica, abrir automaticamente essa ação em vez de voltar ao menu de seleção.

---

### Ações que Devem Encadear Automaticamente

| Ação Atual | Resultado | Próxima Ação | Equipa |
|------------|-----------|--------------|--------|
| Ataque | `a_code=2` (Defendido) | **Defesa** | Adversário |
| Bloco | `b_code=1` (Ofensivo) | **Defesa** | Atacante (bola vai para o lado do ataque) |
| Bloco | `b_code=2` (Defensivo) | **Ataque** | Bloqueador (bola fica no lado do bloco) |
| Serviço | `s_code=1,2` (não-terminal) | Receção | Já funciona |
| Receção | qualquer código | Seleção | Já funciona |

---

### Arquitetura da Solução

```text
┌──────────────────────────────────────────────────────────────────┐
│                      ActionEditor.tsx                            │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  User selects a_code=2 (Defendido)                         │ │
│  │       ↓                                                    │ │
│  │  1. onCodeChange(2)  ← registar código                     │ │
│  │  2. onConfirm()      ← confirmar ação                      │ │
│  │  3. onChainAction('defense', opponentSide) ← NOVO!         │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
           ↓
┌──────────────────────────────────────────────────────────────────┐
│                        Live.tsx                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  handleChainAction(type, side)                             │ │
│  │       ↓                                                    │ │
│  │  handleSelectAction(type, side)  ← reutiliza lógica        │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

### 1. Alterar `ActionEditor.tsx`

**Adicionar nova prop:**

```typescript
interface ActionEditorProps {
  // ... existing props
  onAutoFinishPoint?: (winner: Side, reason: Reason) => void;
  onChainAction?: (type: RallyActionType, side: Side) => void;  // NEW
}
```

**Atualizar `handleCodeWithAutoConfirm` para ataque (a_code=2):**

```typescript
// code 2 (defended) - auto-confirm, then chain to defense
const player = players.find(p => p.id === selectedPlayer);
const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
requestAnimationFrame(() => {
  setTimeout(() => {
    showConfirmToast(player?.jersey_number, code);
    onConfirm();
    // Chain to defense action for opponent
    onChainAction?.('defense', opponent);
  }, 0);
});
```

**Atualizar `handleBlockCodeWithAutoConfirm` para bloco (b_code=1,2):**

```typescript
if (bCode === 1) {
  // Ofensivo: ball playable in attacker's court → defense for attacker
  onChainAction?.('defense', side);
} else if (bCode === 2) {
  // Defensivo: ball playable in blocker's court → attack for blocker
  const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
  onChainAction?.('attack', blockerSide);
}
```

---

### 2. Alterar `Live.tsx`

**Criar handler para chain action:**

```typescript
// Chain action handler (reuses handleSelectAction)
const handleChainAction = useCallback((type: RallyActionType, side: Side) => {
  handleSelectAction(type, side);
}, [handleSelectAction]);
```

**Passar prop para ActionEditor:**

```tsx
<ActionEditor
  // ... existing props
  onAutoFinishPoint={handleAutoFinishPoint}
  onChainAction={handleChainAction}  // NEW
  onCancel={handleCancelAction}
  // ...
/>
```

---

### Fluxo Visual Final

**Antes (3+ cliques para rally com defesa):**
```text
1. Seleciona atacante → registar ataque Defendido
2. Volta ao menu de ações
3. Clica em "Defesa" no menu
4. Seleciona defensor → registar defesa
```

**Depois (fluxo contínuo):**
```text
1. Seleciona atacante → registar ataque Defendido
   ↓ automático
2. Abre imediatamente editor de Defesa (adversário)
3. Seleciona defensor → registar defesa
```

---

### Lógica Completa de Encadeamento

| Ação | Código | Resultado | Próxima Ação | Equipa |
|------|--------|-----------|--------------|--------|
| Ataque | `a_code=0` | Erro | ~~Chain~~ Auto-finish | Adversário ganha |
| Ataque | `a_code=1` | Bloco | Step 3 (b_code) | - |
| Ataque | `a_code=2` | **Defendido** | **Defesa** | **Adversário** |
| Ataque | `a_code=3` | Kill | ~~Chain~~ Auto-finish | Atacante ganha |
| Bloco | `b_code=0` | Falta | ~~Chain~~ Auto-finish | Atacante ganha |
| Bloco | `b_code=1` | **Ofensivo** | **Defesa** | **Atacante** |
| Bloco | `b_code=2` | **Defensivo** | **Ataque** | **Bloqueador** |
| Bloco | `b_code=3` | Ponto | ~~Chain~~ Auto-finish | Bloqueador ganha |

---

### Ficheiros a Alterar

| Ficheiro | Alteração | Descrição |
|----------|-----------|-----------|
| `src/components/live/ActionEditor.tsx` | Props + handlers | Adicionar onChainAction, atualizar handlers |
| `src/pages/Live.tsx` | Handler + prop | Criar handleChainAction, passar para ActionEditor |

---

### Benefícios

1. **Menos cliques**: Fluxo contínuo sem voltar ao menu
2. **UX natural**: Segue a lógica do jogo (ataque defendido → defesa)
3. **Consistência**: Mesma abordagem para todas as ações que continuam o rally
4. **Flexível**: O utilizador pode sempre cancelar e escolher outra ação se necessário

