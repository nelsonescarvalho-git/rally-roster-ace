

# Plano: Corrigir Cálculo de Estatísticas por Destino de Ataque

## Problema Identificado

Os dados estão em **duas ações separadas** na tabela `rally_actions`:

| Seq | action_type | pass_destination | code |
|-----|-------------|------------------|------|
| 3 | setter | **P4** | null |
| 4 | attack | null | **2** (defendido) |
| 6 | setter | **P4** | null |
| 7 | attack | null | **1** (bloqueado) |

O hook actual (`useDestinationStats`) lê da tabela `rallies` onde assume que `pass_destination` e `a_code` estão na mesma linha. Mas a nova arquitectura `rally_actions` separa estas informações.

**Resultado:** As estatísticas mostram apenas 0% ou dados incorrectos porque o ataque não tem `pass_destination`.

---

## Solução: Novo Hook para rally_actions

Criar um hook que correlacione **setter → attack** pela sequência para calcular estatísticas correctas.

### Lógica de Correlação

Para cada par setter→attack consecutivo no mesmo rally e equipa:
1. O `pass_destination` vem do **setter**
2. O `code` (resultado) vem do **attack** seguinte
3. Agregar por destino

```text
┌─────────────────────────────────────────────────────────────────────┐
│            CORRELAÇÃO SETTER → ATTACK                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Rally 7:                                                           │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │ seq 3: setter │ P3 │    │  → conta P3                       │   │
│  │ seq 4: attack │    │ 1  │  → resultado = bloqueado          │   │
│  │ seq 6: setter │ P4 │    │  → conta P4                       │   │
│  │ seq 7: attack │    │ 2  │  → resultado = defendido          │   │
│  │ seq 9: setter │ P4 │    │  → conta P4                       │   │
│  │ seq 10: attack│    │ 2  │  → resultado = defendido          │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Estatísticas Resultantes:                                          │
│  P3: 1 ataque total, 0 kills → 0/1 · 0%                             │
│  P4: 2 ataques totais, 0 kills → 0/2 · 0%                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Novo Hook: `useDestinationStatsFromActions`

Novo ficheiro: `src/hooks/useDestinationStatsFromActions.ts`

Parâmetros:
- `rallyActions: Map<string, RallyActionWithPlayer[]>` - ações por rally_id
- `side?: Side` - filtrar por equipa

Lógica:
- Iterar por todas as ações ordenadas por `sequence_no`
- Para cada `setter`, guardar o `pass_destination`
- Quando encontrar o próximo `attack` da mesma equipa, associar o resultado ao destino
- Agregar estatísticas

### 2. Atualizar Live.tsx

Substituir:
```tsx
const destinationStats = useDestinationStats(rallies, matchPlayers, pendingAction?.side);
```

Por:
```tsx
const destinationStats = useDestinationStatsFromActions(rallyActions, pendingAction?.side);
```

### 3. Buscar rally_actions no Live.tsx

Adicionar query para obter ações do jogo actual:

```tsx
const { data: allRallyActions } = useQuery({
  queryKey: ['rally-actions', matchId],
  queryFn: async () => {
    const { data } = await supabase
      .from('rally_actions')
      .select('*')
      .in('rally_id', rallies.map(r => r.id))
      .is('deleted_at', null)
      .order('sequence_no');
    return data || [];
  },
  enabled: rallies.length > 0
});
```

---

## Interface do Hook

```typescript
export interface DestinationStatsFromActions {
  destination: PassDestination;
  attempts: number;      // Total de passes para este destino
  kills: number;         // Ataques com code = 3
  errors: number;        // Ataques com code = 0
  blocked: number;       // Ataques com code = 1
  defended: number;      // Ataques com code = 2
  killRate: number;      // kills / attempts
  efficiency: number;    // (kills - errors) / attempts
}
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useDestinationStatsFromActions.ts` | **NOVO** - Hook baseado em rally_actions |
| `src/pages/Live.tsx` | Usar novo hook em vez do antigo |

### Ficheiro a Manter (Legacy)

| Ficheiro | Estado |
|----------|--------|
| `src/hooks/useDestinationStats.ts` | Manter para pages que usam tabela `rallies` |

---

## Exemplo de Cálculo Correcto

Dado os dados do jogo actual:

| pass_destination | count (setters) |
|------------------|-----------------|
| P2 | 2 |
| P3 | 4 |
| P4 | 9 |

E os resultados dos ataques (codes):
- P3: 1 erro, 1 bloqueado, 1 kill = 3 ataques
- P4: 3 kills = 3 ataques

**Estatísticas correctas:**
- P2: 2/? (precisa correlacionar com attacks)
- P3: 1/3 · 33% (1 kill de 3 ataques)
- P4: 3/? · ?% (precisa correlacionar)

---

## Critérios de Sucesso

- Estatísticas mostram **todos** os passes/ataques para cada zona (não apenas kills)
- Formato: `kills/ataques · eficácia%`
- Cores de borda baseadas na kill rate real
- Dados em tempo real actualizados durante o jogo

