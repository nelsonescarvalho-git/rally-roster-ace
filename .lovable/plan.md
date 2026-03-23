

## Problema

Quando um líbero foi (incorretamente) incluído na formação inicial de 6 jogadores, as trocas de líbero não funcionam corretamente:

**Equipa FORA:** O líbero #20 substituiu o #10, mas o #10 continua a aparecer no campo (na posição antiga do líbero). Ambos #10 e #20 estão visíveis em vez de apenas o #20.

**Equipa CASA:** O líbero #5 substituiu o #6, mas a troca de posições coloca o líbero numa slot de rotação que eventualmente atinge a zona de rede (front row) — algo que nunca deveria acontecer.

**Causa raiz:** Em `getActiveLineup`, quando o líbero JÁ está na formação e uma substituição de líbero ocorre, o código faz um "swap" — mantendo ambos os jogadores no campo. Para substituições normais isto está correto, mas para líberos o jogador substituído deve SAIR do campo.

## Plano

### 1. Corrigir `getActiveLineup` em `src/hooks/useMatch.ts`

Alterar a lógica de substituições para tratar `is_libero=true` de forma diferente quando o líbero já está na formação:

- **Substituição de líbero com líbero já na formação:** Em vez de fazer swap (que mantém ambos), colocar o líbero na posição do jogador que sai e **remover** a posição antiga do líbero (marcar como vazia). O jogador que sai deixa de estar no campo.
- **Substituições normais** (não-líbero) e **substituições de líbero sem conflito**: comportamento inalterado.

Resultado: o campo mostra 5 jogadores quando o lineup tem dados inválidos (líbero na formação inicial), o que é mais correto do que mostrar um jogador que deveria estar no banco ou ter o líbero na rede.

### 2. Corrigir `mustExitLibero` em `src/hooks/useLiberoTracking.ts`

O check atual verifica a zona do jogador substituído. Quando esse jogador permanece no lineup (por swap), a zona dele é diferente da zona do líbero, causando falsos positivos/negativos.

**Fix:** Verificar sempre a zona do **líbero** em vez do jogador substituído. Se a zona do líbero é ≥ 2 e ≤ 4 (front row), deve sair. Isto simplifica e corrige o check independentemente do estado do lineup.

### Detalhes Técnicos

**`getActiveLineup` (linhas 399-411):**
```
for (const sub of relevantSubs) {
  const outIndex = activePlayerIds.indexOf(sub.player_out_id);
  if (outIndex !== -1) {
    const inIndex = activePlayerIds.indexOf(sub.player_in_id);
    if (inIndex !== -1 && inIndex !== outIndex) {
      if (sub.is_libero) {
        // Libero in starting lineup: remove old slot, don't keep outgoing player
        activePlayerIds[inIndex] = '';
      } else {
        activePlayerIds[inIndex] = sub.player_out_id;
      }
    }
    activePlayerIds[outIndex] = sub.player_in_id;
  }
}
// Filter empty + deduplicate
return activePlayerIds.filter(id => id && !seen...);
```

**`mustExitLibero` (useLiberoTracking.ts):**
```
// Always check libero's own zone
const liberoZone = getPlayerZone(currentSet, side, 
  currentLiberoState.liberoId!, rotation, currentRally);
return liberoZone === 4;
```

