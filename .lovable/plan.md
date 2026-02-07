
# Plano: Corrigir Seleção de Bloqueador (Stuff Block) e Filtrar Zonas

## ✅ IMPLEMENTADO

### Problemas Corrigidos

1. **Lineup Errado no Step 4** - Agora mostra jogadores da equipa adversária (quem bloqueou)
2. **Líberos nas Opções de Bloco** - Jogadores L/LIBERO são excluídos de todas as opções de bloco
3. **Jogadores Fora da Zona de Ataque** - Apenas jogadores em Z2, Z3 ou Z4 aparecem como bloqueadores elegíveis

### Ficheiros Alterados

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Live.tsx` | Criada função `getOpponentBlockers()` que filtra adversários por zona (Z2,Z3,Z4) e exclui líberos. Atualizada `getPlayersForAction` para excluir líberos de serve/block. |
| `src/components/live/ActionEditor.tsx` | Adicionada prop `opponentBlockers`. Criado `blockersPool` que usa `opponentBlockers` no Step 4. UI atualizada para mostrar mensagem quando não há bloqueadores elegíveis. |

### Lógica Implementada

```typescript
// getOpponentBlockers - Live.tsx
const getOpponentBlockers = (attackerSide: Side): Player[] => {
  const blockerSide = attackerSide === 'CASA' ? 'FORA' : 'CASA';
  const onCourt = getPlayersOnCourt(currentSet, blockerSide, rally);
  
  return onCourt.filter(player => {
    // Excluir líberos
    const pos = player.position?.toUpperCase();
    if (pos === 'L' || pos === 'LIBERO') return false;
    
    // Apenas linha de ataque (Z2, Z3, Z4)
    const zone = getPlayerZone(currentSet, blockerSide, player.id, rotation, rally);
    return zone !== null && [2, 3, 4].includes(zone);
  });
};
```

### Critérios de Sucesso ✅

- [x] Step 4 mostra jogadores da equipa **adversária** (quem bloqueou)
- [x] Líberos são **excluídos** de todas as opções de bloco
- [x] Apenas jogadores em **Z2, Z3 ou Z4** aparecem como bloqueadores elegíveis
- [x] A ação `'block'` separada também filtra líberos
- [x] Se não houver bloqueadores elegíveis, mostra mensagem apropriada
- [x] O ponto é atribuído à equipa correta após seleção do bloqueador
