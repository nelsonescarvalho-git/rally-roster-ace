

## Plano: Tratar Receção que Passa a Rede (Bola de Graça)

### Problema Identificado

Atualmente, quando a receção é avaliada como **código 0 (Má)**, o sistema assume automaticamente que é um **ACE** e termina o rally:

```typescript
// Live.tsx - linha 471-472
if (receptionData.code === 0) {
  return { winner: gameState.serveSide, reason: 'ACE' };
}
```

**Isto não cobre o cenário real onde:**
- A receção é má mas a bola **passa a rede** e vai para o campo adversário
- O adversário pode então **Atacar** (situação mais comum - "bola de graça") ou **Defender**

### Análise de UX

Há duas situações distintas quando a receção é má (código 0):

| Situação | Descrição | Resultado |
|----------|-----------|-----------|
| **ACE Real** | A bola toca no chão da equipa receptora | Ponto para o servidor (ACE) |
| **Bola Passa a Rede** | A bola vai diretamente para o campo adversário | Rally continua - adversário ataca |

### Solução Proposta

Substituir o botão de código 0 (Má) na receção por **duas opções claras**:

1. **"ACE" (🎯)** - Bola tocou no chão → termina rally como ACE
2. **"Passou Rede" (↗️)** - Bola foi para o adversário → encadeia para Ataque do adversário

---

### Alterações Técnicas

#### Ficheiro: `src/pages/Live.tsx`

##### 1. Modificar a UI da Receção (Step 2)

Substituir o grid de 4 colunas por:
- Linha 1: Qualidades positivas (1, 2, 3)
- Linha 2: Opções negativas (ACE e Passou Rede)

```typescript
{/* ===== STEP 2: AVALIAÇÃO ===== */}
<div className="space-y-3">
  {/* Indicador do jogador selecionado */}
  <div className="text-center p-2 rounded bg-muted/30 text-sm">
    Jogador: <span className="font-semibold">
      #{recvPlayers.find(p => p.id === receptionData.playerId)?.jersey_number}
    </span>
  </div>
  
  {/* Qualidades positivas (rally continua na nossa equipa) */}
  <div className="grid grid-cols-3 gap-2">
    {[1, 2, 3].map((code) => (
      <ColoredRatingButton
        key={code}
        code={code}
        selected={receptionData.code === code}
        onClick={() => handleReceptionCodeSelect(code)}
      />
    ))}
  </div>
  
  {/* Separador */}
  <div className="flex items-center gap-2 text-xs text-muted-foreground">
    <div className="flex-1 h-px bg-border" />
    <span>Receção má</span>
    <div className="flex-1 h-px bg-border" />
  </div>
  
  {/* Opções negativas */}
  <div className="grid grid-cols-2 gap-2">
    {/* ACE - bola tocou no chão */}
    <Button
      variant={receptionData.code === 0 && !receptionData.overTheNet ? "destructive" : "outline"}
      className="h-12 flex flex-col items-center justify-center gap-0.5"
      onClick={() => handleReceptionAce()}
    >
      <span className="text-lg">🎯</span>
      <span className="text-xs">ACE</span>
    </Button>
    
    {/* Passou Rede - bola foi para o adversário */}
    <Button
      variant={receptionData.overTheNet ? "default" : "outline"}
      className="h-12 flex flex-col items-center justify-center gap-0.5 border-warning/50"
      onClick={() => handleReceptionOverTheNet()}
    >
      <span className="text-lg">↗️</span>
      <span className="text-xs">Passou Rede</span>
    </Button>
  </div>
</div>
```

##### 2. Atualizar o estado `receptionData`

```typescript
// Linha ~159 - adicionar campo overTheNet
const [receptionData, setReceptionData] = useState<{ 
  playerId: string | null; 
  code: number | null;
  overTheNet: boolean;
}>({ playerId: null, code: null, overTheNet: false });
```

##### 3. Adicionar função `handleReceptionAce`

```typescript
const handleReceptionAce = () => {
  if (!receptionData.playerId) {
    toast({
      title: 'Seleciona o recetor',
      description: 'Escolhe o jogador que recebeu antes de confirmar',
      variant: 'destructive'
    });
    return;
  }
  
  const recAction: RallyAction = {
    type: 'reception',
    side: gameState!.recvSide,
    phase: 1,
    playerId: receptionData.playerId,
    code: 0, // Má
  };
  
  setRegisteredActions(prev => {
    const existingIndex = prev.findIndex(a => a.type === 'reception');
    if (existingIndex >= 0) {
      const updated = [...prev];
      updated[existingIndex] = recAction;
      return updated;
    }
    return [...prev, recAction];
  });
  
  // Marcar como NÃO passou a rede (ACE real)
  setReceptionData(prev => ({ ...prev, code: 0, overTheNet: false }));
  setReceptionCompleted(true);
  // autoOutcome vai tratar como ACE automaticamente
};
```

##### 4. Adicionar função `handleReceptionOverTheNet`

```typescript
const handleReceptionOverTheNet = () => {
  if (!receptionData.playerId) {
    toast({
      title: 'Seleciona o recetor',
      description: 'Escolhe o jogador que recebeu antes de confirmar',
      variant: 'destructive'
    });
    return;
  }
  
  const recAction: RallyAction = {
    type: 'reception',
    side: gameState!.recvSide,
    phase: 1,
    playerId: receptionData.playerId,
    code: 1, // Registar como "Fraca" (1) - não 0, para evitar ACE automático
  };
  
  setRegisteredActions(prev => {
    const existingIndex = prev.findIndex(a => a.type === 'reception');
    if (existingIndex >= 0) {
      const updated = [...prev];
      updated[existingIndex] = recAction;
      return updated;
    }
    return [...prev, recAction];
  });
  
  setReceptionData(prev => ({ ...prev, code: 1, overTheNet: true }));
  setReceptionCompleted(true);
  
  // Encadear para Ataque do ADVERSÁRIO
  const opponentSide: Side = gameState!.recvSide === 'CASA' ? 'FORA' : 'CASA';
  handleSelectAction('attack', opponentSide);
};
```

##### 5. Atualizar `resetWizard` 

```typescript
const resetWizard = useCallback(() => {
  // ... código existente ...
  setReceptionData({ playerId: null, code: null, overTheNet: false });
  // ...
}, [serverPlayer?.id]);
```

---

### Fluxo Final

| Situação | Passos | Resultado |
|----------|--------|-----------|
| **ACE** | Serviço → Receção (Jogador) → 🎯 ACE | Ponto servidor |
| **Bola Passa Rede** | Serviço → Receção (Jogador) → ↗️ Passou Rede | **Abre Ataque do adversário** |
| **Receção OK** | Serviço → Receção (Jogador) → Qualidade 1/2/3 | Continua com Distribuição |

---

### Resumo das Alterações

| Ficheiro | Localização | Alteração |
|----------|-------------|-----------|
| `src/pages/Live.tsx` | Estado (~159) | Adicionar `overTheNet: boolean` a `receptionData` |
| `src/pages/Live.tsx` | `resetWizard` | Reset `overTheNet` |
| `src/pages/Live.tsx` | Novas funções | `handleReceptionAce()` e `handleReceptionOverTheNet()` |
| `src/pages/Live.tsx` | UI Receção Step 2 | Substituir grid 4 colunas por layout com opções ACE/Passou Rede |

---

### Benefícios

1. **Clareza visual**: Duas opções distintas para cenários diferentes
2. **Encadeamento lógico**: "Passou Rede" abre automaticamente Ataque do adversário
3. **Dados precisos**: Distingue ACE real de bola de graça para estatísticas
4. **UX intuitiva**: Iconografia clara (🎯 vs ↗️) para decisão rápida

