

## Plano: Indicador Visual de Dificuldade por Posição de Ataque

### Objetivo
Adicionar indicadores visuais nos botões de destino (P2, P3, P4, OP, PIPE, BACK) para mostrar a dificuldade esperada do ataque em cada posição. Isto ajuda o utilizador a entender que certas posições são mais difíceis de atacar que outras.

---

### Configuração de Dificuldade por Posição

Criar constante com a configuração de dificuldade para cada destino:

```typescript
// Em src/types/volleyball.ts ou diretamente no ActionEditor
const DESTINATION_DIFFICULTY: Record<PassDestination, {
  difficulty: 'easy' | 'medium' | 'hard';
  emoji: string;
  killRate: number;
  color: string;
}> = {
  'P4': { difficulty: 'easy', emoji: '🟢', killRate: 0.45, color: 'bg-success/20 border-success/50' },
  'P2': { difficulty: 'medium', emoji: '🟡', killRate: 0.38, color: 'bg-warning/20 border-warning/50' },
  'OP': { difficulty: 'easy', emoji: '🟢', killRate: 0.42, color: 'bg-success/20 border-success/50' },
  'PIPE': { difficulty: 'medium', emoji: '🟡', killRate: 0.35, color: 'bg-warning/20 border-warning/50' },
  'P3': { difficulty: 'hard', emoji: '🔴', killRate: 0.30, color: 'bg-destructive/20 border-destructive/50' },
  'BACK': { difficulty: 'hard', emoji: '🔴', killRate: 0.25, color: 'bg-destructive/20 border-destructive/50' },
  'OUTROS': { difficulty: 'medium', emoji: '⚪', killRate: 0.30, color: 'bg-muted' },
};
```

**Lógica:**
- **P4/OP** - Posições preferenciais para pontas/opostos (mais fácil)
- **P2/PIPE** - Combinações comuns (dificuldade média)
- **P3/BACK** - Ataques rápidos/segundas linhas (mais difícil de converter)

---

### Alteração no UI: Botões de Destino

**Antes:**
```
┌─────┐ ┌─────┐ ┌─────┐
│ P2  │ │ P3  │ │ P4  │
└─────┘ └─────┘ └─────┘
```

**Depois:**
```
┌─────────┐ ┌─────────┐ ┌─────────┐
│   P2    │ │   P3    │ │   P4    │
│   🟡    │ │   🔴    │ │   🟢    │
│  ~38%   │ │  ~30%   │ │  ~45%   │
└─────────┘ └─────────┘ └─────────┘
```

Cada botão mostrará:
1. Nome da posição (P2, P3, etc.)
2. Indicador colorido de dificuldade (emoji ou círculo)
3. Taxa de kill estimada (opcional, pode ser ocultada)

---

### Alteração em `src/components/live/ActionEditor.tsx`

**Adicionar constante de dificuldade (após linha 24):**

```typescript
// Difficulty configuration for each attack destination
const DESTINATION_DIFFICULTY: Record<PassDestination, {
  emoji: string;
  label: string;
  colorClass: string;
}> = {
  'P4': { emoji: '🟢', label: 'Fácil', colorClass: 'border-l-4 border-l-success' },
  'OP': { emoji: '🟢', label: 'Fácil', colorClass: 'border-l-4 border-l-success' },
  'P2': { emoji: '🟡', label: 'Médio', colorClass: 'border-l-4 border-l-warning' },
  'PIPE': { emoji: '🟡', label: 'Médio', colorClass: 'border-l-4 border-l-warning' },
  'P3': { emoji: '🔴', label: 'Difícil', colorClass: 'border-l-4 border-l-destructive' },
  'BACK': { emoji: '🔴', label: 'Difícil', colorClass: 'border-l-4 border-l-destructive' },
};
```

**Atualizar botões de destino (linhas 404-417):**

```tsx
<div className="grid grid-cols-3 gap-3">
  {availablePositions.map((dest) => {
    const difficulty = DESTINATION_DIFFICULTY[dest];
    
    return (
      <Button
        key={dest}
        variant={selectedDestination === dest ? 'default' : 'outline'}
        className={cn(
          'h-16 flex flex-col gap-1 text-base font-semibold transition-all',
          selectedDestination === dest && 'ring-2 ring-offset-2',
          !selectedDestination && difficulty?.colorClass
        )}
        onClick={() => handleDestinationWithAutoConfirm(dest)}
      >
        <span>{dest}</span>
        {difficulty && (
          <span className="text-xs opacity-70">{difficulty.emoji}</span>
        )}
      </Button>
    );
  })}
</div>
```

---

### Layout Visual Final

```
┌────────────────────────────────────────────────┐
│            Destino do Passe                    │
├────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │    P2    │  │    P3    │  │    P4    │     │
│  │    🟡    │  │    🔴    │  │    🟢    │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │    OP    │  │   PIPE   │  │   BACK   │     │
│  │    🟢    │  │    🟡    │  │    🔴    │     │
│  └──────────┘  └──────────┘  └──────────┘     │
│                                                │
│  ┌────────────────────────────────────────┐   │
│  │         OUTROS (manter 250ms)          │   │
│  └────────────────────────────────────────┘   │
│                                                │
│  🟢 Fácil  🟡 Médio  🔴 Difícil   ← Legenda   │
└────────────────────────────────────────────────┘
```

---

### Ficheiros a Alterar

| Ficheiro | Alteração | Linhas |
|----------|-----------|--------|
| `src/components/live/ActionEditor.tsx` | Adicionar DESTINATION_DIFFICULTY + atualizar botões | ~30 |

---

### Benefícios

1. **UX Melhorada**: Utilizador sabe imediatamente quais posições são mais difíceis
2. **Feedback Visual**: Cores facilitam decisões rápidas durante o jogo
3. **Consistência**: Usa o mesmo padrão de cores (success/warning/destructive) do resto da app

