
## Correção: Contagem de Sets Ganhos no Dashboard

### Problema Identificado
O cálculo atual em `useDashboardStats.ts` conta qualquer set onde uma equipa lidera como "ganho":
```typescript
const homeSetsWon = lastMatchScores.filter(s => s.home_score > s.away_score).length;
```

Isto resulta em mostrar 0-1 quando o set ainda está 5-7 (em curso).

### Regras do Voleibol para Set Ganho
| Set | Pontos Mínimos | Diferença Mínima |
|-----|----------------|------------------|
| 1-4 | 25 | 2 |
| 5 | 15 | 2 |

### Solução

**Ficheiro:** `src/hooks/useDashboardStats.ts`

Adicionar função para verificar se um set está terminado:

```typescript
const isSetWon = (setNo: number, homeScore: number, awayScore: number): 'home' | 'away' | null => {
  const minPoints = setNo === 5 ? 15 : 25;
  const maxScore = Math.max(homeScore, awayScore);
  const diff = Math.abs(homeScore - awayScore);
  
  // Set terminado: atingiu pontos mínimos E tem 2+ de diferença
  if (maxScore >= minPoints && diff >= 2) {
    return homeScore > awayScore ? 'home' : 'away';
  }
  
  return null; // Set ainda em curso
};
```

Alterar cálculo de sets ganhos:

```typescript
// ANTES (incorreto)
const homeSetsWon = lastMatchScores.filter(s => s.home_score > s.away_score).length;
const awaySetsWon = lastMatchScores.filter(s => s.away_score > s.home_score).length;

// DEPOIS (correto)
const homeSetsWon = lastMatchScores.filter(s => 
  isSetWon(s.set_no, s.home_score, s.away_score) === 'home'
).length;
const awaySetsWon = lastMatchScores.filter(s => 
  isSetWon(s.set_no, s.home_score, s.away_score) === 'away'
).length;
```

### Resultado Esperado
Com Set 1 a 5-7:
- **Antes:** 0-1 (incorreto)
- **Depois:** 0-0 (correto - set em curso)

### Ficheiros a Alterar
| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useDashboardStats.ts` | Adicionar função `isSetWon` e corrigir cálculos |
