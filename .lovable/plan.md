
# Plano Combinado: Estatisticas por Equipa + Set/Match Report DataVolley

## Parte A -- Novas Tabs na Pagina de Estatisticas (`/stats/:matchId`)

### A1. Tab Receao (nova)

**Ficheiro novo: `src/hooks/useReceptionStats.ts`**
- Calcula por jogador: quantidade de receces por qualidade (Q0, Q1, Q2, Q3)
- Metricas: Total, Positiva% (Q2+Q3)/Total, Excelente% (Q3/Total)
- Fonte: `rally_actions` (action_type='reception') filtrado por side e set

**Ficheiro novo: `src/components/ReceptionTab.tsx`**
- Tabela por jogador: # | Nome | Q3 (n/%) | Q2 (n/%) | Q1 (n/%) | Q0 (n/%) | Total | Positiva% | Excelente%
- Cores semanticas nos percentuais (verde/amarelo/vermelho)
- Filtros: Side (Casa/Fora)

### A2. Tab Defesa (nova)

**Ficheiro novo: `src/hooks/useDefenseStats.ts`**
- Calcula por jogador: quantidade de defesas por qualidade (0, 1, 2, 3)
- Metricas: Total, Positiva% (codigo 2+3)/Total
- Fonte: `rally_actions` (action_type='defense') filtrado por side e set

**Ficheiro novo: `src/components/DefenseTab.tsx`**
- Tabela por jogador: # | Nome | Excelente (n/%) | Boa (n/%) | Fraca (n/%) | Ma (n/%) | Total | Positiva%
- Filtros: Side (Casa/Fora)

### A3. Tab Erros/Faltas (nova)

**Ficheiro novo: `src/hooks/useErrorStats.ts`**
- Agrega erros por tipo: Servico (s_code=0), Ataque (a_code=0), Receao (r_code=0), Bloco (b_code=0)
- Tabela por jogador com totais
- Faltas da tabela `sanctions` (PENALTY, DELAY_PENALTY) por equipa e jogador
- Fonte: `rallies` para erros + tabela `sanctions` para faltas

**Ficheiro novo: `src/components/ErrorsTab.tsx`**
- Secao "Erros": Totais globais por tipo + tabela por jogador
- Secao "Faltas": Totais por equipa + tabela por jogador (Avisos, Penalidades, Total)

### A4. Melhorar Tab Distribuicao (existente)

**Ficheiro modificado: `src/components/DistributionTab.tsx`**
- Adicionar coluna de kills efetivos por destino: para cada zona (P2, P3, P4, OP, PIPE, BACK), mostrar `kills/total (kill%)` alem da contagem existente
- Requer correlacao setter->attack no hook `useDistributionStatsFromActions`

### A5. Melhorar Tab Ataque (existente)

**Ficheiro modificado: `src/components/AttackTab.tsx`**
- Adicionar secao por jogador e zona de ataque: para cada jogador, por zona (P2, P4, OP, PIPE), mostrar qualidade media de distribuicao recebida e eficacia
- Dados ja parcialmente disponiveis em `useAttackStats` (statsByDistribution)

### A6. Stats.tsx -- Adicionar novas tabs

**Ficheiro modificado: `src/pages/Stats.tsx`**
- TabsList passa de 6 para 9 colunas (scrollavel horizontalmente):

```
Jogadores | Rotacoes | Servico | Receao | Defesa | Ataque | Dist. | Erros | Rallies
```

- Importar e renderizar os novos componentes
- Passar props: `rallyActionsMap`, `players`, `match`, `selectedSet`, `selectedSide`

---

## Parte B -- Melhorar Set Summary (SetSummaryKPIs)

### B1. Novas metricas no hook `useSetKPIs.ts`

Adicionar ao `TeamKPIs`:

```
// Bloco & Defesa (contagem direta)
blkParticipations, blkPoints, blkPointPercent, blkTouches, blkFaults
defTotal, defPositive, defPositivePercent, defExcellent, defExcellentPercent, defErrors

// Tipo de Servico
serveByType: Record<string, { total, aces, errors }>

// K1 vs K2 (sideout attack vs transition attack)
k1Attacks, k1Kills, k1Efficiency
k2Attacks, k2Kills, k2Efficiency

// Origem dos Pontos
pointsFromKills, pointsFromAces, pointsFromBlocks, pointsFromOpponentErrors
```

Adicionar ao `SetKPIs`:
```
totalRallies: number
allRotationsHome: RotationBreakdown[]
allRotationsAway: RotationBreakdown[]
```

**Logica de calculo:**
- Bloco: b1_player_id nao nulo = participacao, b_code=3 ponto, b_code=0 falta, b_code=1/2 toque
- Defesa: d_code nao nulo, >=2 positiva, ===3 excelente
- Tipo servico: agrupar por s_type (FLOAT, JUMP_FLOAT, POWER, OTHER)
- K1/K2: recv_side === teamSide = K1 (sideout attack), outro = K2 (transition)
- Origem pontos: contar por reason (KILL, ACE, BLK) e deduzir erros adversario
- Rotacoes: retornar array completo das 6 rotacoes

### B2. Nova tab "Bloco/Def" no SetSummaryKPIs

**Ficheiro modificado: `src/components/live/SetSummaryKPIs.tsx`**

TabsList passa de 5 para 6 tabs (`grid-cols-6`):
```
Geral | Servico | Rececao | Ataque | Bloco/Def | Insights
```

Nova tab "Bloco/Def" contem:
- StatRow: Bloco Ponto% (stuff blocks)
- StatRow: Bloco Toque%
- StatRow: Bloco Falta%
- StatRow: Defesa Positiva%
- StatRow: Defesa Excelente%
- Totais de participacao (bloco) e tentativas (defesa)

### B3. Card "Origem dos Pontos" na tab Geral

Novo card visual com 4 colunas mostrando Home vs Away:
- Kills (contagem + %)
- Aces (contagem + %)
- Blocos (contagem + %)
- Erros Adversario (contagem + %)

### B4. K1 vs K2 na tab Ataque

Adicionar antes da eficiencia geral:
- StatRow: K1 Kill% (sideout attack)
- StatRow: K2 Kill% (transition attack)

### B5. Tipo de Servico na tab Servico

Adicionar secao "Por Tipo" com mini-tabela:
- Float / Jump Float / Power com contagem, aces%, erro% por tipo

### B6. Tabela completa de 6 rotacoes na tab Insights

Substituir "Pior Rotacao" por tabela com todas as 6 rotacoes:
- Colunas: Rot | Home SO% | Away SO%
- Destacar a pior de cada lado

### B7. Total de Rallies na tab Geral

Adicionar linha discreta no topo da tab Geral com o numero total de rallies jogados no set.

---

## Resumo de Ficheiros

### Novos (6 ficheiros):
1. `src/hooks/useReceptionStats.ts`
2. `src/hooks/useDefenseStats.ts`
3. `src/hooks/useErrorStats.ts`
4. `src/components/ReceptionTab.tsx`
5. `src/components/DefenseTab.tsx`
6. `src/components/ErrorsTab.tsx`

### Modificados (4 ficheiros):
1. `src/pages/Stats.tsx` -- novas tabs (9 tabs scrollaveis)
2. `src/hooks/useSetKPIs.ts` -- novas metricas DataVolley
3. `src/components/live/SetSummaryKPIs.tsx` -- nova tab Bloco/Def, origem pontos, K1/K2, tipo servico, rotacoes completas
4. `src/components/DistributionTab.tsx` -- kills efetivos por destino
5. `src/components/AttackTab.tsx` -- ataque por zona com qualidade distribuicao

### Sem alteracoes a base de dados
Todos os dados ja existem nas tabelas `rally_actions`, `rallies` e `sanctions`.

## Ordem de Implementacao

1. Hooks novos (useReceptionStats, useDefenseStats, useErrorStats) -- sem dependencias
2. Metricas no useSetKPIs -- extensao do existente
3. Componentes novos (ReceptionTab, DefenseTab, ErrorsTab)
4. Melhorias nos componentes existentes (DistributionTab, AttackTab, SetSummaryKPIs)
5. Integracao final no Stats.tsx (novas tabs)
