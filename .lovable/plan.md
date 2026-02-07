
# Plano: Suporte Completo para Dois Líberos

## Objetivo

Implementar as regras oficiais do voleibol para equipas com dois líberos:
1. **Seleção de líbero**: Quando existem 2 líberos, permitir escolher qual entra em campo
2. **Troca líbero-por-líbero**: Permitir substituir um líbero em campo por outro líbero a qualquer momento, sem limite de trocas

---

## Regras Oficiais (FIVB)

```text
┌─────────────────────────────────────────────────────────────────────┐
│                      REGRAS DE LÍBERO                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  • Equipas com 12 jogadores: 1 líbero                               │
│  • Equipas com 13-14 jogadores: 2 líberos                           │
│                                                                     │
│  • Líbero só pode substituir jogadores na linha de trás (Z1,Z5,Z6)  │
│  • Troca de líbero por líbero: ILIMITADA (não conta como sub)       │
│  • Líbero deve sair quando o jogador substituído roda para Z4       │
│                                                                     │
│  NOVO:                                                              │
│  • Se há 2 líberos, o utilizador ESCOLHE qual entra                 │
│  • Se 1 líbero está em campo, pode ser trocado pelo outro líbero    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alterações na Interface

### 1. LiberoPrompt - Seleção de Líbero

Quando existem 2 líberos disponíveis, mostrar seletor:

```text
┌─────────────────────────────────────────────────────────┐
│ 👤 Entrada do Libero                           Fora  ✕ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Escolher líbero:                                       │
│  ┌────────────────────┐  ┌────────────────────┐         │
│  │ #5 Rafael          │  │ #12 Bruno          │         │
│  │      ✓ (ativo)     │  │                    │         │
│  └────────────────────┘  └────────────────────┘         │
│                                                         │
│  #5 Rafael Feliciano entra por:                         │
│  ┌──────────────────────────────────────────────┐       │
│  │ #2 Miguel                                    │       │
│  │    Z1    MB           ⭐ Recomendado         │       │
│  └──────────────────────────────────────────────┘       │
│                                                         │
│          ⌄ Esconder outras opções                       │
│                                                         │
│    ┌───────────────┐    ┌───────────────┐              │
│    │ #7            │    │ #9            │              │
│    │ Nelson C.     │    │ Filipe F.     │              │
│    │    Z5         │    │    Z6         │              │
│    └───────────────┘    └───────────────┘              │
│                                                         │
│  [Não usar libero]                    [Confirmar]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. Troca Líbero-por-Líbero

Quando um líbero está em campo e há outro disponível:

```text
┌─────────────────────────────────────────────────────────┐
│ 🔄 Trocar Líbero                               Fora  ✕ │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  #5 Rafael Feliciano sai                                │
│                    ↓                                    │
│  #12 Bruno Santos entra                                 │
│                                                         │
│  (Troca de líbero por líbero - ilimitada)               │
│                                                         │
│  [Cancelar]                           [Confirmar]       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/LiberoPrompt.tsx` | Adicionar seleção de líbero e suporte para troca L-L |
| `src/hooks/useLiberoTracking.ts` | Adicionar lógica para troca líbero-por-líbero |
| `src/pages/Live.tsx` | Passar lista completa de líberos e adaptar handlers |
| `src/components/live/SubsLiberosCard.tsx` | Mostrar botão de troca L-L quando aplicável |

---

## Detalhes Técnicos

### 1. Atualizar LiberoPromptProps

```typescript
interface LiberoPromptProps {
  type: 'entry' | 'exit' | 'swap';  // NOVO: 'swap' para troca L-L
  side: Side;
  
  // Para entry/swap: lista de líberos disponíveis
  availableLiberos: (Player | MatchPlayer)[];  // NOVO: lista completa
  selectedLiberoId?: string;                    // NOVO: líbero selecionado
  onSelectLibero?: (liberoId: string) => void;  // NOVO: callback seleção
  
  // Para swap: líbero atualmente em campo
  liberoOnCourt?: Player | MatchPlayer | null;  // NOVO
  
  eligiblePlayers?: (Player | MatchPlayer)[];
  playerToReturn?: Player | MatchPlayer | null;
  recommendedPlayer?: Player | MatchPlayer | null;
  getZoneLabel?: (playerId: string) => string;
  onConfirm: (playerId?: string, selectedLiberoId?: string) => void;
  onSkip?: () => void;
  isLoading?: boolean;
  teamColor?: string;
}
```

### 2. useLiberoTracking - Novas Funções

```typescript
// Verificar se pode trocar líbero por líbero
const canSwapLibero = useMemo(() => {
  if (!currentLiberoState.isOnCourt) return false;
  if (availableLiberos.length < 2) return false;
  
  // O outro líbero que não está em campo
  const otherLibero = availableLiberos.find(
    l => l.id !== currentLiberoState.liberoId
  );
  return !!otherLibero;
}, [currentLiberoState, availableLiberos]);

// Obter o outro líbero disponível para troca
const otherAvailableLibero = useMemo(() => {
  if (!currentLiberoState.liberoId) return null;
  return availableLiberos.find(l => l.id !== currentLiberoState.liberoId) || null;
}, [currentLiberoState.liberoId, availableLiberos]);

// Trocar líbero por líbero
const swapLibero = useCallback(async (
  newLiberoId: string
): Promise<boolean> => {
  if (!matchId || !currentLiberoState.isOnCourt) return false;
  if (!currentLiberoState.liberoId || !currentLiberoState.replacedPlayerId) return false;
  
  // A troca líbero-por-líbero é registada como:
  // - Saída do líbero atual (player_out = líbero atual, player_in = jogador original)
  // - Entrada do novo líbero (player_out = jogador original, player_in = novo líbero)
  // MAS para simplificar, podemos registar como substituição direta L-L
  
  // Primeiro: sair o líbero atual
  const exitSuccess = await makeSubstitution(
    currentSet,
    side,
    currentRally,
    currentLiberoState.liberoId,        // Líbero sai
    currentLiberoState.replacedPlayerId, // Jogador original volta
    true
  );
  
  if (!exitSuccess) return false;
  
  // Segundo: entrar o novo líbero
  const entrySuccess = await makeSubstitution(
    currentSet,
    side,
    currentRally,
    currentLiberoState.replacedPlayerId, // Jogador original sai
    newLiberoId,                          // Novo líbero entra
    true
  );
  
  return entrySuccess;
}, [matchId, currentLiberoState, currentSet, side, currentRally, makeSubstitution]);
```

### 3. Lógica de Seleção no LiberoPrompt

```typescript
// Estado local para líbero selecionado
const [selectedLiberoId, setSelectedLiberoId] = useState<string | null>(
  availableLiberos.length === 1 ? availableLiberos[0].id : null
);

// Se há múltiplos líberos, mostrar seletor
{availableLiberos.length > 1 && (
  <div className="space-y-2">
    <span className="text-sm text-muted-foreground">Escolher líbero:</span>
    <div className="grid grid-cols-2 gap-2">
      {availableLiberos.map(libero => (
        <Button
          key={libero.id}
          variant={selectedLiberoId === libero.id ? 'default' : 'outline'}
          className="h-auto py-2 flex flex-col"
          onClick={() => setSelectedLiberoId(libero.id)}
        >
          <span className="font-bold">#{libero.jersey_number}</span>
          <span className="text-xs">{libero.name}</span>
        </Button>
      ))}
    </div>
  </div>
)}
```

### 4. SubsLiberosCard - Botão de Troca

```typescript
// Se líbero está em campo e há outro disponível
if (isOnCourt && canSwapLibero && otherLibero) {
  return (
    <div className="flex items-center gap-2">
      <Badge variant="secondary" className="text-xs gap-1">
        <UserCheck className="h-3 w-3 text-primary" />
        #{liberoPlayer.jersey_number}
      </Badge>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs px-2"
        onClick={() => onLiberoSwap(side)}
      >
        🔄 Trocar
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 text-xs px-2 text-muted-foreground"
        onClick={() => onLiberoExit(side)}
      >
        Sair
      </Button>
    </div>
  );
}
```

---

## Fluxo de Utilização

### Entrada com 2 Líberos

1. Sistema deteta receção com jogador elegível na linha de trás
2. `LiberoPrompt` abre com seletor de líbero (2 opções)
3. Utilizador escolhe qual líbero entra (#5 ou #12)
4. Utilizador escolhe qual jogador sai (MB recomendado)
5. Confirma → substituição registada

### Troca Líbero-por-Líbero

1. Líbero #5 está em campo, substituindo o jogador X
2. Utilizador clica "🔄 Trocar" no SubsLiberosCard
3. Modal de confirmação: "#5 sai → #12 entra"
4. Confirma → duas substituições registadas (saída + entrada)
5. Novo líbero #12 agora substitui o mesmo jogador X

---

## Critérios de Sucesso

- Quando há 2 líberos, o utilizador escolhe qual entra
- O líbero selecionado é claramente indicado na UI
- Troca líbero-por-líbero disponível sempre que aplicável
- O jogador original permanece associado ao novo líbero
- Contagem de substituições não é afetada (é marcada como is_libero=true)
- O sistema mantém consistência do estado após múltiplas trocas
