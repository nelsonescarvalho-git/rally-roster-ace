

## Adicionar Rankings por Eficácia nos Insights

Atualmente os insights mostram apenas volume ("Mais Solicitados") — quem atacou/serviu mais. O pedido é adicionar cards paralelos que mostrem quem teve melhor **aproveitamento** (eficácia).

### Alterações

#### 1. `src/hooks/useSetKPIs.ts` — Novas interfaces e cálculos

Adicionar novas interfaces e arrays ao `SetKPIs`:

- **`TopAttackerEfficiency`**: `playerId, playerNo, playerName, kills, total, efficiency` — ordenado por `(kills - errors - blocked) / total`, mínimo 3 ataques
- **`TopServerEfficiency`**: `playerId, playerNo, playerName, aces, errors, total, efficiency` — ordenado por `(aces - errors) / total`, mínimo 3 serviços  
- **`TopScorerEfficiency`**: Já existe — o TopScorer pode ser reordenado por eficácia (pontos/rally)

Novos campos no `SetKPIs`:
- `bestAttackersHome/Away` — top 3 por eficácia de ataque
- `bestServersHome/Away` — top 3 por eficácia de serviço

Para calcular, reutilizar os dados já acumulados nos `attackerCounts` e `serverCounts`, adicionando campos `kills`, `errors`, `blocked` ao `attackerCounts` e `aces`, `errors` ao `serverCounts`.

Filtro mínimo: **≥3 tentativas** para evitar jogadores com 1/1 = 100%.

#### 2. `src/components/live/SetSummaryKPIs.tsx` — Novos cards de eficácia

Adicionar 3 cards novos na tab Insights, depois dos existentes:

- **Melhor Eficácia (Ataque)** — ícone Target, cor emerald — mostra `#jersey Nome kills/total (eff%)` com badge colorido
- **Melhor Eficácia (Serviço)** — ícone Zap, cor blue — mostra `#jersey Nome aces/total (eff%)`  
- Os cards de Receção já mostram eficácia (`positivePercent`), mas reordenar por `positivePercent` em vez de `total`

Layout idêntico aos cards existentes (grid 2 colunas, CASA/FORA).

### Detalhes Técnicos

**`attackerCounts` expandido:**
```typescript
Record<string, { count: number; kills: number; errors: number; blocked: number; playerNo: number | null }>
```

**Cálculo eficácia ataque:**
```typescript
efficiency = total >= 3 ? Math.round(((kills - errors - blocked) / total) * 100) : null
```

**Cálculo eficácia serviço:**
```typescript
efficiency = total >= 3 ? Math.round(((aces - errors) / total) * 100) : null
```

**Receção** — alterar sort de `.sort((a,b) => b.total - a.total)` para `.sort((a,b) => b.positivePercent - a.positivePercent)` com filtro `total >= 3`.

