
# Plano: Corrigir Scroll do Modal + Auto-Preencher Serviço pela Rotação

## Problemas Identificados

### 1. Scroll do Modal Não Funciona (Desktop)
O `EditRallyActionsModal` usa `ScrollArea` do Radix, mas a altura não está a ser respeitada corretamente. A ação "6. Passe" fica cortada a meio porque:

- O `DialogContent` tem `max-h-[90vh]` e `flex flex-col`
- O `ScrollArea` tem `className="flex-1 px-6"` mas **não tem altura definida explícita**
- O Radix `ScrollArea.Viewport` precisa que o contentor pai tenha altura fixa, não apenas `flex-1`

**Solução**: Adicionar altura máxima explícita ao `ScrollArea` e garantir `overflow-y-auto` como fallback.

### 2. Serviço Não Está Preenchido (Deveria Calcular pela Rotação)
Os dados mostram que o Rally #2 tem:
- Na tabela `rallies`: `s_player_id` e `s_no=11` preenchidos
- Na tabela `rally_actions`: serve tem `player_id` e `player_no=10` (discrepante!)

O problema é que **os dados existem mas estão inconsistentes** (tabela rallies diz #11, tabela rally_actions diz #10). 

A solução pedida é **calcular o servidor pela rotação** (`serve_rot`), que indica qual posição da rotação está a servir, e associar automaticamente ao jogador nessa posição.

---

## Alterações Técnicas

### Ficheiro 1: `src/components/EditRallyActionsModal.tsx`

| Alteração | Descrição |
|-----------|-----------|
| ScrollArea | Mudar de `flex-1` para altura máxima explícita `max-h-[50vh]` ou similar |
| Fallback | Adicionar `overflow-y-auto` ao contentor pai para garantir scroll |
| DialogContent | Ajustar estrutura para garantir que header + scroll + resultado + footer cabem em `90vh` |

**Código Antes**:
```tsx
<ScrollArea className="flex-1 px-6">
  <div className="space-y-3 pb-4">
```

**Código Depois**:
```tsx
<ScrollArea className="flex-1 min-h-0 px-6" style={{ maxHeight: 'calc(90vh - 280px)' }}>
  <div className="space-y-3 pb-4">
```

O `min-h-0` é crítico para flexbox - permite que o elemento encolha abaixo do seu tamanho de conteúdo.

### Ficheiro 2: `src/hooks/useRallyActions.ts`

Adicionar função `useAutoFixServeByRotation` que:

1. Para cada rally sem `serve.player_id` correto
2. Busca a rotação (`serve_rot`) da tabela `rallies`
3. Calcula qual jogador está na posição 1 (servindo) nessa rotação
4. Actualiza a ação de serviço com o `player_id` correto

**Lógica de Rotação**:
```
Rotação 1: Posições [P1, P6, P5, P4, P3, P2] → quem está em P1
Rotação 2: Posições [P2, P1, P6, P5, P4, P3] → quem está em P2 (agora em P1)
... etc
```

### Ficheiro 3: `src/pages/Stats.tsx` e `src/pages/RallyHistory.tsx`

Adicionar opção ao botão "Fix Tudo" para também corrigir serviços pela rotação.

---

## Estrutura Corrigida do Modal

```text
┌─────────────────────────────────────────────────────────────────────────┐
│  DialogContent: max-h-[90vh], flex flex-col                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Header (shrink-0, ~80px)                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Editar Rally #2  [Set 1] [⚠️ Dados incompletos]                     ││
│  │ Serve: Liceu • Receção: Póvoa                                       ││
│  └─────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────┤
│  ScrollArea (flex-1, min-h-0, max-h-[calc(90vh-280px)])                 │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │  1. Serviço [Lic]                                                   ││
│  │  2. Receção [Póv]                                                   ││
│  │  3. Passe [Póv]                                                     ││
│  │  4. Ataque [Póv]                                                    ││
│  │  5. Defesa [Lic]                                                    ││
│  │  6. Passe [Lic] ← agora visível com scroll!                         ││
│  └─────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────┤
│  Separator                                                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Resultado do Rally (shrink-0, ~80px)                                   │
│  [Vencedor: Póvoa ▼] [Razão: BLK ▼]                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Footer (shrink-0, ~60px)                                               │
│  [Cancelar] [Guardar]                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Ficheiros a Alterar

| Ficheiro | Tipo de Alteração |
|----------|-------------------|
| `src/components/EditRallyActionsModal.tsx` | Corrigir altura do ScrollArea para scroll funcionar |
| `src/hooks/useRallyActions.ts` | Adicionar `useAutoFixServeByRotation` hook |
| `src/pages/Stats.tsx` | Integrar fix de serviço no "Fix Tudo" |
| `src/pages/RallyHistory.tsx` | Integrar fix de serviço no "Fix Tudo" |

---

## Resultados Esperados

| Problema | Antes | Depois |
|----------|-------|--------|
| Scroll cortado | Ação 6 invisível | Todas as ações visíveis com scroll suave |
| Serviço vazio | Jogador não aparece | Auto-calculado pela rotação do set |
| Inconsistência serve | rallies diz #11, actions diz #10 | Unificado pelo servidor real da rotação |

---

## Notas Técnicas

- A posição P1 é sempre quem serve numa dada rotação
- A rotação `serve_rot` indica qual das 6 posições está a servir (1-6)
- Para calcular o servidor, precisamos do lineup inicial e aplicar as rotações
- O lineup está em `match_players` com campo `position` (S, OH, MB, L, OP)
- A correspondência posição → P1 depende da formação 5-1 ou 6-2
