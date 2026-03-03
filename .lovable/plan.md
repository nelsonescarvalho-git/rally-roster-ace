

# Fix: Badge de Distribuição sem informação no RallyTimeline

## Problema
A ação de Distribuição (setter) armazena os dados em campos diferentes das outras ações:
- Jogador → `setterId` (em vez de `playerId`)
- Qualidade → `passCode` (em vez de `code`)

O `RallyTimeline` só lê `playerId`/`playerNo` e `code`, por isso o badge do setter aparece vazio: apenas "D" sem número de jogador nem código de qualidade.

## Solução

No ficheiro `src/components/live/RallyTimeline.tsx`, alterar as funções `getPlayerDisplay()` e a lógica de `code` em **ambos** os componentes (`ActionBadge` e `SortableAction`) para tratar o caso especial do setter:

1. **`getPlayerDisplay()`** — se `action.type === 'setter'`, procurar o jogador via `action.setterId` (em vez de `playerId`)
2. **Código/qualidade** — se `action.type === 'setter'`, usar `action.passCode` em vez de `action.code`
3. **Extra** — opcionalmente mostrar o destino (`action.passDestination`) como texto adicional no badge, para consistência com o `RallyActionsTimeline` que já o faz

### Resultado esperado
O badge passará de `D` para algo como `D #7 (−) P4` — com o número do distribuidor, a qualidade do passe e o destino.

