

# Fix: Texto invisivel quando cor da equipa e branca/clara

## Problema
O hook `useTeamColors` define dinamicamente as variaveis CSS `--home` e `--away` com base nas cores das equipas registadas na BD. No entanto, **nunca calcula nem define `--home-foreground` e `--away-foreground`**. Estas ficam com os valores estaticos do CSS (`0 0% 100%` = branco).

Quando uma equipa tem cor primaria branca ou muito clara:
- **Botoes selecionados** (fundo = cor da equipa, texto = `text-white` hardcoded) ficam invisiveis
- **Texto colorido** (`text-home`, `text-away`) sobre fundos claros do card tambem fica invisivel
- O screenshot mostra exactamente isto na pagina Setup (botao FORA invisivel)

Este problema afeta ~19 componentes em toda a app (Setup, Live, Stats, etc).

## Solucao

### 1. Calcular foreground automaticamente em `useTeamColors`

Adicionar logica de contraste ao hook `useTeamColors.ts`:
- Calcular a luminancia relativa de cada cor primaria
- Se a cor for clara (luminancia > 0.5), usar texto escuro (`220 30% 10%` = foreground do tema dark)
- Se a cor for escura, usar texto branco (`0 0% 100%`)
- Definir `--home-foreground` e `--away-foreground` dinamicamente

```typescript
// Em useTeamColors.ts
function getContrastForeground(hex: string): string {
  const r = parseInt(hex.slice(1,3), 16) / 255;
  const g = parseInt(hex.slice(3,5), 16) / 255;
  const b = parseInt(hex.slice(5,7), 16) / 255;
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  return luminance > 0.55 ? '220 30% 10%' : '0 0% 100%';
}

// Dentro do useEffect:
root.style.setProperty('--home-foreground', getContrastForeground(homePrimary));
root.style.setProperty('--away-foreground', getContrastForeground(awayPrimary));
```

### 2. Substituir `text-white` hardcoded por `text-home-foreground` / `text-away-foreground`

Ficheiros a alterar:

| Ficheiro | Alteracao |
|----------|-----------|
| `src/pages/Setup.tsx` | `color: 'white'` → `color: 'hsl(var(--home-foreground))'` / `'hsl(var(--away-foreground))'` nos botoes de equipa e badges de jogador |
| `src/components/live/ActionSelector.tsx` | `text-white` → `text-home-foreground` / `text-away-foreground` nos botoes selecionados |
| `src/components/live/CompactActionSelector.tsx` | Idem |
| `src/components/live/PlayerGrid.tsx` | `text-white` → `text-home-foreground` / `text-away-foreground` nos jogadores selecionados |
| `src/components/live/ActionPad.tsx` | `text-white` no Badge → usar foreground dinamico |

### 3. Cleanup no `useTeamColors`

Adicionar `--home-foreground` e `--away-foreground` ao bloco de cleanup (removeProperty).

### Impacto
- Corrige a visibilidade em **todas** as paginas que usam cores de equipa
- Sem alteracoes a BD
- Retrocompativel: equipas com cores escuras continuam com texto branco como antes

