
# Plano: Corrigir Seleção de Bloqueador (Stuff Block) e Filtrar Zonas

## Problemas Identificados

### Problema 1: Lineup Errado no Step 4
Quando ocorre um "Bloco Ponto" (a_code=1, b_code=3), o sistema mostra os jogadores da equipa **atacante** em vez da equipa **bloqueadora/adversária**.

```text
                      SITUAÇÃO ATUAL (ERRADA)
┌─────────────────────────────────────────────────────────────────────┐
│  Ataque: Liceu (lado CASA)                                          │
│  → Bloqueado (a_code=1, b_code=3 - Stuff Block)                     │
│  → Step 4 mostra: Jogadores do Liceu (atacante)  ❌                 │
│                                                                     │
│  CORRETO:                                                           │
│  → Step 4 deve mostrar: Jogadores do Póvoa (bloqueador/adversário)  │
└─────────────────────────────────────────────────────────────────────┘
```

### Problema 2: Líberos nas Opções de Bloco
Jogadores com posição "L" ou "LIBERO" aparecem como opções de bloqueador, mas pelas regras oficiais **líberos não podem bloquear**.

### Problema 3: Jogadores Fora da Zona de Ataque
Apenas jogadores na **linha de ataque (Z2, Z3, Z4)** podem bloquear legalmente. Jogadores na linha de trás que tentam bloquear cometem falta.

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ZONAS ELEGÍVEIS PARA BLOCO                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│     ┌───────┐   ┌───────┐   ┌───────┐                               │
│     │  Z4   │   │  Z3   │   │  Z2   │  ← LINHA DE ATAQUE            │
│     │  ✅   │   │  ✅   │   │  ✅   │    (podem bloquear)           │
│     └───────┘   └───────┘   └───────┘                               │
│     ═══════════════════════════════════  ← REDE                     │
│                                                                     │
│     ┌───────┐   ┌───────┐   ┌───────┐                               │
│     │  Z5   │   │  Z6   │   │  Z1   │  ← LINHA DE TRÁS              │
│     │  ❌   │   │  ❌   │   │  ❌   │    (bloco = falta)            │
│     └───────┘   └───────┘   └───────┘                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Solução Proposta

### 1. Nova Prop no ActionEditor: `opponentBlockers`

Passar uma lista separada de jogadores elegíveis para bloco (adversário + filtrados):

```typescript
interface ActionEditorProps {
  // ...existentes
  opponentBlockers?: PlayerLike[]; // Jogadores adversários elegíveis para bloco (Z2,Z3,Z4, sem líberos)
}
```

### 2. Atualizar getPlayersForAction para Excluir Líberos do Bloco

```typescript
// Em Live.tsx
const getPlayersForAction = (actionType: RallyActionType, side: Side): Player[] => {
  if (!gameState) return [];
  const onCourt = getPlayersOnCourt(currentSet, side, gameState.currentRally);
  
  // Serve and Block: only players on court (libero cannot serve or block)
  if (actionType === 'serve' || actionType === 'block') {
    // Filtrar líberos explicitamente
    return onCourt.filter(p => {
      const pos = p.position?.toUpperCase();
      return pos !== 'L' && pos !== 'LIBERO';
    });
  }
  
  // Reception, Defense, Setter, Attack: include liberos
  // ... resto da função
};
```

### 3. Nova Função: getOpponentBlockers

```typescript
// Em Live.tsx
const getOpponentBlockers = (attackerSide: Side): Player[] => {
  if (!gameState) return [];
  
  // O bloqueador está no lado OPOSTO ao atacante
  const blockerSide: Side = attackerSide === 'CASA' ? 'FORA' : 'CASA';
  const onCourt = getPlayersOnCourt(currentSet, blockerSide, gameState.currentRally);
  const rotation = blockerSide === gameState.serveSide ? gameState.serveRot : gameState.recvRot;
  
  return onCourt.filter(player => {
    // Excluir líberos
    const pos = player.position?.toUpperCase();
    if (pos === 'L' || pos === 'LIBERO') return false;
    
    // Verificar se está na zona de ataque (Z2, Z3, Z4)
    const zone = getPlayerZone(currentSet, blockerSide, player.id, rotation, gameState.currentRally);
    return zone !== null && [2, 3, 4].includes(zone);
  });
};
```

### 4. Atualizar ActionEditor no Step 4

```typescript
// Em ActionEditor.tsx - Step 4
const blockersPool = useMemo(() => {
  // Usar opponentBlockers se fornecido (para stuff block)
  if (opponentBlockers && opponentBlockers.length > 0) {
    return opponentBlockers;
  }
  // Fallback para players (para ação 'block' separada) - filtrar líberos
  return players.filter(p => {
    const pos = p.position?.toUpperCase();
    return pos !== 'L' && pos !== 'LIBERO';
  });
}, [opponentBlockers, players]);

// Render:
{blockersPool.map((player) => (
  <Button ...>
    #{player.jersey_number}
  </Button>
))}
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Live.tsx` | Criar `getOpponentBlockers()` e passar `opponentBlockers` ao ActionEditor |
| `src/components/live/ActionEditor.tsx` | Adicionar prop `opponentBlockers` e usar no Step 4 |

---

## Fluxo Após Alterações

```text
Ataque do Liceu (CASA) → Bloqueado (a_code=1) → Bloco Ponto (b_code=3)

Step 4: Selecionar Bloqueador
┌─────────────────────────────────────────────────────────┐
│ 🧱 Bloco Ponto                                          │
│    Quem fez o bloco?                                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Póvoa (adversário) - Linha de Ataque:                  │
│                                                         │
│  ┌──────┐ ┌──────┐ ┌──────┐                             │
│  │ #7   │ │ #10  │ │ #12  │  ← Z2, Z3, Z4 apenas       │
│  │ Z4   │ │ Z3   │ │ Z2   │                             │
│  │ OP   │ │ MB   │ │ OH   │                             │
│  └──────┘ └──────┘ └──────┘                             │
│                                                         │
│  ❌ Excluídos:                                          │
│     #14 L (líbero - não pode bloquear)                  │
│     #5 Z5, #9 Z6, #1 Z1 (linha de trás)                 │
│                                                         │
│  [Sem identificar bloqueador →]                         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Critérios de Sucesso

- Step 4 mostra jogadores da equipa **adversária** (quem bloqueou)
- Líberos são **excluídos** de todas as opções de bloco
- Apenas jogadores em **Z2, Z3 ou Z4** aparecem como bloqueadores elegíveis
- A ação `'block'` separada também filtra líberos e zonas
- O ponto é atribuído à equipa correta após seleção do bloqueador
- Se não houver bloqueadores elegíveis, mostrar mensagem apropriada

---

## Considerações Técnicas

### Dependência de getPlayerZone
A função `getPlayerZone` já existe e é usada em outros pontos. Precisamos garantir que a zona é calculada corretamente com base na rotação atual da equipa bloqueadora.

### Fallback se Sem Bloqueadores Elegíveis
Se por algum motivo não houver jogadores elegíveis (todos na linha de trás), o botão "Sem identificar bloqueador" deve ser suficiente para continuar.

