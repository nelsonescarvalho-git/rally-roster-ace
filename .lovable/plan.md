

# Fix: Texto branco hardcoded em headers de equipa

## Problema
Varios componentes usam `text-white` hardcoded sobre fundos `bg-home` / `bg-away`. Quando a equipa tem cor clara (branco, amarelo, etc), o texto fica invisivel.

## Ficheiros a alterar

### 1. `src/pages/Live.tsx`
- **Linha 2479**: `text-white` → condicional `gameState.serveSide === 'CASA' ? 'text-home-foreground' : 'text-away-foreground'`
- **Linha 2483**: Badge `text-white` → mesma logica
- **Linha 2599**: `text-white` → condicional `gameState.recvSide === 'CASA' ? 'text-home-foreground' : 'text-away-foreground'`
- **Linha 2604**: Badge `text-white` → mesma logica

### 2. `src/components/live/WizardSectionCard.tsx`
- **Linha 53**: `text-white` → `teamSide === 'home' ? 'text-home-foreground' : 'text-away-foreground'`
- **Linha 63**: `bg-white/20` → adicionar foreground dinamico com `text-[hsl(var(--home-foreground))]` etc

### 3. `src/components/live/ComboSetterAttack.tsx`
- **Linha 144**: `text-white` → condicional baseado no `side` prop (`side === 'CASA' ? 'text-home-foreground' : 'text-away-foreground'`)

### 4. `src/components/live/StepProgressBar.tsx`
- **Linha 78**: `text-white` — usa cores fixas de acao (orange-500, green-500, etc), nao cores de equipa. Estas cores sao escuras o suficiente, manter como esta.

### 5. `src/components/live/RallyTimeline.tsx`
- **Linhas 108, 217**: `text-white` sobre circulos de cor fixa (bg-orange-500, bg-green-500). Cores fixas escuras, manter.

## Resumo
Alterar 4 ficheiros (Live.tsx, WizardSectionCard.tsx, ComboSetterAttack.tsx) para usar `text-home-foreground` / `text-away-foreground` em vez de `text-white` hardcoded. StepProgressBar e RallyTimeline usam cores fixas (nao de equipa) e nao precisam de alteracao.

