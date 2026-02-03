

## Plano: Encadear Automaticamente Distribuição → Ataque

### Análise do Estado Atual

A função `handleDestinationWithAutoConfirm` (linhas 392-411) é responsável por confirmar a ação de **Distribuição** após o utilizador selecionar o destino. Atualmente, após `onConfirm()`, a ação termina sem encadear para a próxima ação lógica.

```typescript
// Código atual - Linhas 392-411
const handleDestinationWithAutoConfirm = useCallback((dest: PassDestination) => {
  // ... validações ...
  
  setTimeout(() => {
    showConfirmToast(player?.jersey_number, selectedPassCode ?? 2);
    onConfirm(); // Confirma e termina - NÃO encadeia!
  }, 50);
}, [selectedDestination, selectedSetter, selectedPassCode, players, onDestinationChange, onConfirm, showConfirmToast]);
```

---

### Solução

Adicionar `onChainAction?.('attack', side)` logo após `onConfirm()` para abrir automaticamente a ação de **Ataque** para a mesma equipa.

---

### Alterações Técnicas

**Ficheiro:** `src/components/live/ActionEditor.tsx`

#### Linhas 392-411 - Atualizar `handleDestinationWithAutoConfirm`:

```typescript
const handleDestinationWithAutoConfirm = useCallback((dest: PassDestination) => {
  if (selectedDestination === dest) {
    onDestinationChange?.(null);
    return;
  }
  
  onDestinationChange?.(dest);
  
  // Only auto-confirm if setter is selected
  if (!selectedSetter) {
    toast.warning('Selecione um distribuidor primeiro');
    return;
  }
  
  const player = players.find(p => p.id === selectedSetter);
  setTimeout(() => {
    showConfirmToast(player?.jersey_number, selectedPassCode ?? 2);
    onConfirm();
    // Encadear automaticamente para Ataque na mesma equipa
    onChainAction?.('attack', side);
  }, 50);
}, [selectedDestination, selectedSetter, selectedPassCode, players, onDestinationChange, onConfirm, showConfirmToast, onChainAction, side]);
```

---

### Fluxo Resultante

| Ação | Utilizador faz | Sistema faz |
|------|----------------|-------------|
| **Distribuição Step 1** | Seleciona distribuidor | Avança para Step 2 |
| **Distribuição Step 2** | Seleciona qualidade | Avança para Step 3 |
| **Distribuição Step 3** | Seleciona destino | Confirma + **Abre Ataque automaticamente** |
| **Ataque Step 1** | Seleciona atacante | ... |

---

### Resumo das Alterações

| Ficheiro | Linhas | Alteração |
|----------|--------|-----------|
| `src/components/live/ActionEditor.tsx` | 407-411 | Adicionar `onChainAction?.('attack', side)` após `onConfirm()` |
| `src/components/live/ActionEditor.tsx` | 411 | Atualizar dependências do `useCallback` para incluir `onChainAction` e `side` |

---

### Benefícios

1. **Fluxo contínuo**: Após distribuir, o Ataque abre automaticamente
2. **Menos cliques**: Elimina necessidade de selecionar manualmente a ação Ataque
3. **Consistência**: Segue o padrão já implementado para Ataque → Defesa

