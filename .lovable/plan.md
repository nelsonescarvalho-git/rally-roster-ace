
# Plano: Auto-Fix para Ações na tabela rally_actions

## Problema Identificado

O auto-fix actual no `useMatch.ts` apenas corrige dados na tabela `rallies` (legacy), mas **não corrige** a tabela `rally_actions` (nova arquitectura sequencial).

### Estado Actual dos Dados

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DADOS INCOMPLETOS EM RALLY_ACTIONS                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  action_type   │ Total │ Sem player_id │ Sem code                               │
│  ─────────────────────────────────────────────────────                          │
│  setter        │  25   │     17        │   17                                   │
│  attack        │  14   │      0        │    0                                   │
│  reception     │  14   │      0        │    0                                   │
│  defense       │  13   │      0        │    0                                   │
│  serve         │  20   │      0        │    0                                   │
│  block         │   4   │      1        │    0                                   │
│                                                                                 │
│  PROBLEMA PRINCIPAL: 17 ações de setter sem player_id                           │
│  (têm pass_destination mas falta identificar o distribuidor)                    │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Causa Raiz

Na nova arquitectura (`rally_actions`), as ações de setter foram registadas com:
- `pass_destination` preenchido (P2, P3, P4, etc.)
- `player_id` em falta
- `code` em falta (pode não ser necessário para todas as acções)

O auto-fix existente só opera na tabela `rallies`.

---

## Solução

Criar uma nova função `autoFixRallyActions` que:

1. **Preenche player_id para setters** baseado no side da ação e posição 'S'
2. **Opcionalmente preenche codes em falta** com valores padrão sensatos

### Lógica de Auto-Fix para Setters

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         LÓGICA DE IDENTIFICAÇÃO DE SETTERS                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Para cada ação de setter sem player_id:                                        │
│                                                                                 │
│  1. Identificar o side da ação (CASA ou FORA)                                   │
│                                                                                 │
│  2. Procurar jogador com position='S' nesse side                                │
│     - CASA: #8 ou #16 (preferir o mais provável baseado em lineups)             │
│     - FORA: #3 (Ethel Mach) ou #10 (João Cardoso)                               │
│                                                                                 │
│  3. Usar o primeiro setter encontrado como fallback                             │
│     (se houver múltiplos, poderia usar rotação, mas simplificamos)              │
│                                                                                 │
│  4. Atribuir player_id e player_no correspondentes                              │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Regras de Auto-Fix por Tipo de Ação

| Tipo | Campo em Falta | Regra de Preenchimento |
|------|----------------|------------------------|
| setter | player_id | Primeiro jogador com position='S' no mesmo side |
| setter | code | Manter NULL (não obrigatório para distribuições) |
| block | player_id | Não auto-fix (requer conhecimento específico) |
| outros | code | Não auto-fix (requer validação manual) |

---

## Alterações Técnicas

### 1. Novo Hook/Função em useRallyActions.ts

Adicionar função `useAutoFixRallyActions`:

```typescript
export function useAutoFixRallyActions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      matchId, 
      players 
    }: { 
      matchId: string; 
      players: (Player | MatchPlayer)[];
    }): Promise<{ fixed: number; errors: number }> => {
      let fixed = 0;
      let errors = 0;
      
      // Buscar todas as ações de setter sem player_id
      const { data: settersToFix } = await supabase
        .from('rally_actions')
        .select('id, side, player_id')
        .eq('action_type', 'setter')
        .is('player_id', null)
        .is('deleted_at', null)
        .in('rally_id', /* rally ids do match */);
      
      for (const action of settersToFix) {
        // Encontrar setter do lado correto
        const setter = players.find(p => 
          p.side === action.side && 
          p.position === 'S'
        );
        
        if (setter) {
          const { error } = await supabase
            .from('rally_actions')
            .update({ 
              player_id: setter.id,
              player_no: setter.jersey_number 
            })
            .eq('id', action.id);
          
          if (error) errors++;
          else fixed++;
        }
      }
      
      return { fixed, errors };
    }
  });
}
```

### 2. Adicionar Botão no RallyHistory.tsx

Usar a nova função para corrigir ações na tabela `rally_actions`:

```typescript
// Novo botão para fix em rally_actions
<Button onClick={() => autoFixRallyActions({ matchId, players })}>
  Fix Distribuições
</Button>
```

### 3. Sincronização com Tabela Rallies

Após corrigir `rally_actions`, sincronizar com `rallies` usando o `useBatchUpdateRallyActions` existente ou uma versão simplificada.

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useRallyActions.ts` | Adicionar `useAutoFixRallyActions` mutation |
| `src/pages/RallyHistory.tsx` | Adicionar botão e integrar nova função |

---

## Resultados Esperados

| Antes | Depois |
|-------|--------|
| 17 setters sem player_id | 0 setters sem player_id |
| Stats mostram "-" na coluna Dist | Stats mostram "#8" ou "#3" na coluna Dist |

---

## Critérios de Sucesso

- Todas as ações de setter têm player_id preenchido
- Sincronização mantém tabela rallies actualizada
- Estatísticas de distribuição mostram jogador identificado
- Não há regressões nas métricas existentes
