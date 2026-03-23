

## Adicionar Ranking de Eficácia de Bloco nos Insights

Seguir o mesmo padrão dos rankings de eficácia de ataque e serviço.

### 1. `src/hooks/useSetKPIs.ts`

- Adicionar interface `TopBlockerEfficiency` com `playerId, playerNo, playerName, points, participations, efficiency`
- Adicionar `bestBlockersHome/Away` ao `SetKPIs`
- Acumular dados por jogador em `blockerCountsHome/Away`: `Record<string, { participations, points, playerNo }>` — iterar sobre rallies contando `b1_player_id`, `b2_player_id`, `b3_player_id` como participações e `b_code === 3` como pontos
- Calcular eficácia: `Math.round((points / participations) * 100)`, filtro mínimo **≥2 participações** (blocos-ponto são raros)
- Ordenar por eficácia descendente, top 3

### 2. `src/components/live/SetSummaryKPIs.tsx`

- Adicionar card "Melhor Eficácia (Bloco)" com ícone `Shield` e cor amber/orange
- Layout idêntico aos cards existentes (grid 2 colunas CASA/FORA)
- Badge colorido: verde ≥30%, amarelo ≥15%, vermelho <15% (blocos-ponto são raros)
- Formato: `#jersey Nome pts/total (eff%)`

