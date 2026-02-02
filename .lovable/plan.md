
## Simplificação: Mostrar Todas as Posições de Ataque na Distribuição

### Objetivo
Remover o filtro que limita as posições de ataque disponíveis com base na qualidade do passe. Na ação "Distribuição", devem aparecer **sempre todas as 7 opções**: P2, P3, P4, OP, PIPE, BACK, OUTROS.

---

### Alteração em `src/components/live/ActionEditor.tsx`

**Linhas 133-136** - Simplificar a lógica:

```typescript
// ANTES:
const availablePositions = receptionCode !== null && receptionCode !== undefined
  ? POSITIONS_BY_RECEPTION[receptionCode] || DESTINATIONS
  : DESTINATIONS;

// DEPOIS:
// Always show all positions - simplified UX
const availablePositions = DESTINATIONS;
```

---

### Resultado

| Antes | Depois |
|-------|--------|
| P2, P4, OP, PIPE, OUTROS (com Q2) | P2, **P3**, P4, OP, PIPE, **BACK**, OUTROS |
| Filtro baseado na qualidade | Todas as posições sempre visíveis |

---

### Ficheiro a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/ActionEditor.tsx` | Remover lógica de filtro (~3 linhas → 1 linha) |
