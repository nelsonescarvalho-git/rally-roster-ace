

# Plano: Corrigir Visualização de Dados e Mensagens de Aviso em Stats/RallyHistory

## Problema Identificado

Após análise detalhada da base de dados e do código, identifiquei que:

1. **Os dados do rally #14 estão corretos na BD:**
   - `a_player_id`: preenchido (7a69b6eb... = #12 Rafael Esperanço)
   - `a_no`: 12
   - `a_code`: 1 (tocou bloco)
   - `b_code`: null
   - `reason`: BLK

2. **O atacante aparece corretamente na tabela de Stats** (coluna "Atq" mostra `#12 1`)

3. **O warning "9 rally(s) com dados em falta (KILL sem atacante)" é misleading** porque:
   - A condição inclui rallies com `a_code === 1 && b_code === null` (bloco tocado sem resultado)
   - Mas o texto só menciona "KILL sem atacante"

4. **Possível problema de cache**: Quando o utilizador edita um rally e guarda, o `loadMatch()` é chamado mas pode haver um delay na propagação do estado para a UI.

---

## Soluções Propostas

### 1. Corrigir Texto do Warning em Stats.tsx

Atualizar o texto do alerta para refletir todas as condições verificadas:

```typescript
// Antes:
{ralliesWithIssues.length} rally(s) com dados em falta (KILL sem atacante)

// Depois - mostrar texto mais específico:
const killsWithoutAttacker = filteredRallies.filter(r => r.reason === 'KILL' && !r.a_player_id).length;
const setterWithoutDest = filteredRallies.filter(r => r.setter_player_id && !r.pass_destination).length;
const blockWithoutResult = filteredRallies.filter(r => r.a_code === 1 && r.b_code === null).length;

// Mostrar mensagens separadas ou combinadas:
{killsWithoutAttacker > 0 && `${killsWithoutAttacker} kill(s) sem atacante`}
{setterWithoutDest > 0 && `${setterWithoutDest} passe(s) sem destino`}
{blockWithoutResult > 0 && `${blockWithoutResult} bloco(s) sem resultado (b_code)`}
```

### 2. Forçar Refresh de Cache Após Edição

Adicionar invalidação de React Query no `updateRally`:

**Ficheiro:** `src/hooks/useMatch.ts`

```typescript
import { useQueryClient } from '@tanstack/react-query';

// No updateRally:
const updateRally = useCallback(async (rallyId: string, updates: Partial<Rally>) => {
  try {
    const { error } = await supabase.from('rallies').update(updates).eq('id', rallyId);
    if (error) throw error;
    
    // Invalidar todas as queries relacionadas
    queryClient.invalidateQueries({ queryKey: ['rallies', matchId] });
    queryClient.invalidateQueries({ queryKey: ['match', matchId] });
    queryClient.invalidateQueries({ queryKey: ['attackStats', matchId] });
    
    await loadMatch();
    return true;
  } catch (error: any) {
    toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    return false;
  }
}, [loadMatch, toast, matchId, queryClient]);
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Stats.tsx` | Corrigir texto do warning para ser mais específico |
| `src/hooks/useMatch.ts` | Adicionar invalidação de React Query no `updateRally` |

---

## Critérios de Sucesso

- ✅ Warning mostra texto preciso para cada tipo de problema
- ✅ Após editar um rally, os dados são imediatamente refletidos na tabela
- ✅ Não é necessário clicar manualmente em "Recalcular" após edições

