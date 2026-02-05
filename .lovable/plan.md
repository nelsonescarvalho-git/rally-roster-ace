
## Plano: Corrigir Race Condition na Gravação de `pass_destination`

### Problema Identificado

No `ActionEditor.tsx`, quando o utilizador seleciona um destino de passe (P2, P3, etc.), a sequência é:

```typescript
// Linha 401
onDestinationChange?.(dest);  // setPendingAction({...prev, passDestination: dest})

// Linha 410-414 (50ms depois)
setTimeout(() => {
  onConfirm();  // Lê pendingAction.passDestination - mas pode ainda ser null!
}, 50);
```

O problema é que `setPendingAction` é **assíncrono** em React. Quando `handleConfirmAction` executa, pode ainda estar a ler o valor antigo de `passDestination` (null), porque o React não garantiu que o state foi atualizado.

**Prova**: Na base de dados, de 9 rallies, apenas 1 tem `pass_destination` preenchido, apesar de vários terem `setter_player_id` registado.

---

### Solução

Passar os valores diretamente para o callback `onConfirm`, em vez de depender do state React assíncrono.

---

### Alterações Técnicas

#### 1. Modificar interface do `onConfirm` em `ActionEditor.tsx`

Adicionar parâmetros opcionais para valores que podem ter race conditions:

```typescript
// ActionEditorProps
onConfirm: (overrides?: {
  passDestination?: PassDestination | null;
  passCode?: number | null;
  setterId?: string | null;
}) => void;
```

#### 2. Atualizar `handleDestinationWithAutoConfirm` em `ActionEditor.tsx`

Passar o destino diretamente no callback:

```typescript
const handleDestinationWithAutoConfirm = useCallback((dest: PassDestination) => {
  if (selectedDestination === dest) {
    onDestinationChange?.(null);
    return;
  }
  
  onDestinationChange?.(dest);
  
  if (!selectedSetter) {
    toast.warning('Selecione um distribuidor primeiro');
    return;
  }
  
  const player = players.find(p => p.id === selectedSetter);
  setTimeout(() => {
    showConfirmToast(player?.jersey_number, selectedPassCode ?? 2);
    // PASSAR VALORES DIRECTAMENTE para evitar race condition
    onConfirm({ 
      passDestination: dest,
      passCode: selectedPassCode,
      setterId: selectedSetter,
    });
    onChainAction?.('attack', side);
  }, 50);
}, [...]);
```

#### 3. Atualizar `handleConfirmAction` em `Live.tsx`

Aceitar overrides e usá-los com prioridade:

```typescript
const handleConfirmAction = (overrides?: {
  passDestination?: PassDestination | null;
  passCode?: number | null;
  setterId?: string | null;
}) => {
  if (!pendingAction) return;
  
  const newAction: RallyAction = {
    type: pendingAction.type,
    side: pendingAction.side,
    phase: 1,
    playerId: pendingAction.playerId,
    playerNo: player?.jersey_number || null,
    code: pendingAction.code,
    killType: pendingAction.killType,
    // USAR OVERRIDES COM PRIORIDADE
    setterId: overrides?.setterId ?? pendingAction.setterId,
    passDestination: overrides?.passDestination ?? pendingAction.passDestination,
    passCode: overrides?.passCode ?? pendingAction.passCode,
    // ...resto dos campos
  };
  // ...
};
```

---

### Resumo das Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/ActionEditor.tsx` | Modificar `handleDestinationWithAutoConfirm` para passar valores no `onConfirm()` |
| `src/pages/Live.tsx` | Modificar `handleConfirmAction` para aceitar parâmetros opcionais de override |

---

### Benefícios

1. **Elimina race condition**: Valores passados directamente, não dependem do state assíncrono
2. **Fiabilidade**: Garantia de que `pass_destination` é sempre gravado quando selecionado
3. **Percentagens correctas**: As estatísticas por destino serão atualizadas corretamente
