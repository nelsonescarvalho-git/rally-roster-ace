

# Plano: Permitir Entrada do Líbero no Início do Set para Ambas as Equipas

## Problema Identificado

Atualmente, o sistema só sugere a entrada do líbero para a equipa que **recebe** (`isReceiving = true`). Isto ignora uma situação comum no voleibol:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    INÍCIO DO SET - Regras Oficiais                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Árbitro verifica lineup inicial (6 jogadores por equipa)        │
│  2. Apito para início do jogo                                       │
│  3. AMBAS as equipas podem substituir jogador pelo líbero:          │
│     • Equipa que SERVE: Z5 ou Z6 (MB na linha de trás)              │
│     • Equipa que RECEBE: Z1, Z5 ou Z6 (MB na linha de trás)         │
│                                                                     │
│  O sistema atual só contempla a equipa que recebe!                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

Na imagem do utilizador, a equipa **Liceu** (que recebe) tem o líbero #14 em campo, mas a equipa **Póvoa** (que serve) não teve a opção de colocar o seu líbero.

---

## Solução

Alterar a lógica de elegibilidade para permitir entrada do líbero:

| Condição | Antes | Depois |
|----------|-------|--------|
| Equipa que recebe | ✅ Permitido | ✅ Permitido |
| Equipa que serve (rally 1) | ❌ Bloqueado | ✅ Permitido |
| Equipa que serve (rally > 1) | ❌ Bloqueado | ❌ Bloqueado |

**Regra**: A equipa que serve só pode entrar o líbero no **rally 1** de cada set (início do set).

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useLiberoTracking.ts` | Adicionar parâmetro `isSetStart` para permitir entrada mesmo quando não recebe |
| `src/pages/Live.tsx` | Passar `isSetStart` (rally === 1) ao hook de libero tracking |
| `src/components/live/LiberoCard.tsx` | Nenhuma alteração necessária (já suporta `canEnter`) |

---

## Implementação Técnica

### 1. useLiberoTracking.ts - Nova Lógica

```typescript
interface UseLiberoTrackingProps {
  // ... existentes
  isReceiving: boolean;
  isSetStart: boolean;  // NOVO: true quando currentRally === 1
}

// shouldPromptLiberoEntry - Lógica atualizada
const shouldPromptLiberoEntry = useMemo(() => {
  if (availableLiberos.length === 0) return false;
  if (currentLiberoState.isOnCourt) return false;
  if (eligibleForLiberoEntry.length === 0) return false;
  
  // ANTES: só quando recebe
  // if (!isReceiving) return false;
  
  // DEPOIS: quando recebe OU no início do set (rally 1)
  if (!isReceiving && !isSetStart) return false;
  
  return true;
}, [availableLiberos, currentLiberoState.isOnCourt, isReceiving, isSetStart, eligibleForLiberoEntry]);
```

### 2. Elegibilidade de Zonas para Equipa que Serve

A equipa que serve no início do set:
- **Z1**: Jogador a servir (normalmente não se substitui)
- **Z5, Z6**: Jogadores na linha de trás - **elegíveis para líbero**

```typescript
// eligibleForLiberoEntry - Lógica atualizada
const eligibleForLiberoEntry = useMemo(() => {
  // ...
  
  // Zonas elegíveis dependem de ser equipa que serve ou recebe
  const eligibleZones = isReceiving 
    ? [1, 5, 6]  // Equipa que recebe: Z1, Z5, Z6
    : [5, 6];    // Equipa que serve: apenas Z5, Z6 (Z1 está a servir)
  
  return onCourt.filter(player => {
    if (liberoIds.has(player.id)) return false;
    const zone = getPlayerZone(currentSet, side, player.id, rotation, currentRally);
    return zone !== null && eligibleZones.includes(zone);
  });
}, [/* ... */]);
```

### 3. Live.tsx - Passar isSetStart

```typescript
const liberoTrackingHome = useLiberoTracking({
  matchId: matchId || null,
  currentSet,
  side: 'CASA',
  currentRally: gameState?.currentRally || 1,
  rotation: gameState?.serveSide === 'CASA' ? (gameState?.serveRot || 1) : (gameState?.recvRot || 1),
  isReceiving: gameState?.recvSide === 'CASA',
  isSetStart: (gameState?.currentRally || 1) === 1,  // NOVO
  substitutions: substitutions || [],
  getPlayersForSide,
  getPlayersOnCourt,
  getPlayerZone,
  makeSubstitution,
});

// Mesmo para liberoTrackingAway
```

---

## Fluxo de Utilização Após Alteração

### Cenário: Início do Set 1

1. **Rally 1** - Póvoa serve, Liceu recebe
2. Sistema mostra:
   - **Liceu (recebe)**: Prompt automático para entrar líbero (Z1, Z5, Z6)
   - **Póvoa (serve)**: Botão "Entrar" disponível no LiberoCard (Z5, Z6)
3. Utilizador pode:
   - Confirmar entrada do líbero Liceu
   - Clicar no LiberoCard para entrar líbero Póvoa
4. Após rally 1:
   - Equipa que serve já não pode entrar líbero (a não ser que ganhe ponto e se torne receptora)

---

## Diagrama de Elegibilidade

```text
                     Rally 1              Rally > 1
                 ┌─────────────┐     ┌─────────────┐
   Equipa que    │ Z1, Z5, Z6  │     │ Z1, Z5, Z6  │
   RECEBE        │  ✅ Elegível │     │  ✅ Elegível │
                 └─────────────┘     └─────────────┘
                 
                 ┌─────────────┐     ┌─────────────┐
   Equipa que    │   Z5, Z6    │     │     ---     │
   SERVE         │  ✅ Elegível │     │ ❌ Não mostrar│
                 └─────────────┘     └─────────────┘
```

---

## Considerações Adicionais

1. **Não mostrar prompt automático para equipa que serve** - apenas disponibilizar o botão "Entrar" no LiberoCard
2. **Jogador a servir (Z1) não deve ser substituído** - a regra oficial permite, mas é extremamente raro
3. **Recomendação mantém-se para MB** - quando o Central está em Z5 ou Z6

---

## Critérios de Sucesso

- No rally 1, ambas as equipas têm a opção de entrar o líbero
- A equipa que serve só pode entrar líbero para Z5 ou Z6 (não Z1)
- Após o rally 1, a equipa que serve perde a opção de entrar líbero
- O prompt automático continua a aparecer apenas para a equipa que recebe
- O LiberoCard mostra "Entrar" para ambas as equipas quando aplicável

