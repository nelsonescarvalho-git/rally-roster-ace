

# Fix: Estatísticas incompletas — hooks que lêem da tabela `rallies` em vez de `rally_actions`

## Problema

Vários hooks de estatísticas lêem da tabela `rallies` (estrutura achatada), que só guarda **uma ocorrência** de cada tipo de ação por rally. Em rallies longos com múltiplos ataques, defesas ou blocos, os dados subsequentes existem apenas em `rally_actions` e não aparecem nas estatísticas.

**Hooks afectados** (lêem de `rallies`):
- `useStats` — tab "Jogadores": faltam ataques, defesas, blocos
- `useAttackStats` — tab "Ataque": faltam ataques de contra-ataque
- `useErrorStats` — tab "Erros": faltam erros de ações repetidas
- `useSetKPIs` — KPIs de set: mesmos problemas

**Hooks já correctos** (lêem de `rally_actions`):
- `useReceptionStats`, `useDefenseStats`, `useDestinationStatsFromActions`, `useDistributionStatsFromActions`

## Plano

### 1. Actualizar `useStats` para aceitar `rallyActionsMap` opcional

Assinatura: `useStats(rallies, players, rallyActionsMap?)`

Quando o mapa existe, para cada rally com acções em `rallyActionsMap`:
- Iterar **todas** as acções de ataque, defesa, bloco, serviço, receção
- Contar por jogador usando `action.player_id` e `action.code`
- Para blocos: contar participações de `b2_player_id` e `b3_player_id` também
- Fallback para campos planos do `rallies` quando o mapa não tem dados para um rally

### 2. Actualizar `useAttackStats` para aceitar `rallyActionsMap` opcional

Assinatura: `useAttackStats(rallies, players, filters, rallyActionsMap?)`

Quando o mapa existe:
- Iterar acções de tipo `attack` em `rally_actions`
- Usar `action.code`, `action.attack_direction`, `action.kill_type`
- Para qualidade de distribuição: procurar a acção `setter` precedente no mesmo rally/lado e usar o `pass_code`
- Fallback para `rallies` quando o mapa não tem dados

### 3. Actualizar `useErrorStats` para aceitar `rallyActionsMap` opcional

Assinatura: `useErrorStats(rallies, players, sanctions, filters, rallyActionsMap?)`

Quando o mapa existe:
- Contar erros (code=0) de todas as acções por tipo e jogador
- Captura erros de ataques, defesas e blocos múltiplos por rally

### 4. Actualizar `Stats.tsx` para passar `rallyActionsMap` aos hooks

O `rallyActionsMap` já é obtido via `useRallyActionsForMatch(matchId)` na linha 36. Basta passá-lo como parâmetro adicional a:
- `useStats(filteredRallies, effectivePlayers, rallyActionsMap)`
- `useAttackStats` (via AttackTab)
- `useErrorStats`

### 5. Actualizar `useSetKPIs` — ataques, blocos e defesas

O `useSetKPIs` é mais complexo porque calcula KPIs de equipa. Adicionar parâmetro opcional `rallyActionsMap` e, para as secções de ataque, bloco e defesa, contar a partir de `rally_actions` quando disponível.

### Compatibilidade

Todos os parâmetros são opcionais — sem `rallyActionsMap`, os hooks mantêm o comportamento actual (leitura de `rallies`), garantindo retrocompatibilidade com dados legados.

