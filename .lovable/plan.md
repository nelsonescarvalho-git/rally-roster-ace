

# Reduzir Toques no Registo de Ações

## Análise actual (toques por ação)

| Ação | Fluxo actual | Toques |
|------|-------------|--------|
| Serviço | Jogador → Tipo → Qualidade | 3 |
| Receção | Jogador → Qualidade | 2 ✅ |
| Distribuição | Jogador → Qualidade → Destino | 3 |
| Ataque | Jogador → Direção → Qualidade → (KillType) → (Blocker) | 3-5 |
| Defesa | Jogador → Qualidade | 2 ✅ |
| Bloco | Jogador → Qualidade | 2 ✅ |

## Optimizações propostas

### 1. Serviço: 3→2 toques — juntar Tipo + Qualidade num único step

Em vez de Jogador → Tipo → Qualidade, combinar tipo de serviço com a avaliação numa **grid compacta 4×3** onde cada linha é uma qualidade (0-3) e cada coluna é um tipo (Float, Jump Float, Power). Um único toque regista tipo + qualidade.

**Alternativa mais simples**: mover o tipo de serviço para **opcional** — um toggle/chips no topo do step de qualidade. O utilizador carrega na qualidade (obrigatório) e o tipo fica como "Float" por defeito ou o último usado. Reduz a 2 toques obrigatórios.

### 2. Ataque: 3→2 toques base — juntar Direção + Qualidade

Combinar direção e qualidade no mesmo step. UI proposta:
- **Chips/toggle group** no topo com as 5 direções (↗️ ↕️ 🤏 1️⃣ 5️⃣) — toque opcional, fica destacado
- **QualityPad** (0-3) abaixo — toque obrigatório que auto-confirma

O utilizador pode: seleccionar direção + qualidade (2 toques) ou só qualidade (1 toque no step). Total: **Jogador → [Dir+Qualidade]** = 2 toques base.

Para kill/bloco (steps 3-4), mantém-se igual pois são obrigatórios.

### 3. Distribuição: 3→2 toques — juntar Qualidade + Destino

Mostrar a **grid de destinos** com os chips de qualidade (0-3) como toggle no topo. O utilizador selecciona qualidade (toggle) e clica no destino (auto-confirma). Se erro (0), auto-confirma sem destino.

Fluxo: **Jogador → [Qualidade toggle + Destino click]** = 2 toques.

### 4. "Passou Rede" na Defesa — sem step extra

Integrar como **swipe ou long-press** na qualidade 2/3, ou como um **toggle** no step de qualidade. Sem adicionar step extra.

## Alterações técnicas

### `ActionEditor.tsx`

**Serviço** (case 'serve'):
- Step 2: mostrar chips de tipo no topo + QualityPad abaixo. Tipo default = último usado (localStorage). Clicar na qualidade auto-confirma com o tipo seleccionado.
- `totalSteps`: serve passa de 3 → 2

**Ataque** (case 'attack'):
- Step 2: mostrar ToggleGroup com direções no topo (selecção opcional) + QualityPad abaixo. Clicar na qualidade auto-confirma com a direção seleccionada (ou null).
- `totalSteps`: ataque base passa de 3 → 2; code 1/3 de 4→3; com blocker de 5→4

**Distribuição** (case 'setter'):
- Step 2: mostrar ToggleGroup de qualidade (0-3) no topo + grid de destinos abaixo. Qualidade default = 2 (boa). Erro (0) auto-confirma sem destino. Clicar num destino auto-confirma com a qualidade seleccionada.
- `totalSteps`: setter passa de 3 → 2

**Defesa** — adicionar toggle "↗️ Passou Rede" no step de qualidade. Quando activo, clicar na qualidade auto-confirma com `overTheNet: true`.

### Resultado final (toques)

| Ação | Antes | Depois | Redução |
|------|-------|--------|---------|
| Serviço | 3 | 2 | -33% |
| Receção | 2 | 2 | — |
| Distribuição | 3 | 2 | -33% |
| Ataque (base) | 3 | 2 | -33% |
| Ataque (kill) | 4 | 3 | -25% |
| Ataque (bloco+blocker) | 5 | 4 | -20% |
| Defesa | 2 | 2 | — (+toggle) |
| Bloco | 2 | 2 | — |

