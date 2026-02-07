

# Plano: Sincronização entre Rally History e Modal de Edição

## Problema Identificado

Existe uma **inconsistência arquitetural** entre duas tabelas de dados:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA ATUAL (DUAL-WRITE)                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   TABELA "rallies" (Legacy)                                         │
│   ├── 1 serviço (s_player_id, s_code)                               │
│   ├── 1 receção (r_player_id, r_code)                               │
│   ├── 1 passe (setter_player_id, pass_destination)                  │
│   ├── 1 ataque (a_player_id, a_code)                                │
│   ├── 1 bloco (b1_player_id, b_code)                                │
│   └── 1 defesa (d_player_id, d_code)                                │
│                                                                     │
│   TABELA "rally_actions" (Nova)                                     │
│   ├── Serviço #12 Rafael (code 1, POWER)                            │
│   ├── Receção #9 Filipe (code 3)                                    │
│   ├── Passe → P3 (pass_code 1)                                      │
│   ├── Ataque #1 Gonçalo (code 1 - Bloqueado)                        │
│   ├── Bloco (code 2 - Defensivo)                                    │
│   ├── Defesa #1 Gonçalo (code -)      ← Código em falta             │
│   ├── Passe → P4 (pass_code 1)        ← 2º passe no rally!          │
│   ├── Ataque #9 Filipe (code 2)       ← 2º ataque!                  │
│   ├── Defesa #13 (code -)             ← 2ª defesa!                  │
│   └── Passe → P4 (pass_code 3)        ← 3º passe!                   │
│                                                                     │
│   CONFLITO: Rally #7 tem 10 ações na rally_actions                  │
│             mas só 1 de cada tipo na rallies                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**O EditRallyModal só lê da tabela `rallies`**, portanto:
- Não vê os múltiplos ataques, defesas e passes
- Mostra "Jogador em falta" porque a primeira ação pode não ter todos os dados
- Não permite editar a sequência completa

---

## Solução Proposta: Novo Modal Baseado em rally_actions

### Estratégia

Criar um novo modal de edição que leia e edite diretamente a tabela `rally_actions`, permitindo:
1. Ver todas as ações na sequência correta
2. Editar cada ação individualmente
3. Adicionar ou remover ações
4. Manter sincronização com a tabela `rallies` para compatibilidade

```text
┌─────────────────────────────────────────────────────────────────────┐
│  NOVO MODAL: Editar Rally #7                                        │
│  Set 1 • Fase 1 • Serve: Póvoa                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ○ 1. Serviço (Póv)                                                 │
│     ┌─────────────────────────────────────┐ ┌─────┐ ┌──────────┐   │
│     │ #12 Rafael Esperanço               │▼│  1  │▼│  POWER  │▼    │
│     └─────────────────────────────────────┘ └─────┘ └──────────┘   │
│                                                                     │
│  ○ 2. Receção (Lic)                                                 │
│     ┌─────────────────────────────────────┐ ┌─────┐                 │
│     │ #9 Filipe Ferreira                  │▼│  3  │▼                │
│     └─────────────────────────────────────┘ └─────┘                 │
│                                                                     │
│  ○ 3. Passe (Lic)                                                   │
│     ┌─────────────────────────────────────┐ ┌─────┐ ┌─────┐         │
│     │ Nenhum                              │▼│  1  │▼│ P3  │▼        │
│     └─────────────────────────────────────┘ └─────┘ └─────┘         │
│                                                                     │
│  ⚔ 4. Ataque (Lic)                                     [⚠ Parcial] │
│     ┌─────────────────────────────────────┐ ┌─────┐                 │
│     │ #1 Gonçalo Mota                     │▼│  1  │▼ ← Bloqueado    │
│     └─────────────────────────────────────┘ └─────┘                 │
│                                                                     │
│  □ 5. Bloco (Póv)                                                   │
│     ┌─────────────────────────────────────┐ ┌─────┐                 │
│     │ Nenhum                              │▼│  2  │▼ ← Defensivo    │
│     └─────────────────────────────────────┘ └─────┘                 │
│                                                                     │
│  ◎ 6. Defesa (Lic)                                     [⚠ Código]  │
│     ┌─────────────────────────────────────┐ ┌─────┐                 │
│     │ #1 Gonçalo Mota                     │▼│  -  │▼ ← Falta código │
│     └─────────────────────────────────────┘ └─────┘                 │
│                                                                     │
│  ○ 7. Passe (Lic)                                                   │
│     ┌─────────────────────────────────────┐ ┌─────┐ ┌─────┐         │
│     │ Nenhum                              │▼│  1  │▼│ P4  │▼        │
│     └─────────────────────────────────────┘ └─────┘ └─────┘         │
│                                                                     │
│  ⚔ 8. Ataque (Lic)                                                  │
│     ┌─────────────────────────────────────┐ ┌─────┐                 │
│     │ #9 Filipe Ferreira                  │▼│  2  │▼ ← Defendido    │
│     └─────────────────────────────────────┘ └─────┘                 │
│                                                                     │
│  ... mais 2 ações ...                                               │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Resultado                                                          │
│  ┌────────────┐ ┌────────────┐                                      │
│  │   Póvoa   │▼ │   KILL    │▼                                      │
│  └────────────┘ └────────────┘                                      │
│                                                                     │
│                              [Cancelar]  [Guardar]                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Novo Componente: `EditRallyActionsModal`

Substitui o `EditRallyModal` com uma versão que:
- Recebe as ações de `rally_actions` em vez de ler da tabela `rallies`
- Permite editar cada ação na sequência
- Atualiza diretamente a tabela `rally_actions`
- Sincroniza os campos principais de volta para `rallies` (para compatibilidade)

```typescript
interface EditRallyActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rallyId: string;
  rallyMeta: {
    set_no: number;
    rally_no: number;
    serve_side: Side;
    recv_side: Side;
    point_won_by: Side | null;
    reason: Reason | null;
  };
  actions: RallyActionWithPlayer[];
  players: (Player | MatchPlayer)[];
  homeName: string;
  awayName: string;
  onSave: (rallyId: string, actions: RallyActionUpdate[], metaUpdates: Partial<Rally>) => Promise<boolean>;
}
```

### 2. Atualizar RallyHistory para Passar Ações

```typescript
// Em RallyHistory.tsx - passar ações ao modal
<EditRallyActionsModal
  open={editModalOpen}
  onOpenChange={setEditModalOpen}
  rallyId={selectedPhase.id}
  rallyMeta={{
    set_no: selectedPhase.set_no,
    rally_no: selectedPhase.rally_no,
    serve_side: selectedPhase.serve_side,
    recv_side: selectedPhase.recv_side,
    point_won_by: selectedPhase.point_won_by,
    reason: selectedPhase.reason,
  }}
  actions={rallyActions?.get(selectedPhase.id) || []}
  players={players}
  homeName={match.home_name}
  awayName={match.away_name}
  onSave={handleSaveRallyActions}
/>
```

### 3. Nova Função de Save que Sincroniza Ambas Tabelas

```typescript
const handleSaveRallyActions = async (
  rallyId: string, 
  actions: RallyActionUpdate[], 
  metaUpdates: Partial<Rally>
) => {
  // 1. Atualizar cada ação na rally_actions
  for (const action of actions) {
    await supabase
      .from('rally_actions')
      .update(action)
      .eq('id', action.id);
  }
  
  // 2. Sincronizar primeira ação de cada tipo para a tabela rallies
  const firstServe = actions.find(a => a.action_type === 'serve');
  const firstReception = actions.find(a => a.action_type === 'reception');
  // ... etc
  
  await supabase
    .from('rallies')
    .update({
      s_player_id: firstServe?.player_id,
      s_code: firstServe?.code,
      r_player_id: firstReception?.player_id,
      // ... sincronizar campos principais
      ...metaUpdates
    })
    .eq('id', rallyId);
    
  return true;
};
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/EditRallyActionsModal.tsx` | **NOVO** - Modal baseado em rally_actions |
| `src/pages/RallyHistory.tsx` | Usar novo modal em vez do antigo |
| `src/hooks/useRallyActions.ts` | Adicionar hook `useUpdateRallyActions` para batch update |

### Ficheiros a Manter (deprecar gradualmente)

| Ficheiro | Estado |
|----------|--------|
| `src/components/EditRallyModal.tsx` | Manter como fallback para rallies sem ações detalhadas |

---

## Lógica de Sincronização rallies ↔ rally_actions

Para manter compatibilidade com estatísticas existentes que leem da tabela `rallies`:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ESTRATÉGIA DE SINCRONIZAÇÃO                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Ao GUARDAR no novo modal:                                          │
│                                                                     │
│  1. Atualizar TODAS as ações na rally_actions                       │
│                                                                     │
│  2. Extrair a PRIMEIRA ação de cada tipo:                           │
│     - Primeiro serve → s_player_id, s_code, s_type                  │
│     - Primeira receção → r_player_id, r_code                        │
│     - Primeiro setter → setter_player_id, pass_destination          │
│     - Primeiro ataque → a_player_id, a_code, kill_type              │
│     - Primeiro bloco → b1_player_id, b_code                         │
│     - Primeira defesa → d_player_id, d_code                         │
│                                                                     │
│  3. Atualizar a tabela rallies com esses valores                    │
│     (para manter compatibilidade com estatísticas legacy)           │
│                                                                     │
│  4. Resultado (point_won_by, reason) mantido na rallies             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Fallback para Dados Legacy

Rallies antigos que não têm ações na `rally_actions`:

```typescript
// No RallyHistory, decidir qual modal usar
const hasDetailedActions = (rallyActions?.get(selectedPhase.id)?.length ?? 0) > 0;

{hasDetailedActions ? (
  <EditRallyActionsModal ... />
) : (
  <EditRallyModal ... /> // Modal legacy para rallies antigos
)}
```

---

## Critérios de Sucesso

- Modal mostra TODAS as ações registadas no rally (não apenas 1 de cada tipo)
- Edições são guardadas na `rally_actions` E sincronizadas para `rallies`
- Badges de "Código em falta" e "Jogador em falta" funcionam por ação
- Rallies antigos (sem dados em `rally_actions`) usam modal legacy
- Estatísticas existentes continuam a funcionar (leem de `rallies`)

---

## Estimativa de Impacto

```text
Componentes novos:     1 (EditRallyActionsModal)
Hooks alterados:       1 (useRallyActions - adicionar batch update)
Páginas alteradas:     1 (RallyHistory)
Migrations:            0 (estrutura de BD já existe)
```

