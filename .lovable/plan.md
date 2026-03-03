

# Adicionar filtro por direção de ataque na AttackTab

## Alterações

### 1. `src/hooks/useAttackStats.ts` — aceitar filtro de direção
- Adicionar `attackDirection?: AttackDirection | null` à interface `AttackFilters`
- No `useMemo` que calcula stats, filtrar ações de ataque pelo `attack_direction` quando o filtro estiver activo

### 2. `src/components/AttackTab.tsx` — novo Select de direção
- Novo state `directionFilter` (`AttackDirection | null`)
- Passar `attackDirection: directionFilter` ao `useAttackStats`
- Adicionar um `<Select>` após o filtro de distribuição existente, com as opções:
  - "Todas Dir." (valor `all`)
  - ↗️ Diagonal
  - ↕️ Linha
  - 🤏 Amorti
  - 1️⃣ Z1
  - 5️⃣ Z5
- Usar `ATTACK_DIRECTION_LABELS` de `volleyball.ts` para os labels

Segue exactamente o mesmo padrão do filtro de distribuição existente (`distributionFilter`).

