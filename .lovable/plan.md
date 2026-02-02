

## Plano: Eliminar Duplicação da Qualidade do Passe

### Problema Identificado

Atualmente, a "Qualidade do Passe" é pedida **duas vezes**:

1. **Ação Distribuição** (Step 1): Selecionar distribuidor → Escolher qualidade do passe (`pass_code`) → Escolher destino
2. **Ação Ataque** (Step 1): Selecionar atacante → Escolher qualidade do passe (`a_pass_quality`) → Avaliar resultado

Ambos os campos representam **a mesma informação**: a dificuldade da bola que o atacante recebeu.

---

### Solução Proposta: Herança Automática

Quando o utilizador regista a **Distribuição** com uma qualidade, o **Ataque** subsequente deve herdar automaticamente essa qualidade e saltar o passo de seleção.

---

### Lógica de Sincronização

| Cenário | Comportamento |
|---------|---------------|
| Distribuição registada antes do Ataque | Ataque herda `pass_code` → Salta Step 1 |
| Ataque sem Distribuição prévia (contra-ataque) | Ataque pede qualidade normalmente |
| Distribuição atualizada após Ataque | Não atualiza automaticamente (respeitam-se valores manuais) |

---

### Alterações Técnicas

#### 1. `src/pages/Live.tsx` - `handleSelectAction`

Quando o utilizador seleciona "Ataque", verificar se já existe uma ação de Distribuição registada e pré-preencher a qualidade:

```typescript
// Em handleSelectAction, quando type === 'attack'
const setterAction = registeredActions.find(a => a.type === 'setter' && a.side === side);

setPendingAction({
  type,
  side,
  playerId: null,
  code: null,
  killType: null,
  setterId: null,
  passDestination: null,
  passCode: null,
  b1PlayerId: null,
  b2PlayerId: null,
  b3PlayerId: null,
  attackPassQuality: setterAction?.passCode ?? null, // HERDA do setter
  blockCode: null,
});
```

#### 2. `src/components/live/ActionEditor.tsx` - Auto-skip Step 1

Quando o Ataque abre com `attackPassQuality` já preenchido, saltar diretamente para o Step 2:

```typescript
// Efeito para auto-avançar quando qualidade já vem preenchida
useEffect(() => {
  if (actionType === 'attack' && attackPassQuality !== null && currentStep === 1) {
    setCurrentStep(2);
  }
}, [actionType, attackPassQuality, currentStep]);
```

#### 3. Indicador Visual (Opcional)

Mostrar um badge ou indicação quando a qualidade foi herdada:

```typescript
// No Step 2 do Ataque, mostrar a qualidade herdada
{attackPassQuality !== null && (
  <div className="text-xs text-muted-foreground text-center mb-2">
    Passe: {getQualityLabel(attackPassQuality)} (via Distribuição)
  </div>
)}
```

---

### Fluxo Visual Comparativo

**Antes (6 cliques para D+A):**
```text
[Distribuição]
1. Seleciona distribuidor
2. Escolhe qualidade do passe ← DUPLICADO
3. Escolhe destino

[Ataque]
4. Seleciona atacante
5. Escolhe qualidade do passe ← DUPLICADO
6. Avalia resultado
```

**Depois (4 cliques para D+A):**
```text
[Distribuição]
1. Seleciona distribuidor
2. Escolhe qualidade do passe
3. Escolhe destino

[Ataque]
4. Seleciona atacante
5. → (qualidade herdada automaticamente) → Avalia resultado
```

---

### Garantia de Dados Consistentes

Na função `handleFinishPoint`, ambos os campos são guardados:

```typescript
// pass_code vem da Distribuição
pass_code: setterAction?.passCode || null,

// a_pass_quality vem do Ataque (que herdou do setter)
a_pass_quality: attackAction?.attackPassQuality ?? null,
```

Com a herança automática, ambos os valores serão idênticos quando há Distribuição, garantindo consistência estatística.

---

### Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Live.tsx` | `handleSelectAction`: pré-preencher `attackPassQuality` com `pass_code` do setter |
| `src/components/live/ActionEditor.tsx` | Adicionar `useEffect` para auto-skip Step 1 quando `attackPassQuality` já existe |

---

### Benefícios

1. **Menos 2 cliques** por cada jogada Distribuição + Ataque
2. **Dados consistentes**: `pass_code` e `a_pass_quality` sempre sincronizados
3. **Flexibilidade mantida**: Contra-ataques sem distribuição ainda pedem a qualidade
4. **Estatísticas precisas**: Hooks existentes (`useAttackStats`, `useGlobalStats`) funcionam sem alterações

