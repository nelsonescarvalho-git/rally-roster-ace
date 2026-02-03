

## Plano: Remover Completamente "Qualidade do Passe" da Ação Ataque

### Problema Identificado

Na imagem, ao editar/criar um Ataque (após a cadeia automática Distribuição→Ataque), a UI mostra **"Qualidade do Passe"** no Step 1 — algo que **nunca** deveria aparecer na ação Ataque.

**Código atual em `ActionEditor.tsx` (linhas 601-619):**
```tsx
{/* Só mostra QualityPad se qualidade NÃO está herdada E NÃO é freeball */}
{attackPassQuality === null && !isFreeballAttack && (
  <div className="space-y-2">
    <div className="text-xs font-medium text-muted-foreground text-center">
      Qualidade do Passe
    </div>
    <QualityPad ... />
  </div>
)}
```

Este bloco aparece quando `attackPassQuality === null` E `isFreeballAttack === false` — o que acontece sempre que a herança da Distribuição falha por uma race condition no React.

---

### Solução

**Remover completamente** o bloco "Qualidade do Passe" do caso `attack` no `ActionEditor`. O Ataque nunca pede qualidade de passe diretamente — ou herda da Distribuição, ou é freeball, ou simplesmente não regista essa métrica.

---

### Alterações Técnicas

**Ficheiro:** `src/components/live/ActionEditor.tsx`

#### 1. Remover bloco "Qualidade do Passe" (linhas 601-619)

Eliminar completamente este JSX:
```tsx
{/* Só mostra QualityPad se qualidade NÃO está herdada E NÃO é freeball */}
{attackPassQuality === null && !isFreeballAttack && (
  <div className="space-y-2">
    <div className="text-xs font-medium text-muted-foreground text-center">
      Qualidade do Passe
    </div>
    <QualityPad
      selectedCode={attackPassQuality ?? null}
      onSelect={(code) => {
        if (!selectedPlayer) {
          toast.warning('Selecione um atacante primeiro');
          return;
        }
        onAttackPassQualityChange?.(code);
        setCurrentStep(2);
      }}
    />
  </div>
)}
```

#### 2. Ajustar lógica de avanço automático após seleção de jogador (linha 591)

Atualmente:
```tsx
onSelect={(playerId) => {
  onPlayerChange(playerId);
  // Se qualidade já herdada OU é freeball → avançar automaticamente para Step 2
  if (attackPassQuality !== null || isFreeballAttack) {
    setCurrentStep(2);
  }
}}
```

**Mudar para avançar SEMPRE para Step 2** (uma vez que já não existe mais nada no Step 1):
```tsx
onSelect={(playerId) => {
  onPlayerChange(playerId);
  setCurrentStep(2); // Avançar sempre
}}
```

#### 3. Manter indicadores informativos (opcional mas recomendado)

Manter os indicadores visuais que informam sobre a qualidade herdada/freeball (linhas 621-634), pois são úteis para o utilizador entender o contexto:

```tsx
{/* Indicador visual se qualidade está herdada */}
{attackPassQuality !== null && (
  <div className="text-center p-2 rounded bg-muted/30 text-xs text-muted-foreground">
    Passe: <span className="font-medium text-foreground">{getQualityLabel(attackPassQuality)}</span>
    <span className="opacity-70"> (via Distribuição)</span>
  </div>
)}

{/* Indicador para freeball */}
{isFreeballAttack && attackPassQuality === null && (
  <div className="text-center p-2 rounded bg-warning/10 border border-warning/30 text-xs text-warning">
    🎁 Bola de Graça — Qualidade de passe N/A
  </div>
)}
```

---

### Fluxo Resultante

| Cenário | Step 1 (Antes) | Step 1 (Depois) |
|---------|----------------|-----------------|
| Ataque normal | Jogador + QualityPad | Apenas Jogador |
| Ataque via Distribuição | Jogador + indicador herdado | Jogador + indicador herdado → auto-avança |
| Ataque freeball | Jogador + indicador freeball | Jogador + indicador freeball → auto-avança |

**O avanço para Step 2 (Avaliação do Ataque) é sempre automático após selecionar o atacante.**

---

### Resumo das Alterações

| Ficheiro | Linhas | Alteração |
|----------|--------|-----------|
| `src/components/live/ActionEditor.tsx` | 591 | Remover condição — avançar sempre para Step 2 |
| `src/components/live/ActionEditor.tsx` | 601-619 | **Eliminar** bloco QualityPad do caso 'attack' |

---

### Benefícios

1. **Simplicidade**: Ataque tem fluxo limpo — Jogador → Avaliação → (Kill Type/Block Result se aplicável)
2. **Sem race conditions**: Não depende mais de herança de props assíncronas
3. **UX consistente**: A qualidade do passe pertence à Distribuição, não ao Ataque

