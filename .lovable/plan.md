
# Plano: Corrigir Inconsistências na Sincronização de Distribuições

## Problema Identificado

### Análise dos Dados

A base de dados mostra **três problemas distintos** que causam inconsistências nas estatísticas de distribuição:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         PROBLEMA 1: SINCRONIZAÇÃO ERRADA                        │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Rally 7: recv_side = FORA                                                      │
│                                                                                 │
│  tabela rally_actions:                                                          │
│  ├── seq 3: setter FORA → P3                                                    │
│  ├── seq 7: setter FORA → P4                                                    │
│  └── seq 10: setter CASA → P4   ← Contra-ataque de Póvoa!                       │
│                                                                                 │
│  tabela rallies:                                                                │
│  └── pass_destination = P3      ← Sincronizou do FORA (1º setter), não do CASA │
│                                                                                 │
│  O sistema apenas considera o PRIMEIRO setter do rally, ignorando              │
│  os contra-ataques da equipa adversária.                                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PROBLEMA 2: DADOS EM TABELA ERRADA                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  useDistributionStats lê da tabela "rallies" que só guarda:                     │
│  - O setter_player_id e pass_destination do PRIMEIRO setter do rally           │
│  - Ignora completamente distribuições de contra-ataque                          │
│                                                                                 │
│  DADOS REAIS na rally_actions:                                                  │
│  ├── Póvoa tem 11 distribuições registadas                                      │
│  └── Destinos: P2(3), P3(2), P4(6)                                              │
│                                                                                 │
│  DADOS na rallies (usados nas stats):                                           │
│  ├── Póvoa tem 4 distribuições (só as que recv_side = CASA)                     │
│  └── Destinos: P3(2), P4(2) ← Faltam 7 distribuições!                           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                      PROBLEMA 3: HOOK LEGACY                                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  O hook useDistributionStats.ts (usado no DistributionTab):                     │
│                                                                                 │
│  ❌ Lê da tabela rallies (estrutura legacy de 1 ação por tipo)                  │
│  ❌ Filtra por setter.side = filters.side (correto) mas...                      │
│  ❌ ...os dados na tabela rallies só têm o primeiro setter do rally!            │
│                                                                                 │
│  Precisa ler da tabela rally_actions para ver TODAS as distribuições            │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Raiz do Problema

A arquitectura actual tem duas fontes de verdade:

| Tabela | Contém | Usado Por |
|--------|--------|-----------|
| `rallies` | 1 setter por rally (o primeiro) | `useDistributionStats` (Stats) |
| `rally_actions` | TODOS os setters (incluindo contra-ataques) | `useDestinationStatsFromActions` (Live) |

O `DistributionTab` na página Stats usa o hook `useDistributionStats` que lê da tabela `rallies`, onde só existe a primeira distribuição de cada rally.

---

## Solução: Migrar useDistributionStats para rally_actions

### Nova Arquitectura

Criar um novo hook `useDistributionStatsFromActions` que:
1. Lê TODAS as distribuições da tabela `rally_actions`
2. Agrupa por setter (baseado no `side` de cada ação, não no `recv_side` do rally)
3. Mantém compatibilidade com a interface `SetterDistribution` existente

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FLUXO CORRIGIDO                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Rally 8 (rally complexo):                                                      │
│                                                                                 │
│  seq 3:  setter FORA → P4     ┐                                                 │
│  seq 6:  setter CASA → P4     │  O novo hook conta TODAS estas distribuições    │
│  seq 9:  setter FORA → P2     │  separadas por equipa (side)                    │
│  seq 13: setter FORA → P4     │                                                 │
│  seq 17: setter CASA → P4     │  CASA: 3 distribuições (seq 6, 17, 23)          │
│  seq 20: setter FORA → P4     │  FORA: 4 distribuições (seq 3, 9, 13, 20)       │
│  seq 23: setter CASA → P2     ┘                                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Novo Hook: `useDistributionStatsFromActions`

Criar: `src/hooks/useDistributionStatsFromActions.ts`

Interface compatível com `SetterDistribution`:
```typescript
export function useDistributionStatsFromActions(
  rallyActions: Map<string, RallyActionWithPlayer[]> | undefined,
  players: (Player | MatchPlayer)[],
  filters: {
    side: Side | 'TODAS';
    setterId: string | null;
    receptionCode?: number | null;
  }
): {
  distributionStats: SetterDistribution[];
  setters: Array<{ id: string; name: string; jerseyNumber: number; side: Side }>;
  globalReceptionBreakdown: ReceptionBreakdown[];
  incompleteDistributionCount: number;
}
```

Lógica:
- Iterar todas as ações de tipo `setter` em `rally_actions`
- Agrupar por `player_id` do setter (ou criar grupo genérico se não tiver player_id)
- Usar `action.side` para filtrar por equipa
- Correlacionar com qualidade de receção do mesmo rally

### 2. Atualizar Stats.tsx

Adicionar query para `rally_actions`:
```typescript
const { data: rallyActions } = useRallyActionsForMatch(match?.id ?? null);
```

### 3. Atualizar DistributionTab

Substituir:
```typescript
const { distributionStats, ... } = useDistributionStats(rallies, players, filters);
```

Por:
```typescript
const { distributionStats, ... } = useDistributionStatsFromActions(
  rallyActions,
  players,
  filters
);
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useDistributionStatsFromActions.ts` | **NOVO** - Hook baseado em rally_actions |
| `src/pages/Stats.tsx` | Adicionar query para rally_actions |
| `src/components/DistributionTab.tsx` | Usar novo hook e receber rallyActions como prop |

---

## Manter Legacy

| Ficheiro | Estado |
|----------|--------|
| `src/hooks/useDistributionStats.ts` | Manter para referência, deprecar gradualmente |

---

## Estatísticas Esperadas Após Correcção

| Equipa | Fonte Actual | Fonte Corrigida |
|--------|--------------|-----------------|
| Póvoa (CASA) | 4 distribuições | 11 distribuições |
| Destinos P2 | 0 | 3 |
| Destinos P3 | 2 | 2 |
| Destinos P4 | 2 | 6 |

---

## Critérios de Sucesso

- Estatísticas de distribuição incluem TODAS as distribuições (incluindo contra-ataques)
- Filtro por equipa funciona baseado no `side` da ação, não no `recv_side` do rally
- Dados consistentes entre página Live e página Stats
- Valores mostrados: P2, P3, P4 com contagens correctas

