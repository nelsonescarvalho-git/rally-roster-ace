
# Plano: Corrigir Contagem de Distribuições e Kills por Zona

## Problema Identificado

### Análise da Base de Dados

Existem **duas arquitecturas de dados diferentes** a serem usadas em paralelo:

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ARQUITECTURA 1: SETTER + ATTACK SEPARADOS                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Ações registadas separadamente:                                                │
│  ├── seq 3: setter → pass_destination=P4, code=NULL                             │
│  └── seq 4: attack → code=2 (defendido)                                         │
│                                                                                 │
│  O hook actual procura por esta estrutura                                       │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                      ARQUITECTURA 2: SETTER COM CODE (COMBO)                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Fluxo simplificado ou legacy onde o code está no setter:                       │
│  └── seq 7: setter → pass_destination=P2, code=3 (KILL!)                        │
│                                                                                 │
│  O hook actual IGNORA o code nestes setters                                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Dados Reais

A query mostra que muitas ações de `setter` têm `code` directamente preenchido:
- setter code=3 → KILL
- setter code=2 → Defendido
- setter code=1 → Bloqueado

Para o match actual (Póvoa vs Liceu), existem setters com código:
- Rally `a1986455...`: setter CASA → P2, code=3 (KILL!)
- Rally `caee639f...`: setter CASA → P4, code=3 (KILL!)

### O Hook Actual

O `useDestinationStatsFromActions` **só conta kills quando encontra uma ação `attack` separada**:

```typescript
// Linha 68-91 - só procura por ações attack
if (action.action_type === 'attack' && pendingDestination !== null) {
  // Só conta quando há attack action
  stats[dest].attempts++;
  if (code === 3) stats[dest].kills++;
}
```

Isto significa que kills registados directamente no setter (code=3) são **completamente ignorados**.

---

## Solução

Actualizar o hook para considerar **ambas as arquitecturas**:

1. Se o setter tem `code`, usar esse código directamente
2. Se o setter não tem `code`, procurar por uma ação `attack` subsequente

### Lógica Corrigida

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         NOVA LÓGICA                                             │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  Para cada setter com pass_destination:                                         │
│                                                                                 │
│  1. Contar como attempt IMEDIATAMENTE                                           │
│                                                                                 │
│  2. Verificar se o setter tem code:                                             │
│     ├── SE setter.code !== null → usar esse código                              │
│     │   (arquitectura combo/legacy)                                             │
│     │                                                                           │
│     └── SE setter.code === null → procurar attack subsequente                   │
│         (arquitectura modular)                                                  │
│                                                                                 │
│  3. Categorizar resultado:                                                      │
│     ├── code 3 → kill                                                           │
│     ├── code 2 → defended                                                       │
│     ├── code 1 → blocked                                                        │
│     └── code 0 → error                                                          │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Alterações Técnicas

### Ficheiro: `src/hooks/useDestinationStatsFromActions.ts`

**Código actual** (linhas 61-102):
```typescript
for (const action of sortedActions) {
  if (action.action_type === 'setter' && action.pass_destination) {
    pendingDestination = action.pass_destination as PassDestination;
    pendingSetterSide = action.side as Side;
  }
  
  if (action.action_type === 'attack' && pendingDestination !== null) {
    // ... só conta aqui
  }
}
```

**Código corrigido**:
```typescript
for (const action of sortedActions) {
  if (action.action_type === 'setter' && action.pass_destination) {
    const dest = action.pass_destination as PassDestination;
    const setterSide = action.side as Side;
    
    // Aplicar filtro de equipa
    if (!side || setterSide === side) {
      // 1. Contar SEMPRE como attempt
      stats[dest].attempts++;
      
      // 2. Se o setter tem code, usar directamente (arquitectura combo)
      if (action.code !== null && action.code !== undefined) {
        if (action.code === 3) stats[dest].kills++;
        else if (action.code === 0) stats[dest].errors++;
        else if (action.code === 1) stats[dest].blocked++;
        else if (action.code === 2) stats[dest].defended++;
        // Não guardar pending - já processámos o resultado
        continue;
      }
    }
    
    // 3. Se não tem code, guardar para correlacionar com attack
    pendingDestination = dest;
    pendingSetterSide = setterSide;
    pendingSetterAlreadyCounted = !side || setterSide === side;
  }
  
  // Procurar attack para setters sem code
  if (action.action_type === 'attack' && pendingDestination !== null) {
    const attackSide = action.side as Side;
    
    if (pendingSetterSide === attackSide && (!side || attackSide === side)) {
      const dest = pendingDestination;
      const code = action.code;
      
      // Não incrementar attempts de novo (já contámos no setter)
      if (code === 3) stats[dest].kills++;
      else if (code === 0) stats[dest].errors++;
      else if (code === 1) stats[dest].blocked++;
      else if (code === 2) stats[dest].defended++;
    }
    
    pendingDestination = null;
    pendingSetterSide = null;
    pendingSetterAlreadyCounted = false;
  }
}
```

---

## Impacto da Alteração

| Aspecto | Detalhe |
|---------|---------|
| Ficheiros alterados | 1 (`useDestinationStatsFromActions.ts`) |
| Linhas alteradas | ~30 |
| Risco | Baixo - apenas adiciona lógica para arquitectura alternativa |

---

## Resultados Esperados

| Destino | Antes | Depois |
|---------|-------|--------|
| P2 | 0/1 · 0% | **1/3 · 33%** (1 kill encontrado) |
| P3 | 0/1 · 0% | 0/2 · 0% |
| P4 | 0/2 · 0% | **1/6 · 17%** (1 kill encontrado) |
| **Total** | 0 kills | **2 kills** |

---

## Critérios de Sucesso

- Distribuições com code no setter são contadas correctamente
- Distribuições com attack separado continuam a funcionar
- Kills aparecem nas estatísticas de eficácia por zona
- Dados consistentes em todas as páginas (Live, Stats)
