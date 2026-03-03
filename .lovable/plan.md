

# Adicionar Direção de Ataque: Captura + Estatísticas + KPIs

## Resumo
Novo campo `attack_direction` para registar a direção do ataque (Diagonal, Linha, Amorti, Z1, Z5). Integrar no fluxo de registo, nas estatísticas por jogador e criar KPIs de zona preferencial.

## 1. Base de dados — nova coluna

Migração SQL para adicionar `attack_direction TEXT` a:
- `rally_actions` — campo principal
- `rallies` — sincronização legacy

## 2. Tipos TypeScript — `src/types/volleyball.ts`

```typescript
export type AttackDirection = 'DIAGONAL' | 'LINE' | 'TIP' | 'Z1' | 'Z5';

export const ATTACK_DIRECTION_LABELS: Record<AttackDirection, { emoji: string; label: string }> = {
  DIAGONAL: { emoji: '↗️', label: 'Diagonal' },
  LINE:     { emoji: '↕️', label: 'Linha' },
  TIP:      { emoji: '🤏', label: 'Amorti' },
  Z1:       { emoji: '1️⃣', label: 'Z1' },
  Z5:       { emoji: '5️⃣', label: 'Z5' },
};
```

Adicionar `attackDirection?: AttackDirection | null` ao `RallyAction`.
Adicionar `attack_direction` ao `Rally`.

## 3. Fluxo de Ataque — `ActionEditor.tsx`

Inserir novo step entre Jogador e Avaliação:

- **Step 1**: Selecionar jogador (existente)
- **Step 2 (NOVO)**: Selecionar direção — grid com 5 botões (↗️ Diagonal, ↕️ Linha, 🤏 Amorti, 1️⃣ Z1, 5️⃣ Z5) + botão "Sem direção" para saltar
- **Step 3**: Avaliação (era Step 2)
- **Step 4**: Kill Type / Block Result (era Step 3)
- **Step 5**: Blocker selection (era Step 4)

Recalcular `totalSteps` para reflectir +1 step no ataque.
Novo callback `onAttackDirectionChange` e prop `selectedAttackDirection`.

## 4. Parent (Live.tsx) — state e persistência

- Novo state `selectedAttackDirection`
- Passar prop e callback ao ActionEditor
- Incluir `attackDirection` nos overrides do `onConfirm`
- Persistir em `rally_actions.attack_direction` via hook `useRallyActions`
- Sincronizar para `rallies.attack_direction` (legacy)

## 5. RallyTimeline — badge do ataque

Mostrar emoji da direção no badge do ataque (ex: "A #7 (★) ↗️").

## 6. Estatísticas — `useAttackStats.ts`

Adicionar ao `AttackerStats`:
- `statsByDirection`: breakdown por direção (attempts, kills, errors, efficiency)
- `preferredDirection`: direção com mais tentativas
- `bestDirection`: direção com melhor efficiency

## 7. AttackTab — nova secção de KPIs

Adicionar card "Ataque por Direção" com:
- Tabela global: direção × kills/total (efic.) × top atacantes
- Na tabela por atacante: nova coluna "Zona Pref." com a direção mais usada
- Mini-charts por jogador: breakdown por direção (substituir ou complementar os mini-charts de distribuição existentes)

## 8. PlayerStatsPopover

Na secção de Ataque, mostrar a direção preferencial do jogador se houver dados.

## 9. KPIs page (`useGlobalStats`)

Adicionar ao dashboard de KPIs:
- Secção "Zonas de Ataque" com eficácia por direção
- Ranking de jogadores por zona preferencial

