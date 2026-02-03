
## Plano: Corrigir Registo de `overTheNet` na Receção

### Problema Identificado

Na função `handleReceptionOverTheNet` (linha 669-675), a ação de receção é criada **sem** a propriedade `overTheNet: true`:

```typescript
const recAction: RallyAction = {
  type: 'reception',
  side: gameState!.recvSide,
  phase: 1,
  playerId: receptionData.playerId,
  code: 0, // Comentário menciona overTheNet, mas NÃO é incluído no objeto!
};
```

Posteriormente, em `handleSelectAction` (linha 746), o sistema verifica:
```typescript
if (lastAction?.type === 'reception' && lastAction.overTheNet) {
```

Como `overTheNet` nunca foi definido na receção, a condição é `false` e `isFreeballAttack` nunca é ativado, fazendo com que a "Qualidade do Passe" apareça incorretamente.

---

### Solução

Adicionar `overTheNet: true` ao objeto `recAction` em `handleReceptionOverTheNet`.

---

### Alteração Técnica

**Ficheiro:** `src/pages/Live.tsx`

**Linha 669-675** - Modificar a criação da `recAction`:

```typescript
const recAction: RallyAction = {
  type: 'reception',
  side: gameState!.recvSide,
  phase: 1,
  playerId: receptionData.playerId,
  code: 0,
  overTheNet: true, // ← ADICIONAR ESTA LINHA
};
```

---

### Resumo

| Ficheiro | Linha | Alteração |
|----------|-------|-----------|
| `src/pages/Live.tsx` | 669-675 | Adicionar `overTheNet: true` ao objeto `recAction` |

---

### Resultado Esperado

1. Receção "Passou Rede" é registada com `overTheNet: true`
2. `handleSelectAction` deteta corretamente que é um ataque pós-freeball
3. `isFreeballAttack: true` é passado ao `ActionEditor`
4. "Qualidade do Passe" não aparece, e o indicador "🎁 Bola de Graça" é mostrado
