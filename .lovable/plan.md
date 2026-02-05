
# Plano: Permitir Seleção de Bloqueador em "Bloco Ponto"

## Problema Identificado

Quando o utilizador seleciona **"Bloco Ponto"** (Stuff Block, b_code=3) no Step 3 da ação de Ataque, a ação fecha imediatamente sem permitir selecionar qual jogador (ou jogadores) fez o ponto de bloco.

### Fluxo Atual
1. Ataque → Step 1: Seleciona atacante
2. Ataque → Step 2: Avaliação → "Bloco" (a_code=1)
3. Ataque → Step 3: Resultado do Bloco → "Bloco Ponto"
4. ❌ **Auto-confirma e fecha sem pedir bloqueador**

### Fluxo Desejado
1. Ataque → Step 1: Seleciona atacante
2. Ataque → Step 2: Avaliação → "Bloco" (a_code=1)
3. Ataque → Step 3: Resultado do Bloco → "Bloco Ponto"
4. ✅ **Step 4: Seleciona bloqueador(es) que fez(fizeram) ponto**
5. Confirma e fecha

---

## Solução Proposta

### Adicionar Step 4 para Seleção de Bloqueadores

**Ficheiro:** `src/components/live/ActionEditor.tsx`

#### 1. Atualizar Cálculo de `totalSteps`
```typescript
case 'attack': 
  // Step 4 for blocker selection when b_code=3 (stuff block)
  if (selectedCode === 1 && selectedBlockCode === 3) return 4;
  return (selectedCode === 1 || selectedCode === 3) ? 3 : 2;
```

#### 2. Modificar `handleBlockCodeWithAutoConfirm`
Quando `bCode === 3`, avançar para Step 4 em vez de auto-confirmar:
```typescript
if (bCode === 3) {
  // Stuff block: go to Step 4 to select blocker(s)
  setCurrentStep(4);
  return;
}
```

#### 3. Adicionar UI de Step 4 no caso `attack`
Renderizar PlayerStrip para seleção de bloqueador(es) da equipa adversária (equipa que bloqueou):
```typescript
{currentStep === 4 && selectedBlockCode === 3 && (
  <div className="space-y-3">
    <div className="text-xs font-medium text-muted-foreground text-center">
      Bloqueador(es) do Ponto
    </div>
    <PlayerStrip
      players={opponentPlayers} // Jogadores da equipa que bloqueou
      selectedPlayerId={selectedBlocker1}
      onSelect={(id) => {
        onBlocker1Change?.(id);
        // Auto-confirma após selecionar bloqueador
        handleStuffBlockConfirm(id);
      }}
      teamSide={opponentTeamSide}
    />
  </div>
)}
```

#### 4. Criar Handler de Confirmação para Stuff Block
```typescript
const handleStuffBlockConfirm = useCallback((blockerId: string) => {
  const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
  const blocker = opponentPlayers.find(p => p.id === blockerId);
  
  toast.success(
    `#${blocker?.jersey_number || '?'} · Ponto de Bloco`,
    { duration: 2500 }
  );
  
  onConfirm();
  onAutoFinishPoint?.(blockerSide, 'BLK');
}, [side, opponentPlayers, onConfirm, onAutoFinishPoint]);
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/ActionEditor.tsx` | Adicionar Step 4 para seleção de bloqueador em stuff block |

---

## Considerações

### Jogadores Disponíveis
O Step 4 deve mostrar os jogadores da **equipa adversária** (a equipa que bloqueou), não da equipa que atacou.

### Props Necessárias
O `ActionEditor` pode precisar de receber os jogadores da equipa adversária como prop adicional, ou o componente pai (`Live.tsx`) pode passar essa informação.

### Alternativa Simplificada
Se adicionar props for complexo, podemos:
1. Usar os mesmos slots de bloqueador (blocker1, blocker2, blocker3) que já existem
2. Mostrar apenas um botão "Confirmar Bloco" após selecionar b_code=3
3. Permitir skip com "Sem identificar bloqueador"

---

## Critérios de Sucesso

1. ✅ Ao selecionar "Bloco Ponto", aparece UI para selecionar bloqueador
2. ✅ Bloqueador é registado antes de fechar a ação
3. ✅ Ponto é atribuído à equipa correta (equipa que bloqueou)
4. ✅ Se utilizador não quiser identificar, pode saltar com botão "Sem detalhar"
