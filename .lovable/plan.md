

## Plano: Saltar Qualidade do Passe em Ataques de Bola de Graça

### Problema Identificado

Quando a receção "passa a rede" (bola de graça), o sistema encadeia para o **Ataque do adversário**. Porém, o fluxo atual do `ActionEditor` mostra:

```
Step 1: Jogador + Qualidade do Passe  ← NÃO FAZ SENTIDO (não houve distribuição)
Step 2: Avaliação do Ataque
```

Na bola de graça, não existe distribuição prévia, então pedir "Qualidade do Passe" é desnecessário e confuso.

---

### Solução

Adicionar uma flag `isFreeballAttack` que indica se o ataque é proveniente de uma bola de graça. Quando esta flag estiver ativa:
- Step 1 mostra **apenas** a seleção de jogador
- Ao selecionar jogador, avança **automaticamente** para Step 2 (Avaliação do Ataque)
- A qualidade do passe NÃO é registada (valor `null`)

---

### Alterações Técnicas

#### 1. `src/pages/Live.tsx` - Marcar ataque como "freeball"

Modificar `handleReceptionOverTheNet` para passar uma flag indicando que é ataque de bola de graça:

```typescript
// Linha ~690 - handleReceptionOverTheNet
const handleReceptionOverTheNet = () => {
  // ... código existente ...
  
  setReceptionData(prev => ({ ...prev, code: 0, overTheNet: true }));
  setReceptionCompleted(true);
  
  // Chain to opponent Attack - mark as freeball attack
  const opponentSide: Side = gameState!.recvSide === 'CASA' ? 'FORA' : 'CASA';
  
  // Criar pendingAction diretamente com flag isFreeballAttack
  setPendingAction({
    type: 'attack',
    side: opponentSide,
    playerId: null,
    code: null,
    killType: null,
    setterId: null,
    passDestination: null,
    passCode: null,
    b1PlayerId: null,
    b2PlayerId: null,
    b3PlayerId: null,
    attackPassQuality: null,
    blockCode: null,
    isFreeballAttack: true, // NOVA FLAG
  });
};
```

#### 2. `src/pages/Live.tsx` - Adicionar campo ao tipo PendingAction

```typescript
// Linha ~105 (interface PendingAction)
interface PendingAction {
  type: RallyActionType;
  side: Side;
  playerId: string | null;
  // ... campos existentes ...
  isFreeballAttack?: boolean; // NOVO
}
```

#### 3. `src/pages/Live.tsx` - Passar prop para ActionEditor

```typescript
// Linha ~2260 (ActionEditor JSX)
<ActionEditor
  // ... props existentes ...
  attackPassQuality={pendingAction.attackPassQuality}
  isFreeballAttack={pendingAction.isFreeballAttack ?? false} // NOVO
  // ...
/>
```

#### 4. `src/components/live/ActionEditor.tsx` - Adicionar prop

```typescript
// Linha ~28 (interface ActionEditorProps)
interface ActionEditorProps {
  // ... props existentes ...
  attackPassQuality?: number | null;
  isFreeballAttack?: boolean; // NOVO
  // ...
}
```

#### 5. `src/components/live/ActionEditor.tsx` - Modificar lógica do Step 1 para Ataque

```typescript
// Linha ~577-626 (case 'attack' render)
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
              // Se qualidade já herdada OU é freeball → avançar para Step 2
              if (attackPassQuality !== null || isFreeballAttack) {
                setCurrentStep(2);
              }
            }}
            teamSide={teamSide}
            lastUsedPlayerId={lastUsedPlayerId}
            showZones={!!getZoneLabel}
            getZoneLabel={getZoneLabelWrapper}
          />
          
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
          
          {/* Indicador para qualidade herdada */}
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
        </>
      ) : // ... resto do código Step 2/3
    </div>
  );
```

---

### Fluxo Resultante

| Cenário | Step 1 | Step 2 | Step 3 |
|---------|--------|--------|--------|
| **Ataque Normal** | Jogador + Qualidade Passe | Avaliação Ataque | Kill Type / Bloco |
| **Ataque com Distribuição** | Jogador (qualidade herdada) | Avaliação Ataque | Kill Type / Bloco |
| **Ataque Bola de Graça** | Jogador (sem qualidade) | Avaliação Ataque | Kill Type / Bloco |

---

### Resumo das Alterações

| Ficheiro | Localização | Alteração |
|----------|-------------|-----------|
| `src/pages/Live.tsx` | Interface `PendingAction` | Adicionar `isFreeballAttack?: boolean` |
| `src/pages/Live.tsx` | `handleReceptionOverTheNet` | Criar `pendingAction` com `isFreeballAttack: true` |
| `src/pages/Live.tsx` | `<ActionEditor>` JSX | Passar `isFreeballAttack` prop |
| `src/components/live/ActionEditor.tsx` | Props | Adicionar `isFreeballAttack?: boolean` |
| `src/components/live/ActionEditor.tsx` | Attack Step 1 | Condicionar QualityPad e auto-avançar |

---

### Benefícios

1. **UX correta**: Não pede qualidade de passe quando não se aplica
2. **Fluxo mais rápido**: 2 cliques em vez de 3 para bola de graça
3. **Dados precisos**: Qualidade de passe fica `null` para freeballs
4. **Feedback visual**: Badge indica claramente que é bola de graça

