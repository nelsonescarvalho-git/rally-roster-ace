

## Adicionar "Freeball" como Opção no Ataque

### Conceito

Quando a equipa não consegue montar um ataque efetivo e envia uma bola fácil para o adversário, o utilizador pode selecionar "Freeball" no Step 2 do Ataque (ao lado da QualityPad). Isto:
1. Regista a ação como `action_type: 'attack'` com um novo código especial (code = **-1**) para distinguir de ataques efetivos
2. Auto-confirma e encadeia imediatamente para a ação de **Defesa do adversário**
3. Nas estatísticas e KPIs, freeballs são **excluídas** dos contadores de ataque efetivo e apresentadas em separado

### Alterações

#### 1. Tipo e semântica (`src/types/volleyball.ts` + `src/types/rallyActions.ts`)
- Adicionar código `-1` ao mapeamento de attack codes com label "Freeball" e emoji "🎁"
- No `ACTION_CODE_LABELS.attack`, adicionar `{ -1: { emoji: '🎁', label: 'Freeball' } }`

#### 2. UI do Ataque — Step 2 (`src/components/live/ActionEditor.tsx`)
- Adicionar um botão "🎁 Freeball" **acima** da QualityPad no Step 2 do ataque (semelhante ao toggle "Passou Rede" na defesa)
- Ao clicar:
  - Confirma a ação com `code: -1` (sem kill type, sem direção)
  - Encadeia para `defense` do lado adversário via `onChainAction`
  - Mostra toast de confirmação

#### 3. Handler `handleCodeWithAutoConfirm` (`src/components/live/ActionEditor.tsx`)
- Adicionar case para `code === -1` no bloco de ataque:
  - Auto-confirma sem passos adicionais
  - Encadeia para defesa adversária (igual ao `code === 2` mas sem ser "defendido")

#### 4. Estatísticas — Excluir freeballs do ataque efetivo

**`src/hooks/useStats.ts`**: No case `'attack'`, ignorar ações com `code === -1` (não contar em attAttempts/attPoints/attErrors)

**`src/hooks/useAttackStats.ts`**: Filtrar `attackActions` para excluir `code === -1`

**`src/hooks/useSetKPIs.ts`**: Excluir `code === -1` do cálculo de attTotal/attKills/attErrors/attEfficiency

**`src/hooks/useGlobalStats.ts`**: Mesma exclusão

#### 5. Apresentação separada de Freeballs
- Adicionar contadores `freeballsGiven` nos KPIs por equipa (`useSetKPIs.ts`) — contar ações de ataque com `code === -1`
- Mostrar no `SetSummaryKPIs.tsx` como métrica separada ("Freeballs Oferecidas")

#### 6. Timeline e histórico (`src/components/rally/TimelineItem.tsx`)
- Garantir que `code === -1` mostra "🎁 Freeball" na timeline do rally

### Ficheiros afetados
- `src/types/rallyActions.ts` — novo code label
- `src/components/live/ActionEditor.tsx` — botão freeball + handler
- `src/hooks/useStats.ts` — excluir code -1
- `src/hooks/useAttackStats.ts` — excluir code -1
- `src/hooks/useSetKPIs.ts` — excluir code -1 + contar freeballs
- `src/hooks/useGlobalStats.ts` — excluir code -1
- `src/components/live/SetSummaryKPIs.tsx` — mostrar freeballs
- `src/components/rally/TimelineItem.tsx` — display freeball

### Sem alterações de base de dados
O campo `code` na tabela `rally_actions` já é integer e aceita `-1`. Não é necessária migração.

