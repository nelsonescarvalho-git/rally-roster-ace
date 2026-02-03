

## Plano: Corrigir Reset do Step ao Encadear Ações

### Problema Identificado

Quando uma ação é encadeada (ex: Ataque "Defendido" → Defesa), o componente `ActionEditor` **não reseta o `currentStep` para 1**. Isto acontece porque:

1. O `currentStep` é inicializado com `useState(1)` (linha 143)
2. Durante a ação anterior (Ataque), o `currentStep` avança para 2 ou 3
3. Quando a ação Defesa é encadeada via `onChainAction`, o React pode reutilizar a instância do componente
4. O `useState(1)` **não é re-executado** em re-renders, mantendo o valor antigo

```typescript
// Código actual - NÃO reseta quando props mudam
const [currentStep, setCurrentStep] = useState(1);
```

---

### Solução

Adicionar um `useEffect` que reseta `currentStep` para 1 sempre que `actionType` ou `side` mudam:

```typescript
const [currentStep, setCurrentStep] = useState(1);

// Resetar step quando a ação ou equipa mudam (encadeamento)
useEffect(() => {
  setCurrentStep(1);
}, [actionType, side]);
```

---

### Alterações Técnicas

**Ficheiro:** `src/components/live/ActionEditor.tsx`

#### Após linha 143, adicionar:

```typescript
// Reset step when action type or side changes (for chained actions)
useEffect(() => {
  setCurrentStep(1);
}, [actionType, side]);
```

---

### Fluxo Corrigido

| Situação | Antes | Depois |
|----------|-------|--------|
| Ataque (Step 2) → Encadeia Defesa | Defesa inicia no Step 2 ❌ | Defesa inicia no Step 1 ✅ |
| Receção → Encadeia Distribuição | Distribuição pode iniciar errado | Sempre Step 1 ✅ |
| Qualquer encadeamento | Step herdado | Reset automático ✅ |

---

### Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/ActionEditor.tsx` | Adicionar `useEffect` para resetar `currentStep` após linha 143 |

---

### Benefícios

1. **Fluxo consistente**: Todas as ações encadeadas iniciam no Step 1
2. **Seleção do jogador garantida**: O utilizador sempre escolhe o jogador primeiro
3. **Fix simples**: Apenas 3 linhas de código
4. **Sem efeitos colaterais**: O reset só ocorre quando `actionType` ou `side` mudam

