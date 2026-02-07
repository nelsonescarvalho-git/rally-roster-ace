

# Plano: Estatísticas do Plantel

## Objetivo

Adicionar um card de estatísticas na página `TeamDetail` que mostra:
- Altura média da equipa
- Idade média da equipa  
- Distribuição de jogadores por posição

## Interface Proposta

```text
┌────────────────────────────────────────────────────────────┐
│ 📊 Estatísticas do Plantel                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────────┐ │
│  │   185    │  │   22.5   │  │  OH  ████████  4        │ │
│  │    cm    │  │   anos   │  │  OP  ████      2        │ │
│  │  Altura  │  │  Idade   │  │  MB  ██████    3        │ │
│  │  Média   │  │  Média   │  │  S   ████      2        │ │
│  └──────────┘  └──────────┘  │  L   ██        1        │ │
│                              │  --  ████      2        │ │
│  (6/14 com altura)           └──────────────────────────┘ │
│  (10/14 com nascimento)                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Lógica de Cálculo

### Altura Média
- Filtrar jogadores com `height_cm` preenchido
- Calcular média aritmética
- Mostrar quantos jogadores têm altura registada (ex: "6/14 com altura")

### Idade Média
- Filtrar jogadores com `birth_date` preenchido
- Usar `differenceInYears` do date-fns para calcular idade de cada um
- Calcular média das idades
- Mostrar quantos jogadores têm data de nascimento (ex: "10/14 com nascimento")

### Distribuição por Posição
- Agrupar jogadores por `position`
- Contar jogadores em cada posição (OH, OP, MB, S, L)
- Jogadores sem posição contam como "Sem posição"
- Mostrar barra de progresso proporcional

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/TeamDetail.tsx` | Adicionar card de estatísticas com cálculos e visualização |

## Detalhes Técnicos

### Imports Necessários
```typescript
import { differenceInYears, parseISO } from 'date-fns';
import { BarChart3, Ruler, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
```

### Cálculo das Estatísticas (useMemo)
```typescript
const squadStats = useMemo(() => {
  const playersWithHeight = players.filter(p => p.height_cm);
  const avgHeight = playersWithHeight.length > 0
    ? Math.round(playersWithHeight.reduce((sum, p) => sum + p.height_cm!, 0) / playersWithHeight.length)
    : null;

  const today = new Date();
  const playersWithAge = players.filter(p => p.birth_date).map(p => ({
    ...p,
    age: differenceInYears(today, parseISO(p.birth_date!))
  }));
  const avgAge = playersWithAge.length > 0
    ? (playersWithAge.reduce((sum, p) => sum + p.age, 0) / playersWithAge.length).toFixed(1)
    : null;

  const positionCounts: Record<string, number> = {};
  players.forEach(p => {
    const pos = p.position || 'Sem posição';
    positionCounts[pos] = (positionCounts[pos] || 0) + 1;
  });

  return {
    avgHeight,
    heightCount: playersWithHeight.length,
    avgAge,
    ageCount: playersWithAge.length,
    positionCounts,
    totalPlayers: players.length
  };
}, [players]);
```

### Componente do Card
```typescript
{players.length > 0 && (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Estatísticas do Plantel
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {/* Altura Média */}
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <Ruler className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <div className="text-2xl font-bold">
            {squadStats.avgHeight ? `${squadStats.avgHeight}` : '-'}
          </div>
          <div className="text-xs text-muted-foreground">cm (altura média)</div>
          <div className="text-xs text-muted-foreground mt-1">
            {squadStats.heightCount}/{squadStats.totalPlayers} com altura
          </div>
        </div>

        {/* Idade Média */}
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
          <div className="text-2xl font-bold">
            {squadStats.avgAge || '-'}
          </div>
          <div className="text-xs text-muted-foreground">anos (idade média)</div>
          <div className="text-xs text-muted-foreground mt-1">
            {squadStats.ageCount}/{squadStats.totalPlayers} com nascimento
          </div>
        </div>

        {/* Distribuição por Posição */}
        <div className="col-span-2 md:col-span-1 p-3 bg-muted/50 rounded-lg">
          <div className="text-sm font-medium mb-2">Por Posição</div>
          {Object.entries(squadStats.positionCounts)
            .sort(([a], [b]) => {
              const order = ['OH', 'OP', 'MB', 'S', 'L', 'Sem posição'];
              return order.indexOf(a) - order.indexOf(b);
            })
            .map(([pos, count]) => (
              <div key={pos} className="flex items-center gap-2 mb-1">
                <span className="w-12 text-xs font-mono">{pos}</span>
                <Progress 
                  value={(count / squadStats.totalPlayers) * 100} 
                  className="h-2 flex-1" 
                />
                <span className="w-4 text-xs text-right">{count}</span>
              </div>
            ))}
        </div>
      </div>
    </CardContent>
  </Card>
)}
```

## Posicionamento

O card de estatísticas será inserido **entre o card de Cores** e a **tabela do Plantel**, ficando visível apenas quando existem jogadores no plantel.

## Critérios de Sucesso

- Altura média calculada corretamente a partir dos jogadores com altura registada
- Idade média calculada usando date-fns com precisão de 1 casa decimal
- Indicadores claros de quantos jogadores têm dados preenchidos
- Distribuição por posição ordenada logicamente (OH, OP, MB, S, L, Sem posição)
- Card responsivo que funciona bem em mobile e desktop
- Graceful degradation quando não há dados (mostra "-" em vez de valores)

