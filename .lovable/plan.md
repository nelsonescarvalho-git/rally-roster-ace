

## Plano: Kill Rate Real por Posição de Ataque

### Objetivo
Substituir os indicadores de dificuldade fixos nos botões de destino (P2, P3, P4, OP, PIPE, BACK) por **estatísticas reais de kill rate** calculadas a partir dos dados do jogo atual.

---

### Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────────┐
│                        Live.tsx                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  rallies (do useMatch)                                   │  │
│  │     ↓                                                    │  │
│  │  useDestinationStats(rallies, players, side)             │  │
│  │     ↓                                                    │  │
│  │  destinationStats = {                                    │  │
│  │    P2: { attempts: 5, kills: 2, killRate: 0.40 }        │  │
│  │    P3: { attempts: 3, kills: 1, killRate: 0.33 }        │  │
│  │    P4: { attempts: 10, kills: 6, killRate: 0.60 }       │  │
│  │    ...                                                   │  │
│  │  }                                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
│           ↓                                                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  <ActionEditor                                           │  │
│  │    destinationStats={destinationStats}   ← Nova prop     │  │
│  │  />                                                      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

### 1. Criar Hook `useDestinationStats`

**Ficheiro:** `src/hooks/useDestinationStats.ts`

```typescript
import { useMemo } from 'react';
import { Rally, PassDestination, Side, Player, MatchPlayer } from '@/types/volleyball';

export interface DestinationStats {
  destination: PassDestination;
  attempts: number;
  kills: number;
  errors: number;
  killRate: number;
  efficiency: number;
}

export function useDestinationStats(
  rallies: Rally[],
  players: (Player | MatchPlayer)[],
  side?: Side | null
): Record<PassDestination, DestinationStats> {
  return useMemo(() => {
    // Filtrar rallies com pass_destination e a_code definidos
    // Agrupar por pass_destination
    // Calcular kill rate = kills / attempts
    // Retornar mapa de estatísticas por destino
  }, [rallies, players, side]);
}
```

**Lógica:**
- Filtrar apenas as fases finais de cada rally (a última fase)
- Agrupar por `pass_destination`
- Calcular para cada destino:
  - `attempts`: contagem total
  - `kills`: onde `a_code = 3`
  - `errors`: onde `a_code = 0`
  - `killRate`: `kills / attempts`
  - `efficiency`: `(kills - errors) / attempts`

---

### 2. Atualizar `ActionEditor.tsx`

**Mudanças:**

1. **Nova prop:** `destinationStats?: Record<PassDestination, DestinationStats>`

2. **Remover constante estática:** `DESTINATION_DIFFICULTY`

3. **Calcular dificuldade dinamicamente** baseado no killRate real:
   - killRate >= 0.45 → 🟢 (verde/fácil)
   - killRate >= 0.30 → 🟡 (amarelo/médio)
   - killRate < 0.30 → 🔴 (vermelho/difícil)
   - Sem dados → ⚪ (neutro)

4. **Mostrar percentagem real** nos botões em vez de emojis fixos

**Código dos botões:**

```tsx
{availablePositions.map((dest) => {
  const stats = destinationStats?.[dest];
  const hasData = stats && stats.attempts > 0;
  
  // Calculate dynamic difficulty
  const killRate = hasData ? stats.killRate : null;
  const difficultyColor = killRate === null 
    ? 'border-l-muted-foreground/30'
    : killRate >= 0.45 
      ? 'border-l-success' 
      : killRate >= 0.30 
        ? 'border-l-warning'
        : 'border-l-destructive';
  
  return (
    <Button
      key={dest}
      variant={selectedDestination === dest ? 'default' : 'outline'}
      className={cn(
        'h-16 flex flex-col gap-0.5 text-base font-semibold transition-all border-l-4',
        selectedDestination === dest && 'ring-2 ring-offset-2',
        selectedDestination !== dest && difficultyColor
      )}
      onClick={() => handleDestinationWithAutoConfirm(dest)}
    >
      <span>{dest}</span>
      {hasData ? (
        <span className="text-xs opacity-70">
          {Math.round(killRate! * 100)}% ({stats.kills}/{stats.attempts})
        </span>
      ) : (
        <span className="text-xs opacity-50">-</span>
      )}
    </Button>
  );
})}
```

---

### 3. Atualizar `Live.tsx`

**Mudanças:**

1. **Importar o hook:**
   ```typescript
   import { useDestinationStats } from '@/hooks/useDestinationStats';
   ```

2. **Usar o hook com os rallies do jogo:**
   ```typescript
   const destinationStats = useDestinationStats(
     rallies, 
     getEffectivePlayers(),
     pendingAction?.side
   );
   ```

3. **Passar stats para ActionEditor:**
   ```tsx
   <ActionEditor
     // ... outras props
     destinationStats={destinationStats}
   />
   ```

---

### Layout Visual Final

**Antes (fixo):**
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│    P2    │ │    P3    │ │    P4    │
│    🟡    │ │    🔴    │ │    🟢    │
└──────────┘ └──────────┘ └──────────┘
```

**Depois (dinâmico):**
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│    P2    │ │    P3    │ │    P4    │
│ 38% (3/8)│ │ 67% (2/3)│ │ 60% (6/10)
└──────────┘ └──────────┘ └──────────┘
   🟡 médio    🟢 fácil     🟢 fácil
```

**Cores dinâmicas baseadas em dados reais:**
- P3 com 67% kill rate → verde (mesmo sendo normalmente difícil)
- P2 com 38% kill rate → amarelo
- Se sem dados → cor neutra cinza

---

### Ficheiros a Alterar/Criar

| Ficheiro | Ação | Descrição |
|----------|------|-----------|
| `src/hooks/useDestinationStats.ts` | **Criar** | Hook para calcular stats por destino |
| `src/components/live/ActionEditor.tsx` | Alterar | Adicionar prop e UI dinâmica |
| `src/pages/Live.tsx` | Alterar | Usar hook e passar dados |

---

### Benefícios

1. **Dados Reais**: Kill rate baseado no jogo atual, não em valores fixos
2. **Feedback Contextual**: Se a equipa está a rematar bem em P3, o botão fica verde
3. **Decisões Informadas**: Estatístico pode ver padrões de sucesso por posição
4. **UX Melhorada**: Percentagens reais são mais úteis que emojis genéricos

