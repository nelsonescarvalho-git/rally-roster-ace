
# Plano: Corrigir Exibição de Estatísticas por Zona de Ataque

## Diagnóstico

Após análise da base de dados e código, identifiquei as seguintes causas:

### Estado Atual da Base de Dados
| Total Ataques | Com pass_destination | Com a_code | Com Ambos |
|---------------|---------------------|------------|-----------|
| 8             | 2                   | 4          | 2         |

**Problema:** 75% dos ataques não têm `pass_destination` definido, por isso não aparecem nas estatísticas por zona.

### Causa Técnica
O hook `useDestinationStats.ts` (linha 54-58) filtra apenas rallies com **ambos** campos:
```typescript
if (!rally.pass_destination || rally.a_code === null) {
  return false; // Rally ignorado
}
```

### Fluxo de Dados Atual
1. Utilizador regista setter → seleciona distribuidor (Step 1) → qualidade (Step 2) → **destino (Step 3)**
2. Se o utilizador salta o Step 3 ou regista ataque diretamente, `pass_destination` fica `null`
3. Estatísticas só aparecem para rallies completos (P4/FORA porque foram os únicos com fluxo completo)

---

## Soluções Propostas

### Solução 1: Tornar Destino Obrigatório (Recomendado)
Impedir que a ação de setter seja confirmada sem destino selecionado.

**Alterações:**
- `ActionEditor.tsx`: Bloquear confirmação automática até destino ser selecionado
- Adicionar feedback visual "Selecione destino para continuar"

### Solução 2: Inferência de Destino Baseado no Atacante
Quando falta `pass_destination`, inferir baseado na posição do atacante:
- Z4 → P4, Z2 → P2, Z3 → P3, Z6 → PIPE/BACK

**Alterações:**
- `useDestinationStats.ts`: Lógica de fallback para calcular destino inferido
- Badge "Destino inferido" nas estatísticas

### Solução 3: Ferramenta de Correção em Massa
Permitir ao utilizador preencher destinos em falta após o jogo.

**Alterações:**
- `RallyHistory.tsx`: Filtro "Sem destino" + edição rápida em lote
- Botão "Preencher destinos em falta" na tab Stats

---

## Plano de Implementação

### Fase 1: Corrigir Fluxo de Dados (Prioridade Alta)

#### 1.1 Tornar Destino Obrigatório no Fluxo Setter
**Ficheiro:** `src/components/live/ActionEditor.tsx`

Alteração na função `handleDestinationWithAutoConfirm`:
- Remover timeout de auto-confirm quando `selectedDestination` é null
- Mostrar mensagem "Selecione destino" se tentar avançar sem seleção

#### 1.2 Validação Adicional ao Gravar Rally
**Ficheiro:** `src/pages/Live.tsx`

Na função `handleFinishPoint`:
- Se existe `setterAction` com `setterId` mas sem `passDestination`, mostrar warning
- Sugerir ao utilizador completar o destino

### Fase 2: Correção de Dados Existentes

#### 2.1 Ferramenta de Edição em Lote
**Ficheiro:** `src/pages/RallyHistory.tsx`

- Adicionar filtro "Destino em falta"
- Quick-edit inline para `pass_destination`
- Botão "Auto-preencher" baseado na posição do atacante

### Fase 3: Estatísticas Mais Resilientes

#### 3.1 Mostrar Estatísticas Parciais
**Ficheiro:** `src/hooks/useDestinationStats.ts`

Opção A: Incluir rallies sem destino num grupo "OUTROS"
```typescript
const dest = rally.pass_destination || 'OUTROS';
```

Opção B: Criar estatísticas separadas para "Com destino" vs "Total"

---

## Sequência de Implementação

1. **Fase 1.1** - Tornar destino obrigatório no setter flow
2. **Fase 1.2** - Adicionar warning ao gravar sem destino
3. **Fase 2.1** - Ferramenta de edição em lote
4. **Fase 3.1** - Estatísticas parciais para dados legados

---

## Detalhes Técnicos

### Alteração Principal em ActionEditor.tsx

```typescript
// ANTES: Auto-confirma imediatamente após selecionar passe quality
onPassCodeChange?.(code);
setCurrentStep(3); // Avança para destino mas não obriga

// DEPOIS: Não permite confirmar setter sem destino
// Step 3 é obrigatório - confirmação só acontece ao clicar destino
```

### Validação em Live.tsx

```typescript
const handleFinishPoint = () => {
  const setterAction = registeredActions.find(a => a.type === 'setter');
  
  // Warning se setter existe mas destino está em falta
  if (setterAction?.setterId && !setterAction?.passDestination) {
    toast.warning('Distribuição sem destino - estatísticas incompletas');
  }
  
  // Continua com gravação...
}
```

### Hook Resiliente

```typescript
// useDestinationStats.ts - fallback para OUTROS
const dest = rally.pass_destination as PassDestination || 'OUTROS';
stats[dest].attempts++;
```

---

## Critérios de Sucesso

1. ✅ Novos rallies sempre têm `pass_destination` quando há setter
2. ✅ Estatísticas mostram todas as zonas com dados
3. ✅ Dados antigos podem ser corrigidos via RallyHistory
4. ✅ Warning visual quando dados estão incompletos
