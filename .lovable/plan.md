
# Plano: Corrigir Perda de Dados de Destino do Ataque

## Diagnóstico

### Estado Atual da Base de Dados

| Rally | a_code | setter_player_id | pass_destination | Observação |
|-------|--------|------------------|------------------|------------|
| 1     | 3      | ✅               | ✅ P4            | OK |
| 4     | 1      | ✅               | ❌ null          | Destino perdido |
| 6     | 3      | ✅               | ❌ null          | Destino perdido |
| 10    | 1      | ✅               | ✅ P4            | OK |
| 12    | 3      | ✅               | ✅ P3            | OK (editado manualmente) |

### Causas Identificadas

1. **Fluxo Quick Attack** (`QuickAttackBar`)
   - Permite registar ataque sem passar pelo fluxo de setter/distribuição
   - Resultado: `pass_destination` fica sempre `null`

2. **Ataque Direto sem Setter**
   - Utilizador pode selecionar "Ataque" no `ActionSelector` sem antes registar "Setter"
   - O fluxo de ataque não obriga a ter setter previamente

3. **Condição de corrida no encadeamento**
   - No `ActionEditor`, o `handleDestinationWithAutoConfirm` faz:
     1. `onDestinationChange(dest)` - atualiza state assincronamente
     2. `setTimeout(50ms)` → `onConfirm({passDestination: dest})` com override
     3. `onChainAction('attack', side)` - abre ataque
   - O override resolve a race condition, mas se o utilizador clicar noutra ação antes dos 50ms, os dados podem perder-se

---

## Soluções Propostas

### Solução 1: Propagar Destino para Ação de Ataque (Recomendado)

Quando o ataque é encadeado após o setter, copiar o `pass_destination` do setter para o ataque, garantindo redundância.

### Solução 2: Validação Obrigatória no Setter

Bloquear a confirmação do setter até que um destino seja selecionado (já implementado parcialmente mas pode ser reforçado).

### Solução 3: Fallback no `handleFinishPoint`

Se existe ação de ataque mas não existe setter, verificar se o ataque tem dados de destino no próprio objeto.

---

## Plano de Implementação

### Fase 1: Garantir Propagação de Destino

**Ficheiro:** `src/pages/Live.tsx`

Modificar `handleChainAction` para copiar dados do setter para a nova ação:

```typescript
const handleChainAction = useCallback((type: RallyActionType, side: Side) => {
  // Se estamos a abrir um ataque, verificar se existe setter com destino
  let inheritedDestination: PassDestination | null = null;
  if (type === 'attack') {
    const setterAction = registeredActions.find(a => a.type === 'setter' && a.side === side);
    if (setterAction?.passDestination) {
      inheritedDestination = setterAction.passDestination;
    }
  }
  
  handleSelectAction(type, side);
  // Armazenar destino herdado para usar no attackAction
}, [handleSelectAction, registeredActions]);
```

### Fase 2: Adicionar `inheritedDestination` ao Ataque

**Ficheiro:** `src/types/volleyball.ts`

Adicionar campo opcional ao `RallyAction`:
```typescript
interface RallyAction {
  // ... campos existentes
  inheritedDestination?: PassDestination | null; // Destino copiado do setter
}
```

### Fase 3: Usar Destino Herdado no `handleFinishPoint`

**Ficheiro:** `src/pages/Live.tsx`

Modificar a construção do `rallyData`:
```typescript
const rallyData: Partial<Rally> = {
  // ...
  pass_destination: setterAction?.passDestination 
    || attackAction?.inheritedDestination 
    || null,
};
```

### Fase 4: Validação Visual no Timeline

**Ficheiro:** `src/components/live/RallyTimeline.tsx`

Mostrar badge de aviso quando ataque existe sem destino no setter:
- Badge amarelo: "Destino em falta"

### Fase 5: Log de Debug Temporário

Adicionar `console.log` antes do `saveRally` para diagnosticar:
```typescript
console.log('Rally data:', {
  setterAction,
  attackAction,
  pass_destination: rallyData.pass_destination,
});
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Live.tsx` | Propagar destino no encadeamento, fallback no finish |
| `src/types/volleyball.ts` | Adicionar `inheritedDestination` a RallyAction |
| `src/components/live/RallyTimeline.tsx` | Badge de aviso para destino em falta |

---

## Critérios de Sucesso

1. ✅ Novos ataques após setter sempre têm `pass_destination` salvo
2. ✅ Ataques rápidos mostram aviso de destino em falta
3. ✅ Histórico de rallies permite identificar e corrigir destinos em falta
4. ✅ Console logs ajudam a diagnosticar falhas durante testes
