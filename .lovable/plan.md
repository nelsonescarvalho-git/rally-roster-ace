

## Plano: Padronizar Fluxo de Todas as Ações - Seleção Jogador → Auto-Avanço

### Análise do Estado Atual

| Ação | Step 1 | Step 2 | Auto-Avanço após Jogador? |
|------|--------|--------|---------------------------|
| **Serve/Reception/Defense** | PlayerStrip + QualityPad juntos | — | ❌ Não (apenas 1 step) |
| **Setter** | PlayerStrip + QualityPad | Destino | ❌ Avança após qualidade |
| **Attack** | PlayerStrip + (QualityPad ou Badge) | Avaliação | ✅ Se qualidade herdada |
| **Block** | 3 Bloqueadores + Pool | Avaliação | ❌ Botão "Continuar" |

---

### Objetivo

Padronizar **todas** as ações para o fluxo:
1. **Step 1**: Selecionar jogador(es)
2. **Auto-avanço** para Step 2 após seleção
3. **Step 2**: Avaliação/Destino → confirma automaticamente

---

### Alterações por Ação

#### 1. Serve / Reception / Defense (linhas 444-462)

**Antes:** PlayerStrip e QualityPad no mesmo ecrã

**Depois:** 
- Step 1: PlayerStrip → ao clicar jogador, avança para Step 2
- Step 2: QualityPad → confirma automaticamente

```typescript
case 'serve':
case 'reception':
case 'defense':
  return (
    <div className="space-y-4">
      {currentStep === 1 ? (
        <PlayerStrip
          players={players}
          selectedPlayerId={selectedPlayer || null}
          onSelect={(playerId) => {
            onPlayerChange(playerId);
            setCurrentStep(2);
          }}
          teamSide={teamSide}
          lastUsedPlayerId={lastUsedPlayerId}
          showZones={!!getZoneLabel}
          getZoneLabel={getZoneLabelWrapper}
        />
      ) : (
        <QualityPad
          selectedCode={selectedCode ?? null}
          onSelect={handleCodeWithAutoConfirm}
        />
      )}
    </div>
  );
```

#### 2. Setter (linhas 465-553)

**Antes:** Step 1 = PlayerStrip + QualityPad juntos, Step 2 = Destino

**Depois:**
- Step 1: PlayerStrip → ao clicar distribuidor, avança para Step 2
- Step 2: QualityPad (Qualidade do Passe) → avança para Step 3
- Step 3: Destino → confirma automaticamente

```typescript
case 'setter':
  return (
    <div className="space-y-4">
      {currentStep === 1 ? (
        <PlayerStrip
          players={players}
          selectedPlayerId={selectedSetter || null}
          onSelect={(id) => {
            onSetterChange?.(id);
            setCurrentStep(2);
          }}
          teamSide={teamSide}
          showZones={!!getZoneLabel}
          getZoneLabel={getZoneLabelWrapper}
        />
      ) : currentStep === 2 ? (
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground text-center">
            Qualidade do Passe
          </div>
          <QualityPad
            selectedCode={selectedPassCode ?? null}
            onSelect={(code) => {
              onPassCodeChange?.(code);
              setCurrentStep(3);
            }}
          />
        </div>
      ) : (
        // Step 3: Destino (código existente)
        <div className="space-y-3">...</div>
      )}
    </div>
  );
```

**Nota:** `totalSteps` para setter passa de 2 para 3.

#### 3. Block (linhas 743-845)

**Antes:** Step 1 = Seleção de 3 bloqueadores + botão "Continuar", Step 2 = Avaliação

**Depois:**
- Step 1: Seleção de bloqueadores → auto-avança após 1º bloqueador (com opção de adicionar mais)
- Alternativamente: manter UI atual mas auto-avançar após 1º bloqueador selecionado

Para manter a flexibilidade de selecionar até 3 bloqueadores, a melhor abordagem é:
- Auto-avançar 500ms após a última seleção de bloqueador
- OU manter o botão "Continuar" mas torná-lo mais proeminente

**Proposta:** Manter o fluxo atual do Block pois é diferente (múltiplos jogadores). O utilizador pode querer selecionar 1, 2 ou 3 bloqueadores antes de avaliar.

---

### Atualização de `totalSteps`

```typescript
const totalSteps = useMemo(() => {
  switch (actionType) {
    case 'serve': 
    case 'reception': 
    case 'defense': 
      return 2;  // Era 1, agora são 2 steps
    case 'setter': 
      return 3;  // Era 2, agora são 3 steps
    case 'attack': 
      return (selectedCode === 1 || selectedCode === 3) ? 3 : 2;
    case 'block': 
      return 2;
    default: 
      return 1;
  }
}, [actionType, selectedCode]);
```

---

### Atualização dos Atalhos de Teclado (linhas 409-427)

Os atalhos 0-3 só devem funcionar no Step de avaliação (não no Step 1 de seleção de jogador):

```typescript
useKeyboardShortcuts({
  enabled: true,
  onQualitySelect: (code) => {
    // Só permite atalhos de qualidade se não estiver no Step 1 (seleção de jogador)
    if (currentStep === 1) return;
    
    if (actionType === 'setter' && currentStep === 2) {
      onPassCodeChange?.(code);
      setCurrentStep(3);
    } else if (actionType === 'attack' && currentStep === 2) {
      handleCodeWithAutoConfirm(code);
    } else if (currentStep === 2) {
      handleCodeWithAutoConfirm(code);
    }
  },
  // ...
});
```

---

### Resumo das Alterações

| Ficheiro | Linhas | Alteração |
|----------|--------|-----------|
| `ActionEditor.tsx` | 149-161 | Atualizar `totalSteps` para refletir novos steps |
| `ActionEditor.tsx` | 409-427 | Bloquear atalhos 0-3 no Step 1 |
| `ActionEditor.tsx` | 444-462 | Refatorar Serve/Reception/Defense para 2 steps |
| `ActionEditor.tsx` | 465-553 | Refatorar Setter para 3 steps |

---

### Fluxo Final

| Ação | Step 1 | Step 2 | Step 3 |
|------|--------|--------|--------|
| **Serve** | Jogador → auto | Avaliação → confirma | — |
| **Reception** | Jogador → auto | Avaliação → confirma | — |
| **Defense** | Jogador → auto | Avaliação → confirma | — |
| **Setter** | Jogador → auto | Qualidade → auto | Destino → confirma |
| **Attack** | Jogador → auto | Avaliação → (auto ou step3) | Kill Type / Block Result |
| **Block** | Bloqueadores → botão | Avaliação → confirma | — |

---

### Benefícios

1. **Consistência**: Todas as ações seguem o padrão Jogador → Avaliação
2. **Menos fricção**: Auto-avanço elimina cliques desnecessários
3. **Foco visual**: Cada step mostra apenas o input relevante
4. **Prevenção de erros**: Não é possível avaliar sem selecionar jogador

