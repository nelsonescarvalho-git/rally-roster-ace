

## Plano: Corrigir Encadeamento do Tipo de Bloco

### Problema Identificado

Na função `handleBlockCodeWithAutoConfirm` (linhas 342-348), a lógica de encadeamento está **invertida**:

| Tipo de Bloco | Comportamento Atual (ERRADO) | Comportamento Correto |
|---------------|------------------------------|----------------------|
| **Bloco Ofensivo** (b_code=1) | Abre Defesa para equipa **atacante** | Deve abrir Defesa para equipa **bloqueadora** |
| **Bloco Defensivo** (b_code=2) | Abre Ataque para equipa **bloqueadora** | Deve abrir Defesa para equipa **atacante** |

---

### Explicação Semântica do Voleibol

**Bloco Ofensivo** ("Bola jogável campo adversário"):
- O bloco toca a bola e ela fica jogável no campo do **bloqueador** (adversário do atacante)
- A equipa que **bloqueia** precisa defender a própria bola
- ➡️ Próxima ação: **Defesa** para equipa **bloqueadora**

**Bloco Defensivo** ("Bola jogável campo bloqueador"):
- O bloco toca a bola e ela volta para o campo do **atacante**
- A equipa que **atacou** precisa defender
- ➡️ Próxima ação: **Defesa** para equipa **atacante**

---

### Código Atual (Errado)

```typescript
} else if (bCode === 1) {
  // Offensive block: ball playable in attacker's court → defense for attacker
  onChainAction?.('defense', side);  // side = atacante (ERRADO)
} else if (bCode === 2) {
  // Defensive block: ball playable in blocker's court → attack for blocker
  const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
  onChainAction?.('attack', blockerSide);  // attack para bloqueador (ERRADO)
}
```

---

### Código Corrigido

```typescript
} else if (bCode === 1) {
  // Bloco Ofensivo: bola jogável no campo do bloqueador → defesa para bloqueador
  const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
  onChainAction?.('defense', blockerSide);
} else if (bCode === 2) {
  // Bloco Defensivo: bola volta ao campo do atacante → defesa para atacante
  onChainAction?.('defense', side);
}
```

---

### Alteração

| Ficheiro | Linha | Alteração |
|----------|-------|-----------|
| `src/components/live/ActionEditor.tsx` | 342-348 | Corrigir lógica de encadeamento para b_code 1 e 2 |

---

### Fluxo Corrigido

**Bloco Ofensivo (b_code=1):**
```text
Ataque (CASA) → Bloco → Bloco Ofensivo
                         ↓
                    Defesa abre para FORA (bloqueador)
```

**Bloco Defensivo (b_code=2):**
```text
Ataque (CASA) → Bloco → Bloco Defensivo
                         ↓
                    Defesa abre para CASA (atacante)
```

