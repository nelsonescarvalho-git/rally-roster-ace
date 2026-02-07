
# Plano: Usar Modal de Ações Completo na Página Stats

## Problema Identificado

O Rally #7 tem **10 ações detalhadas** na tabela `rally_actions`:

| # | Tipo | Side | Jogador | Código | Destino |
|---|------|------|---------|--------|---------|
| 1 | serve | CASA | #8 | 1 | - |
| 2 | reception | FORA | - | 3 | - |
| 3 | setter | FORA | #10 | 1 | P3 |
| 4 | attack | FORA | #1 | 1 | - |
| 5 | block | CASA | #6 | 2 | - |
| 6 | defense | FORA | #1 | 2 | - |
| 7 | setter | FORA | #10 | 2 | P4 |
| 8 | attack | FORA | #9 | 2 | - |
| 9 | defense | CASA | #13 | 2 | - |
| 10 | setter | CASA | #16 | NULL | P4 |

**Mas a página Stats usa o `EditRallyModal` que só mostra UMA ação de cada tipo**, perdendo 7 das 10 ações (os segundos/terceiros setters, ataques e defesas).

---

## Solução

Replicar a lógica da página `RallyHistory.tsx` na página `Stats.tsx`:

1. Detectar se o rally tem ações na tabela `rally_actions`
2. Se sim → usar `EditRallyActionsModal` (mostra TODAS as ações)
3. Se não → fallback para `EditRallyModal` (dados legacy)

---

## Alterações Técnicas

### Ficheiro: `src/pages/Stats.tsx`

| Alteração | Descrição |
|-----------|-----------|
| Import | Adicionar `EditRallyActionsModal`, `ActionEditState`, tipos do `rallyActions` |
| Import | Adicionar `useBatchUpdateRallyActions` hook |
| Estado | Adicionar `editingRallyActions` state |
| Botão Edit | Modificar onClick para verificar se há actions e escolher o modal |
| JSX | Adicionar `EditRallyActionsModal` ao final do componente |

### Mudanças de código

```typescript
// 1. Novos imports
import { EditRallyActionsModal, ActionEditState } from '@/components/EditRallyActionsModal';
import { useBatchUpdateRallyActions } from '@/hooks/useRallyActions';
import type { RallyActionUpdate, RallyActionWithPlayer } from '@/types/rallyActions';

// 2. Novo estado
const [editingRallyActions, setEditingRallyActions] = useState<{
  rallyId: string;
  meta: { set_no: number; rally_no: number; serve_side: Side; recv_side: Side; point_won_by: Side | null; reason: Reason | null };
  actions: RallyActionWithPlayer[];
} | null>(null);

// 3. Hook
const batchUpdateActions = useBatchUpdateRallyActions();

// 4. Modificar onClick do botão Pencil
onClick={() => {
  const actions = rallyActionsMap?.get(r.id) || [];
  if (actions.length > 0) {
    setEditingRallyActions({
      rallyId: r.id,
      meta: { set_no: r.set_no, rally_no: r.rally_no, serve_side: r.serve_side, recv_side: r.recv_side, point_won_by: r.point_won_by, reason: r.reason },
      actions,
    });
  } else {
    setEditingRally(r);
  }
}}

// 5. Adicionar novo modal antes do EditRallyModal
<EditRallyActionsModal
  open={!!editingRallyActions}
  onOpenChange={(open) => !open && setEditingRallyActions(null)}
  rallyId={editingRallyActions?.rallyId || ''}
  rallyMeta={editingRallyActions?.meta || defaultMeta}
  actions={editingRallyActions?.actions || []}
  players={effectivePlayers}
  homeName={match.home_name}
  awayName={match.away_name}
  onSave={async (rallyId, actions, metaUpdates) => {
    // Save logic (igual ao RallyHistory)
  }}
/>
```

---

## Ficheiros a Alterar

| Ficheiro | Tipo de Alteração |
|----------|-------------------|
| `src/pages/Stats.tsx` | Adicionar modal de ações + lógica de detecção |

---

## Resultados Esperados

| Antes | Depois |
|-------|--------|
| Modal mostra apenas 6 campos | Modal mostra TODAS as 10 ações |
| Ações repetidas (2º setter, 2º attack) invisíveis | Sequência completa editável |
| Dados cortados/perdidos | Scroll com todas as ações visíveis |

---

## Notas Técnicas

- A página Stats já tem o `rallyActionsMap` carregado via `useRallyActionsForMatch(matchId)`
- O modal `EditRallyActionsModal` já tem scroll interno funcional
- A lógica de save é idêntica à do RallyHistory (usa `useBatchUpdateRallyActions`)
- Rallies sem dados em `rally_actions` continuam a usar o modal legacy (retro-compatibilidade)
