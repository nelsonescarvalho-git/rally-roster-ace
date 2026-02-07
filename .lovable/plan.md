
# Plano: Botão Auto-Fix Completo para Rally Actions

## Problema Identificado

A tabela `rally_actions` contém dados incompletos que precisam ser corrigidos em massa:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         DADOS INCOMPLETOS IDENTIFICADOS                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Tipo de Problema                    │ Quantidade │ Solução                     │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Setters sem code (resultado)        │    17      │ Inferir do attack seguinte  │
│  Blocks sem player_id                │     1      │ Não auto-fixável            │
│                                                                                 │
│  NOTA: Os 17 setters já têm player_id preenchido (fix anterior funcionou)       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Análise Detalhada

1. **Setters com player_id mas sem code**: Já têm `player_id` e `pass_destination`, mas falta o `code` (resultado da distribuição)
   - Quando existe um `attack` na sequência seguinte, o `code` do setter deve ser derivado do resultado do ataque
   - Kill (attack.code=3) → setter.code=3
   - Defendido (attack.code=2) → setter.code=2
   - Bloqueado (attack.code=1) → setter.code=1
   - Erro (attack.code=0) → setter.code=0

2. **Block sem player_id**: Não é possível inferir automaticamente - requer edição manual

---

## Solução

Criar um novo hook `useComprehensiveAutoFix` que:

1. **Preenche codes em falta nos setters** baseado no resultado do attack subsequente
2. **Sincroniza com a tabela rallies** (legacy) para manter consistência
3. **Reporta estatísticas detalhadas** do que foi corrigido

### Lógica de Inferência de Código para Setters

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         LÓGICA DE INFERÊNCIA DE CÓDIGO                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Para cada setter com code = NULL:                                              │
│                                                                                 │
│  1. Procurar a próxima ação do mesmo rally com sequence_no > setter.seq        │
│                                                                                 │
│  2. Se for um attack do mesmo side:                                             │
│     └── setter.code = attack.code                                               │
│                                                                                 │
│  3. Se não houver attack subsequente:                                           │
│     └── Manter NULL (não inferível)                                             │
│                                                                                 │
│  Mapeamento:                                                                    │
│  attack.code 3 (Kill)      → setter.code 3 (Excelente)                          │
│  attack.code 2 (Defendido) → setter.code 2 (Boa)                                │
│  attack.code 1 (Bloqueado) → setter.code 1 (Fraca)                              │
│  attack.code 0 (Erro)      → setter.code 0 (Má)                                 │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### 1. Novo Hook em `src/hooks/useRallyActions.ts`

Adicionar função `useComprehensiveAutoFix`:

```typescript
export function useComprehensiveAutoFix() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      matchId, 
      players 
    }: { 
      matchId: string; 
      players: MatchPlayer[];
    }): Promise<{
      settersFixed: number;
      settersSkipped: number;
      errors: number;
      details: string[];
    }> => {
      const results = { settersFixed: 0, settersSkipped: 0, errors: 0, details: [] };
      
      // 1. Buscar todos os rally IDs deste match
      const { data: rallies } = await supabase
        .from('rallies').select('id')
        .eq('match_id', matchId).is('deleted_at', null);
      
      const rallyIds = rallies.map(r => r.id);
      
      // 2. Buscar todas as ações
      const { data: allActions } = await supabase
        .from('rally_actions')
        .select('*')
        .in('rally_id', rallyIds)
        .is('deleted_at', null)
        .order('rally_id').order('sequence_no');
      
      // 3. Agrupar por rally_id
      const actionsByRally = groupBy(allActions, 'rally_id');
      
      // 4. Para cada rally, inferir codes em falta
      for (const [rallyId, actions] of Object.entries(actionsByRally)) {
        for (const action of actions) {
          if (action.action_type === 'setter' && action.code === null) {
            // Procurar attack subsequente do mesmo side
            const nextAttack = actions.find(a => 
              a.sequence_no > action.sequence_no &&
              a.action_type === 'attack' &&
              a.side === action.side
            );
            
            if (nextAttack && nextAttack.code !== null) {
              // Inferir code do ataque
              await supabase
                .from('rally_actions')
                .update({ code: nextAttack.code })
                .eq('id', action.id);
              
              results.settersFixed++;
            } else {
              results.settersSkipped++;
            }
          }
        }
      }
      
      // 5. Sincronizar com tabela rallies
      // ... sync logic
      
      return results;
    }
  });
}
```

### 2. Actualizar `src/pages/RallyHistory.tsx`

Substituir o botão "Fix Dist" actual por um botão "Fix Tudo" mais abrangente:

```typescript
<Button
  variant="outline"
  size="sm"
  className="gap-1.5"
  onClick={async () => {
    setIsComprehensiveFix(true);
    try {
      const result = await comprehensiveAutoFix.mutateAsync({
        matchId,
        players: getEffectivePlayers()
      });
      
      toast.success(`Corrigido: ${result.settersFixed} setters`);
      
      if (result.settersSkipped > 0) {
        toast.warning(`${result.settersSkipped} não inferíveis`);
      }
      
      loadMatch();
    } finally {
      setIsComprehensiveFix(false);
    }
  }}
>
  <Wand2 className="h-4 w-4" />
  Fix Tudo
</Button>
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/hooks/useRallyActions.ts` | Adicionar `useComprehensiveAutoFix` mutation |
| `src/pages/RallyHistory.tsx` | Substituir/adicionar botão "Fix Tudo" |

---

## Resultados Esperados

| Campo | Antes | Depois |
|-------|-------|--------|
| Setters sem code | 17 | 0 (inferidos do attack) |
| Sincronização rallies | Parcial | Completa |

---

## Resumo das Correções

1. **Fix Setters Codes** - Inferir código do setter baseado no resultado do ataque subsequente
2. **Sincronização Legacy** - Actualizar tabela `rallies` com os dados corrigidos
3. **Feedback Detalhado** - Mostrar exactamente o que foi corrigido

---

## Notas Importantes

- O block sem player_id (1 caso) **não será corrigido automaticamente** pois requer decisão manual sobre qual jogador atribuir
- Esta função complementa os auto-fix existentes:
  - `autoFixMissingPlayerIds` - corrige player IDs na tabela rallies
  - `autoFixMissingKillTypes` - adiciona FLOOR a kills sem tipo
  - `useAutoFixRallyActions` - preenche player_id em setters
  - **NOVO**: `useComprehensiveAutoFix` - preenche codes inferidos do contexto
