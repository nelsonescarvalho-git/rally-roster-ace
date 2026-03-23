

## Corrigir Validação do Bloco — "Selecione um jogador primeiro"

### Problema

No passo 2 do Bloco (Avaliação do Bloco), ao selecionar uma qualidade (ex: "Ofensivo"), a validação em `handleCodeWithAutoConfirm` verifica `selectedPlayer` (linha 267). Mas no fluxo de bloco, os jogadores são selecionados via `selectedBlocker1/2/3` — não via `selectedPlayer`. Assim, `selectedPlayer` é sempre `null` no passo 2 e o toast de erro dispara incorretamente.

### Correção em `src/components/live/ActionEditor.tsx`

**Linhas 266-270**: Substituir a verificação de `selectedPlayer` por `selectedBlocker1` para a ação de bloco:

```typescript
if (actionType === 'block') {
  if (!selectedBlocker1) {
    toast.warning('Selecione um jogador primeiro');
    return;
  }
```

Também ajustar a linha 271 para buscar o jogador correto do `blockersPool` em vez de `players`:

```typescript
const player = blockersPool.find(p => p.id === selectedBlocker1);
```

### Ficheiros afetados
- `src/components/live/ActionEditor.tsx` (2 linhas alteradas)

