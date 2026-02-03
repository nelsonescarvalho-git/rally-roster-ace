

## Plano: Corrigir Fluxo do Ataque - Seleção do Atacante Obrigatória

### Problema

Quando `attackPassQuality` é herdada da Distribuição, o `ActionEditor` inicia no **Step 2** (linhas 143-148), saltando o **Step 1** onde deveria estar a seleção do jogador atacante.

```typescript
// Código problemático
const [currentStep, setCurrentStep] = useState(() => {
  if (actionType === 'attack' && attackPassQuality !== null) {
    return 2;  // ← Salta seleção do jogador!
  }
  return 1;
});
```

---

### Solução

Manter **sempre** o Step 1 para seleção do atacante. Se a qualidade do passe já está herdada:
- Step 1 mostra apenas `PlayerStrip` (sem `QualityPad`)
- Após selecionar jogador → avança automaticamente para Step 2
- Step 2 mostra a avaliação do ataque com indicador visual da qualidade herdada

---

### Fluxo Corrigido

**Cenário A: Com qualidade herdada**
```text
Step 1: [PlayerStrip] → Clica jogador → Auto-avança
Step 2: [Indicador "Passe: X"] + [QualityPad avaliação ataque]
```

**Cenário B: Sem qualidade herdada (contra-ataque)**
```text
Step 1: [PlayerStrip] + [QualityPad qualidade passe] → Clica passe → Auto-avança
Step 2: [QualityPad avaliação ataque]
```

---

### Alterações Técnicas

**Ficheiro:** `src/components/live/ActionEditor.tsx`

#### 1. Remover auto-skip para Step 2 (linha 143-148)

```typescript
// DE:
const [currentStep, setCurrentStep] = useState(() => {
  if (actionType === 'attack' && attackPassQuality !== null) {
    return 2;
  }
  return 1;
});

// PARA:
const [currentStep, setCurrentStep] = useState(1);
```

#### 2. Modificar Step 1 do Ataque (linhas 564-587)

O Step 1 do ataque passa a ter duas variantes:

```typescript
case 'attack':
  return (
    <div className="space-y-4">
      {currentStep === 1 ? (
        <>
          <PlayerStrip
            players={players}
            selectedPlayerId={selectedPlayer || null}
            onSelect={(playerId) => {
              onPlayerChange(playerId);
              // Se qualidade já herdada, avançar automaticamente
              if (attackPassQuality !== null) {
                setCurrentStep(2);
              }
            }}
            teamSide={teamSide}
            lastUsedPlayerId={lastUsedPlayerId}
            showZones={!!getZoneLabel}
            getZoneLabel={getZoneLabelWrapper}
          />
          
          {/* Só mostra QualityPad se qualidade NÃO está herdada */}
          {attackPassQuality === null && (
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
          
          {/* Indicador visual se qualidade está herdada */}
          {attackPassQuality !== null && (
            <div className="text-center p-2 rounded bg-muted/30 text-xs text-muted-foreground">
              Passe: <span className="font-medium text-foreground">{getQualityLabel(attackPassQuality)}</span>
              <span className="opacity-70"> (via Distribuição)</span>
            </div>
          )}
        </>
      ) : currentStep === 2 ? (
        // ... resto sem alterações
```

---

### Lógica de Navegação

| Cenário | Step 1 | Ação do Utilizador | Resultado |
|---------|--------|-------------------|-----------|
| Qualidade herdada | PlayerStrip + Badge | Clica jogador | Avança auto para Step 2 |
| Sem qualidade | PlayerStrip + QualityPad | Clica jogador + qualidade | Avança após qualidade |

---

### Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/ActionEditor.tsx` | Linha 143-148: Sempre iniciar em Step 1 |
| `src/components/live/ActionEditor.tsx` | Linhas 564-587: Condicionar QualityPad e auto-avanço no onSelect do PlayerStrip |

---

### Benefícios

1. **Atacante sempre identificado** antes de prosseguir
2. **Fluxo automático** sem botão "Continuar" extra
3. **UX simplificada** - menos cliques quando qualidade é herdada
4. **Mantém flexibilidade** para contra-ataques sem distribuição prévia

