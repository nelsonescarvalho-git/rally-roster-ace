
## Plano: Normalizar Apresentação de Estatísticas em Toda a App

### Análise Atual

Após revisão detalhada do código, encontrei **inconsistências** na forma como as estatísticas são apresentadas:

#### O que já está bem implementado ✓
| Local | Formato | Exemplo |
|-------|---------|---------|
| `AttackTab.tsx` | K/Total + Efic% | `1/1 100%` |
| `PlayerStatsPopover.tsx` | Kills/Attacks + (Eff%) | `5/10 (50%)` |
| `SetSummaryKPIs.tsx` | Percentagens calculadas | `Kill% 50%` |
| `useStats.ts` | Cálculo de eficiência correto | `(kills - errors - blocked) / total` |

#### Problemas encontrados ✗
| Local | Problema | Formato Atual |
|-------|----------|---------------|
| `Stats.tsx` (tab Jogadores) | Mostra apenas pontos/total sem % | `0/1` sem eficácia |
| `Stats.tsx` | Apenas Serviço e Ataque mostrados | Falta Receção, Defesa |
| Todas as views | Formato inconsistente | Alguns usam `X/Y`, outros `X%` |

### Proposta de Normalização

#### Formato padrão para TODAS as ações:
```
[Sucesso]/[Total] ([Eficácia]%)
```

Exemplo: `5/10 (50%)`

#### Definição de "Sucesso" e "Eficácia" por ação:

| Ação | Sucesso | Total | Eficácia |
|------|---------|-------|----------|
| **Serviço** | Aces (code 3) | Todos os serviços | `(aces - erros) / total × 100` |
| **Receção** | Positivas (code 2+3) | Todas receções | `(positivas) / total × 100` |
| **Ataque** | Kills (code 3) | Todos ataques | `(kills - erros - bloqueados) / total × 100` |
| **Bloco** | Pontos (code 3) | Participações | `pontos / participações × 100` |
| **Defesa** | Bem sucedidas (code 2+3) | Todas defesas | `(boas) / total × 100` |

---

### Alterações Técnicas

#### 1. Atualizar Tabela de Jogadores em `Stats.tsx`

**Antes:**
```tsx
<TableHead>Srv</TableHead>
<TableHead>Att</TableHead>
<TableHead>Eff%</TableHead>
<TableHead>Blk</TableHead>
```

**Depois:**
```tsx
<TableHead>Serviço</TableHead>
<TableHead>Receção</TableHead>
<TableHead>Ataque</TableHead>
<TableHead>Bloco</TableHead>
<TableHead>Defesa</TableHead>
```

Cada célula terá o formato: `Sucesso/Total (X%)`

#### 2. Adicionar mais métricas ao `PlayerStats` interface

Já existem no tipo mas não estão a ser mostradas:
- `recAttempts`, `recPoints` (receção)
- `defAttempts`, `defPoints` (defesa)

#### 3. Criar componente reutilizável `StatCell`

```tsx
interface StatCellProps {
  success: number;
  total: number;
  efficiency?: number; // Pre-calculated or auto-calculate
  showEfficiency?: boolean;
  successColor?: 'primary' | 'success' | 'warning';
}

function StatCell({ success, total, efficiency, showEfficiency = true }: StatCellProps) {
  const eff = efficiency ?? (total > 0 ? (success / total) * 100 : null);
  
  if (total === 0) return <span className="text-muted-foreground">-</span>;
  
  return (
    <span>
      <span className="text-success">{success}</span>
      <span className="text-muted-foreground">/{total}</span>
      {showEfficiency && eff !== null && (
        <span className={cn(
          "ml-1 text-xs",
          eff >= 50 ? "text-success" : eff >= 25 ? "text-warning" : "text-destructive"
        )}>
          ({eff.toFixed(0)}%)
        </span>
      )}
    </span>
  );
}
```

---

### Botão de Recálculo de Estatísticas

#### Quando é útil?
- Após correções manuais no `RallyHistory`
- Quando há dados em falta (kill_type, pass_destination)
- Após edição de rallies via `EditRallyModal`

#### Implementação

Adicionar botão no header de `Stats.tsx`:
```tsx
<Button 
  variant="outline" 
  size="sm" 
  onClick={() => {
    queryClient.invalidateQueries(['rallies', matchId]);
    toast.success('Estatísticas recalculadas');
  }}
  className="gap-1"
>
  <RefreshCw className="h-4 w-4" />
  Recalcular
</Button>
```

**Nota:** As estatísticas já são calculadas em tempo real via `useMemo`. O botão força um refetch dos dados da DB, útil quando:
1. Outro dispositivo fez alterações
2. Correções foram feitas mas a cache não atualizou

---

### Resumo de Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Stats.tsx` | Expandir tabela Jogadores com todas as ações + botão Recalcular |
| `src/components/ui/StatCell.tsx` | **Novo** - Componente reutilizável |
| `src/hooks/useStats.ts` | Adicionar cálculo de `recEfficiency` e `defEfficiency` |
| `src/types/volleyball.ts` | Adicionar campos de eficiência em `PlayerStats` |
| `src/components/live/PlayerStatsPopover.tsx` | Usar `StatCell` para consistência |
| `src/components/AttackTab.tsx` | Usar `StatCell` |

---

### Minhas Observações Adicionais

#### Concordo com a tua visão
O formato `Sucesso/Total (Efic%)` é o padrão no voleibol profissional (Data Volley, VolleyMetrics). É intuitivo e permite comparação rápida.

#### Sugestão adicional: Código de cores por eficácia

| Range | Cor | Significado |
|-------|-----|-------------|
| ≥50% | 🟢 Verde | Excelente |
| 25-49% | 🟡 Amarelo | Aceitável |
| <25% | 🔴 Vermelho | A melhorar |

Estes limiares são ajustáveis por ação (ataque espera mais, receção tolera menos).

#### Sugestão: Tooltips detalhados

Para cada célula, um hover que mostre:
- Breakdown: Aces/Erros/Neutros
- Comparação com média da equipa
- Tendência no set atual vs anteriores
