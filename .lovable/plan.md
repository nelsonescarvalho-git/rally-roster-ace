

## Plano: Aplicar Fluxo Step 1/Step 2 na Receção do Wizard

### Problema Identificado

A fase de **Receção** no wizard principal (`Live.tsx`) tem uma implementação inline separada que **não segue** o fluxo padronizado de Step 1 (seleção de jogador) → Step 2 (avaliação).

**Localização:** `src/pages/Live.tsx` linhas 1990-2066

**Código atual:** Mostra `PlayerGrid` e `ColoredRatingButton` simultaneamente:

```typescript
{isReceptionPhase && (
  <CardContent className="p-4 space-y-3">
    <PlayerGrid ... />              {/* Jogador */}
    <div className="grid grid-cols-4 gap-2">
      {[0, 1, 2, 3].map((code) => (
        <ColoredRatingButton ... /> {/* Avaliação - junto! */}
      ))}
    </div>
  </CardContent>
)}
```

---

### Solução

Adicionar um estado `receptionStep` e dividir a UI em dois passos:
- **Step 1**: Apenas `PlayerGrid` → ao selecionar jogador, avança para Step 2
- **Step 2**: Apenas `ColoredRatingButton` (avaliação) → confirma automaticamente

---

### Alterações Técnicas

#### 1. Adicionar estado de step (linha ~159)

```typescript
const [receptionData, setReceptionData] = useState<{ playerId: string | null; code: number | null }>({ playerId: null, code: null });
const [receptionStep, setReceptionStep] = useState(1); // NOVO
```

#### 2. Atualizar `resetWizard` (linha 345)

```typescript
const resetWizard = useCallback(() => {
  setRegisteredActions([]);
  setPendingAction(null);
  setEditingActionIndex(null);
  setComboMode({ active: false, side: null });
  setServeCompleted(false);
  setReceptionCompleted(false);
  setServeData({ playerId: serverPlayer?.id || null, code: null });
  setReceptionData({ playerId: null, code: null });
  setReceptionStep(1); // NOVO - reset do step
}, [serverPlayer?.id]);
```

#### 3. Reset do step ao entrar na fase de receção

Adicionar efeito para resetar o step quando a receção é iniciada:

```typescript
// Reset reception step when entering reception phase
useEffect(() => {
  if (isReceptionPhase) {
    setReceptionStep(1);
  }
}, [isReceptionPhase]);
```

#### 4. Refatorar UI da Receção (linhas 1990-2066)

```typescript
{isReceptionPhase && (
  <Card className="overflow-hidden border relative">
    {/* Gradient top border - mantém */}
    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-lg" ... />
    
    {/* Header com indicador de step */}
    <div className={cn("flex items-center gap-2 px-4 py-2 text-white", ...)}>
      <span className="font-semibold">Receção</span>
      <span className="text-xs opacity-80">(opcional)</span>
      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 ml-auto">
        {receptionStep}/2
      </Badge>
      <span className="text-xs opacity-80">
        {gameState.recvSide === 'CASA' ? match.home_name : match.away_name}
      </span>
    </div>
    
    <CardContent className="p-4 space-y-3">
      {recvPlayers.length === 0 ? (
        /* Erro de jogadores - mantém */
      ) : receptionStep === 1 ? (
        /* ===== STEP 1: SELEÇÃO DE JOGADOR ===== */
        <PlayerGrid
          players={recvPlayers}
          selectedPlayer={receptionData.playerId}
          onSelect={(id) => {
            setReceptionData(prev => ({ ...prev, playerId: id }));
            setReceptionStep(2); // Auto-avança para step 2
          }}
          onDeselect={() => setReceptionData(prev => ({ ...prev, playerId: null }))}
          side={gameState!.recvSide}
          getZoneLabel={(id) => getZoneLabel(id, gameState!.recvSide)}
          columns={6}
          size="sm"
        />
      ) : (
        /* ===== STEP 2: AVALIAÇÃO ===== */
        <div className="space-y-3">
          {/* Indicador do jogador selecionado */}
          <div className="text-center p-2 rounded bg-muted/30 text-sm">
            Jogador: <span className="font-semibold">
              #{recvPlayers.find(p => p.id === receptionData.playerId)?.jersey_number}
            </span>
          </div>
          
          {/* Grid de qualidade */}
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((code) => (
              <ColoredRatingButton
                key={code}
                code={code}
                selected={receptionData.code === code}
                onClick={() => handleReceptionCodeSelect(code)}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Navigation footer - ajustado */}
      <div className="flex justify-between pt-3 border-t mt-3">
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground" 
          onClick={() => {
            if (receptionStep === 2) {
              setReceptionStep(1); // Voltar ao step 1
            } else {
              setServeCompleted(false); // Voltar ao serviço
            }
          }}
        >
          <ChevronLeft className="h-3 w-3" />
          Voltar
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground" 
          onClick={handleReceptionSkip}
        >
          Avançar
          <ChevronRight className="h-3 w-3" />
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

---

### Resumo das Alterações

| Ficheiro | Localização | Alteração |
|----------|-------------|-----------|
| `src/pages/Live.tsx` | Linha ~159 | Adicionar estado `receptionStep` |
| `src/pages/Live.tsx` | `resetWizard` (~345) | Reset `receptionStep` para 1 |
| `src/pages/Live.tsx` | Novo useEffect | Reset step ao entrar em `isReceptionPhase` |
| `src/pages/Live.tsx` | Linhas 1990-2066 | Dividir UI em Step 1 (PlayerGrid) e Step 2 (avaliação) |

---

### Fluxo Final

| Step | UI | Ação do Utilizador | Resultado |
|------|----|--------------------|-----------|
| **1** | PlayerGrid | Clica no jogador | Auto-avança para Step 2 |
| **2** | Badge jogador + ColoredRatingButton | Clica na avaliação | Confirma e avança |

---

### Benefícios

1. **Consistência**: Receção segue o mesmo padrão de todas as outras ações
2. **Foco visual**: Cada step mostra apenas o input relevante
3. **Menos erros**: Não é possível avaliar sem selecionar jogador primeiro
4. **Navegação clara**: Botão "Voltar" funciona entre steps

