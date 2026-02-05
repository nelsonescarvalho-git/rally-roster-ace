
Objetivo
- Garantir que o pop-up automático “Entrada do Líbero” lista exatamente os mesmos jogadores que o Campo (CourtView) está a mostrar para esse lado e rotação, e impedir confirmações inválidas (ex.: tentar trocar por alguém que já não está em campo).

Diagnóstico (com base no código atual e na tua resposta)
- O problema é “Sempre” e “Pop-up automático”, e a discrepância é “Difere do Campo (UI)”.
- Hoje, tanto o CourtView como o cálculo de elegibilidade usam as mesmas funções (getPlayersOnCourt + getPlayerZone). Quando há divergência consistente, costuma ser por:
  1) Estado “stale”/não reinicializado do componente do pop-up (seleção e/ou lista) quando o rally muda.
  2) Substituições gravadas que não se aplicam ao 6 em campo (player_out_id não encontrado), criando um “desalinhamento”: o tracking do líbero (baseado nas linhas de substituição) acha uma coisa, mas o 6 em campo (baseado na aplicação efetiva ao lineup) mostra outra.
  3) Ordem de aplicação de substituições no mesmo rally (sort apenas por rally_no) a causar resultados diferentes ao longo do render, especialmente quando há entradas/saídas no mesmo rally.

Estratégia de correção
- Introduzir uma “fonte única de verdade” para o estado do campo (6 jogadores + zonas por lado, para o rally atual), e fazer:
  - CourtView consumir essa mesma estrutura (ou pelo menos os mesmos cálculos consolidados).
  - LiberoPrompt (lista de elegíveis e rótulos Z1/Z5/Z6) consumir exatamente o mesmo snapshot.
- Adicionar validação “hard” no momento de confirmar a entrada do líbero:
  - Só permite confirmar se o jogador selecionado está mesmo em campo naquele instante e está em Z1/Z5/Z6.
  - Caso contrário, mostra toast de erro e não grava substituição.

Plano de implementação (arquivos e passos)

1) Criar um “snapshot” do campo no Live (1 lugar para calcular tudo)
Arquivos: src/pages/Live.tsx
- Criar helper memoizado (useMemo) para cada lado com:
  - playersOnCourt: getPlayersOnCourt(currentSet, side, gameState.currentRally)
  - rotationForSide: (side === gameState.serveSide ? gameState.serveRot : gameState.recvRot)
  - zoneByPlayerId: Map<playerId, zone> usando getPlayerZone com rotationForSide
- A partir deste snapshot, derivar:
  - backRowPlayers = playersOnCourt filtrados por zona ∈ {1,5,6}
  - zoneLabel(playerId) = `Z${zone}`

Porquê: isto elimina discrepâncias causadas por cálculos feitos em lugares diferentes e facilita validar/depurar.

2) Fazer o pop-up do líbero usar o snapshot em vez de depender de cálculo “espalhado”
Arquivos: src/pages/Live.tsx, src/hooks/useLiberoTracking.ts (pequena refatoração)
Opção A (mais segura, menos intrusiva no hook):
- Manter useLiberoTracking para “quando mostrar” + estado do líbero (isOnCourt, mustExit, etc.).
- Calcular eligiblePlayers diretamente no Live.tsx a partir do snapshot (backRowPlayers) e passar isso ao LiberoPrompt.
- Continuar a usar recommendedPlayer (MB) mas calculado sobre eligiblePlayers do snapshot.

Opção B (mais “arquitetural”, mas mexe mais):
- Alterar useLiberoTracking para aceitar como input a lista de onCourtPlayers + zoneByPlayerId já calculados, removendo dependência de getPlayersOnCourt/getPlayerZone.
- Isto garante consistência total, mas implica alterar chamadas e tipos.

Recomendação: Opção A primeiro (corrige rápido e reduz risco).

3) Forçar reset do estado interno do LiberoPrompt a cada rally (eliminar “stale selection”)
Arquivos: src/pages/Live.tsx, src/components/live/LiberoPrompt.tsx
- No Live.tsx, adicionar uma key no LiberoPrompt automático:
  - key={`${gameState.currentSet}-${gameState.currentRally}-${gameState.recvSide}-entry`}
- No LiberoPrompt.tsx, ajustar o useEffect de preseleção para atualizar quando o recommended mudar (mesmo que selectedPlayer já exista) OU limpar selectedPlayer quando:
  - type muda, ou
  - eligiblePlayers muda de forma significativa (ex.: ids diferentes), ou
  - receber uma prop “rallyKey”.

Objetivo: garantir que nunca fica selecionado um jogador do rally anterior.

4) Validação antes de gravar a substituição do líbero (evitar criar substituições que não se aplicam)
Arquivos: src/pages/Live.tsx (handleLiberoEntry e também o handler do prompt manual)
- Antes de chamar enterLibero, verificar:
  - replacedPlayerId está presente em snapshot.playersOnCourt (ids)
  - zona do replacedPlayerId no snapshot é 1, 5 ou 6
  - se falhar, toast “Jogador selecionado já não está em campo / não está na linha de trás” e return (não grava)
- Isto impede o cenário em que se grava uma substituição “inválida” (que depois não altera o 6 em campo), que é uma fonte grande de inconsistência.

5) Tornar a aplicação de substituições determinística (ordem estável)
Arquivos: src/hooks/useMatch.ts
- Em getActiveLineup, ordenar substituições por:
  - rally_no ASC
  - created_at ASC (ou id como fallback)
- Hoje só ordena por rally_no. Se existirem duas trocas no mesmo rally (muito comum em correções/undo/ajustes), a ordem pode variar e gerar estados diferentes entre renders.

6) (Opcional) “Debug strip” temporária para confirmar a correção (removível)
Arquivos: src/pages/Live.tsx
- Atrás de um toggle (ex.: query param ?debug=1), mostrar:
  - recvSide/recvRot
  - lista dos 6 em campo (jersey + zone)
  - lista de elegíveis no pop-up
- Isto acelera a validação contigo. Depois podemos remover.

Critérios de aceitação (o que vais conseguir testar)
- Quando o pop-up automático abrir:
  - Os jogadores listados são exatamente os que aparecem em Z1/Z5/Z6 no CourtView para o lado que está a receber.
  - Se roda e o rally muda, a seleção recomendada/selecionada não “fica presa” em alguém que já não está no fundo.
- Se tentares confirmar por um jogador que não está em campo (por qualquer razão), a app não grava e avisa.

Riscos e cuidados
- Não alterar a lógica de “quando mostrar” o pop-up sem necessidade (para não quebrar a automação já existente).
- Garantir que o snapshot é recalculado apenas quando gameState/substitutions/lineups mudam (useMemo com deps corretas), para não causar re-renders pesados.

Sequência sugerida (para reduzir risco)
1) Passo 5 (sort estável) + Passo 4 (validação) — evita estados “maus” na base de dados.
2) Passo 1 + 2 (snapshot + usar snapshot no pop-up).
3) Passo 3 (reset do LiberoPrompt).
4) Passo 6 (debug) só se ainda houver dúvida durante testes.
