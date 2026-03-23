

## Redesenhar Direção de Ataque com o Mesmo Estilo do QualityPad

Aplicar o mesmo tratamento visual (botões grandes, emojis, cores, feedback forte com scale/glow/ring) à seleção de Direção no fluxo de ataque. A direção continua **opcional** (o utilizador pode avançar sem selecionar).

### Alteração em `src/components/live/ActionEditor.tsx` (linhas ~896-923)

Substituir o `ToggleGroup` da direção por um layout horizontal de botões estilizados, idêntico ao `QualityPad`:

- **Layout**: `flex gap-2 w-full` com botões `flex-1`
- **Cada botão**: `rounded-xl border-2 min-h-[64px]`, emoji grande (`text-xl`), label em baixo (`text-[11px]`)
- **Cores por direção**:
  - Diagonal → `primary` (azul)
  - Linha → `cyan/teal`
  - Amorti → `warning` (amarelo)
  - Z1 → `indigo`
  - Z5 → `violet`
- **Estado selecionado**: `scale-105 shadow-lg ring-2 ring-offset-2 animate-bounce-once` (mesmo padrão do QualityPad)
- **Estado hover**: `hover:scale-[1.02] active:scale-95`

Pode ser implementado inline ou como um novo componente `DirectionPad` — inline é mais simples dado que só é usado neste sítio.

