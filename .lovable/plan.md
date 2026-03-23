

## Corrigir Contagem de Kills por Destino (P4 0/5 → 1/5)

### Problema

Em `useDestinationStatsFromActions.ts`, a lógica "Architecture 2 (Combo)" na linha 73 verifica `action.code` nas ações de setter. Mas o setter guarda a qualidade do passe em `pass_code`, não em `code`. Quando `code` existe no setter (pode ter valor residual), o hook interpreta-o como resultado do ataque (kill/erro/bloco/defendido), executa `continue`, e **nunca correlaciona com a ação de ataque real que se segue** (Architecture 1).

Resultado: kills (incluindo blockouts) não são contados — daí o "0/5 · 0%" no P4.

### Correção — 1 ficheiro

**`src/hooks/useDestinationStatsFromActions.ts`** (linhas 73-79):

Substituir `action.code` por `action.pass_code` na verificação Combo, já que a qualidade da distribuição é armazenada em `pass_code`. Mas na verdade, a Architecture 2 (Combo) usava `code` do setter como proxy do resultado do ataque — isto é incorreto. O setter nunca armazena o resultado do ataque no seu `code`.

**Solução**: Remover completamente o bloco Architecture 2 (Combo). O resultado do ataque vem **sempre** da ação de ataque subsequente (Architecture 1). O setter apenas regista `pass_destination` e `pass_code`.

```typescript
// ANTES (buggy):
if (action.code !== null && action.code !== undefined) {
  if (action.code === 3) stats[dest].kills++;
  // ... interpreta code do setter como resultado de ataque
  continue; // ← pula a correlação com o ataque real
}

// DEPOIS (correto):
// Remover este bloco inteiro. 
// Manter apenas: attempts++ e pendingDestination tracking
```

### Ficheiros afetados
- `src/hooks/useDestinationStatsFromActions.ts` — remover bloco Combo (linhas 72-80)

