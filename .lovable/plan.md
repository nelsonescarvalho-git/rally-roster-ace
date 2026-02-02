

## Plano: Adicionar "Falta na Rede" com Registo de Jogador Infrator

### Resumo
Adicionar nova opção "Falta Rede" (NET) no PointFinisher que, ao ser selecionada, abre um popup para selecionar o jogador que cometeu a falta. O jogador infrator será registado na base de dados e contabilizado nas estatísticas de erros.

---

### 1. Base de Dados: Novos Campos na Tabela `rallies`

Adicionar campos específicos para registar faltas na rede:

```sql
ALTER TABLE public.rallies 
  ADD COLUMN fault_player_id UUID,
  ADD COLUMN fault_no INTEGER;

COMMENT ON COLUMN rallies.fault_player_id IS 'Jogador que cometeu falta (rede, toque na rede, invasão)';
COMMENT ON COLUMN rallies.fault_no IS 'Número do jogador que cometeu a falta';
```

---

### 2. Tipos TypeScript

**Atualizar `src/types/volleyball.ts`:**

```typescript
// Linha 2: Adicionar 'NET' ao tipo Reason
export type Reason = 'ACE' | 'SE' | 'KILL' | 'AE' | 'BLK' | 'DEF' | 'OP' | 'NET';

// Interface Rally: Adicionar campos fault
export interface Rally {
  // ... existentes
  fault_player_id: string | null;
  fault_no: number | null;
}
```

---

### 3. Atualizar `PointFinisher.tsx`

**Estrutura (~180 linhas):**

```tsx
interface PointFinisherProps {
  actions: RallyAction[];
  homeName: string;
  awayName: string;
  onFinishPoint: (winner: Side, reason: Reason, faultPlayerId?: string | null) => void;
  suggestedOutcome?: { winner: Side; reason: Reason } | null;
  // NOVO: Props para seleção de jogador
  playersOnCourt: { casa: Player[]; fora: Player[] };
  playersOnBench: { casa: Player[]; fora: Player[] };
}

const REASON_OPTIONS = [
  { value: 'KILL', label: 'Kill', emoji: '🏐' },
  { value: 'ACE', label: 'ACE', emoji: '🎯' },
  { value: 'SE', label: 'Erro Serviço', emoji: '❌' },
  { value: 'AE', label: 'Erro Ataque', emoji: '💥' },
  { value: 'BLK', label: 'Bloco', emoji: '🚫' },
  { value: 'OP', label: 'Out/Falta', emoji: '📍' },
  { value: 'NET', label: 'Falta Rede', emoji: '🕸️' },  // NOVO
];
```

**Lógica:**
1. Ao clicar "Falta Rede", guarda o `side` e `reason` temporariamente
2. Abre `PlayerSelectorPopup` com os jogadores da equipa que cometeu a falta
3. Após selecionar jogador, chama `onFinishPoint(side, 'NET', playerId)`

**UI Fluxo:**
```
┌─────────────────────────────────────┐
│         Terminar Ponto              │
├─────────────────────────────────────┤
│  [CASA]              [FORA]         │
│  ┌─────┐ ┌─────┐    ┌─────┐ ┌─────┐│
│  │Kill │ │ACE  │    │Kill │ │ACE  ││
│  └─────┘ └─────┘    └─────┘ └─────┘│
│  ┌─────┐ ┌─────┐    ┌─────┐ ┌─────┐│
│  │Erro │ │Erro │    │Erro │ │Erro ││
│  │Serv │ │Atq  │    │Serv │ │Atq  ││
│  └─────┘ └─────┘    └─────┘ └─────┘│
│  ┌─────┐ ┌─────┐    ┌─────┐ ┌─────┐│
│  │Bloco│ │Out/ │    │Bloco│ │Out/ ││
│  │     │ │Falta│    │     │ │Falta││
│  └─────┘ └─────┘    └─────┘ └─────┘│
│  ┌───────────────┐  ┌───────────────┐
│  │ 🕸️ Falta Rede │  │ 🕸️ Falta Rede │ ← NOVO (row extra)
│  └───────────────┘  └───────────────┘
└─────────────────────────────────────┘

         ↓ Ao clicar "Falta Rede"

┌─────────────────────────────────────┐
│     Selecionar Jogador Infrator     │ ← PlayerSelectorPopup
├─────────────────────────────────────┤
│  [Pesquisar...]                     │
│  [S] [OH] [MB] [OP] [L]             │
│                                     │
│  Em Campo (6) | Banco               │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ #12 │ │ #7  │ │ #3  │           │
│  │João │ │Pedro│ │Marco│           │
│  └─────┘ └─────┘ └─────┘           │
│  ┌─────┐ ┌─────┐ ┌─────┐           │
│  │ #9  │ │ #15 │ │ #22 │           │
│  │Ana  │ │Luis │ │Rui  │           │
│  └─────┘ └─────┘ └─────┘           │
└─────────────────────────────────────┘
```

---

### 4. Atualizar `handleFinishPoint` em `Live.tsx`

**Alterações (~30 linhas):**

```tsx
// Assinatura atualizada
const handleFinishPoint = async (
  winner: Side, 
  reason: Reason, 
  faultPlayerId?: string | null
) => {
  // ...
  
  const getPlayerNo = (id: string | null | undefined) => {
    if (!id) return null;
    const player = effectivePlayers.find(p => p.id === id);
    return player?.jersey_number || null;
  };
  
  const rallyData: Partial<Rally> = {
    // ... existentes
    
    // NOVO: Falta na rede
    fault_player_id: reason === 'NET' ? faultPlayerId : null,
    fault_no: reason === 'NET' ? getPlayerNo(faultPlayerId) : null,
  };
  
  await saveRally(rallyData);
};
```

**Passar props ao PointFinisher:**

```tsx
<PointFinisher
  actions={registeredActions}
  homeName={match.home_name}
  awayName={match.away_name}
  onFinishPoint={handleFinishPoint}
  suggestedOutcome={autoOutcome}
  // NOVO
  playersOnCourt={{
    casa: getPlayersOnCourt(currentSet, 'CASA', gameState.currentRally),
    fora: getPlayersOnCourt(currentSet, 'FORA', gameState.currentRally),
  }}
  playersOnBench={{
    casa: getPlayersOnBench(currentSet, 'CASA', gameState.currentRally),
    fora: getPlayersOnBench(currentSet, 'FORA', gameState.currentRally),
  }}
/>
```

---

### 5. Estatísticas

A falta na rede será contabilizada nas estatísticas do jogador:
- O campo `fault_player_id` pode ser usado para criar uma nova métrica "Faltas" 
- Ou pode ser agregado aos erros gerais do jogador

---

### 6. Ficheiros a Criar/Alterar

| Ficheiro | Ação | Linhas |
|----------|------|--------|
| `supabase/migrations/` | Adicionar campos `fault_player_id`, `fault_no` | ~10 |
| `src/types/volleyball.ts` | Adicionar `NET` ao Reason, campos no Rally | ~5 |
| `src/components/live/PointFinisher.tsx` | Adicionar botão NET + integrar PlayerSelectorPopup | ~80 |
| `src/pages/Live.tsx` | Atualizar `handleFinishPoint` e props do PointFinisher | ~25 |
| `src/integrations/supabase/types.ts` | Auto-gerado | - |

---

### 7. Fluxo UX Final

```
1. Ponto termina com falta na rede (FORA toca na rede)
2. Utilizador clica "Falta Rede" na coluna FORA
3. Popup abre com jogadores do FORA
4. Seleciona o jogador #7 que tocou na rede
5. Ponto registado: CASA ganha, reason=NET, fault_player_id=#7
6. Toast: "Ponto registado - Falta Rede (#7)"
```

