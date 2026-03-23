

## Adicionar Tab "Bloco" às Estatísticas

### Objetivo
Criar uma tab dedicada ao Bloco na página de Estatísticas, seguindo o mesmo padrão visual das tabs existentes (Receção, Defesa, Ataque).

### Alterações

#### 1. Novo hook `src/hooks/useBlockStats.ts`
- Baseado no padrão de `useDefenseStats.ts`
- Filtra `rally_actions` por `action_type === 'block'`
- Por jogador: Participações, Pontos (code 3), Defensivos (code 2), Ofensivos (code 1), Erros (code 0), Total, Eficácia% (Pontos/Total)
- Incluir bloqueadores secundários (b2_player_id, b3_player_id) no cálculo

#### 2. Novo componente `src/components/BlockTab.tsx`
- Padrão idêntico ao `DefenseTab.tsx`: filtro CASA/FORA, tabela com colunas:
  - `#` | Nome | 🏆 Ponto | 🛡 Def. | ⚡ Ofens. | ✗ Erro | Total | Efic.%
- Thresholds de cor: ≥30% verde, 15-29% amarelo, <15% vermelho (padrão bloco)

#### 3. Atualizar `src/pages/Stats.tsx`
- Importar `BlockTab`
- Adicionar `<TabsTrigger value="block">Bloco</TabsTrigger>` entre Defesa e Ataque
- Adicionar `<TabsContent value="block">` correspondente

### Ficheiros afetados
- `src/hooks/useBlockStats.ts` — novo
- `src/components/BlockTab.tsx` — novo
- `src/pages/Stats.tsx` — adicionar tab + import

