

# Plano: Adicionar Tipo de Serviço (Serve Type) + Atualização do Guia do Sistema

## Parte 1: Implementação do Tipo de Serviço

### Contexto - Tipos de Serviço no DataVolley

De acordo com o manual do DataVolley e análises de scouting, o sistema utiliza códigos de "Ball Type" para identificar a técnica do serviço:

| Código DV | Tipo | Descrição PT |
|-----------|------|--------------|
| H (High) | Standing Float | Flutuante Parado |
| M (Medium) | Jump Float | Flutuante em Salto |
| Q (Quick) | Jump Topspin | Potência/Topspin |
| O (Other) | Outros | Serviços atípicos (side-arm, híbrido, etc.) |

### Opções de Tipos de Serviço a Implementar

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     TIPOS DE SERVIÇO                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│   │  〰️ FLOAT    │  │ ↗️ JUMP_FLOAT│  │ ⚡ POWER     │              │
│   │  Flutuante   │  │  Flutuante   │  │  Potência    │              │
│   │  Parado      │  │  em Salto    │  │  (Topspin)   │              │
│   └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
│   Opcional:                                                         │
│   ┌──────────────┐                                                  │
│   │  ❓ OTHER    │  → Para serviços atípicos                        │
│   └──────────────┘                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Alterações Técnicas

#### 1. Base de Dados - Nova Coluna

```sql
-- Adicionar coluna serve_type à tabela rally_actions
ALTER TABLE rally_actions ADD COLUMN serve_type TEXT;

-- Opcional: também adicionar à tabela rallies
ALTER TABLE rallies ADD COLUMN s_type TEXT;
```

#### 2. Tipos TypeScript

**Ficheiro: `src/types/volleyball.ts`**
```typescript
export type ServeType = 'FLOAT' | 'JUMP_FLOAT' | 'POWER' | 'OTHER';

export const SERVE_TYPE_LABELS: Record<ServeType, {
  emoji: string;
  label: string;
  shortLabel: string;
  description: string;
}> = {
  FLOAT: { 
    emoji: '〰️', 
    label: 'Flutuante Parado', 
    shortLabel: 'Float',
    description: 'Serviço por baixo com trajetória flutuante'
  },
  JUMP_FLOAT: { 
    emoji: '↗️', 
    label: 'Flutuante em Salto', 
    shortLabel: 'J.Float',
    description: 'Serviço em salto com trajetória flutuante'
  },
  POWER: { 
    emoji: '⚡', 
    label: 'Potência', 
    shortLabel: 'Power',
    description: 'Serviço em salto com rotação (topspin)'
  },
  OTHER: { 
    emoji: '❓', 
    label: 'Outro', 
    shortLabel: 'Outro',
    description: 'Serviço atípico (side-arm, híbrido, etc.)'
  },
};
```

#### 3. UI do ActionEditor - Novo Step para Serviço

Transformar o serviço de 2 steps para 3 steps:

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     SERVIÇO - NOVO FLUXO                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Step 1: Quem serve?                                                │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐                               │
│  │#1 │ │#7 │ │#9 │ │#10│ │#12│ │#18│                               │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘                               │
│                     ↓                                               │
│                                                                     │
│  Step 2: Tipo de serviço? (NOVO)                                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │ 〰️ Flutuante │ │ ↗️ J.Float  │ │ ⚡ Potência  │                 │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
│                     ↓                                               │
│                                                                     │
│  Step 3: Resultado?                                                 │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐                                           │
│  │ ✕ │ │ − │ │ + │ │ ★ │                                            │
│  │ 0 │ │ 1 │ │ 2 │ │ 3 │                                           │
│  └───┘ └───┘ └───┘ └───┘                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4. Ficheiros a Alterar (Tipo de Serviço)

| Ficheiro | Alteração |
|----------|-----------|
| `src/types/volleyball.ts` | Adicionar `ServeType` e `SERVE_TYPE_LABELS` |
| `src/types/rallyActions.ts` | Adicionar `serve_type` ao interface |
| `src/components/live/ActionEditor.tsx` | Novo Step 2 para tipo de serviço |
| `src/pages/Live.tsx` | Passar `selectedServeType` e handler ao ActionEditor |
| Migração SQL | Adicionar coluna `serve_type` às tabelas |

---

## Parte 2: Atualização do Guia do Sistema

### Secções a Adicionar/Atualizar em `src/pages/Guide.tsx`

#### 1. Nova Secção: Tipos de Serviço

Adicionar após a secção de códigos por tipo de ação:

```typescript
// New section for Serve Types
const SERVE_TYPES = [
  { 
    type: 'FLOAT', 
    emoji: '〰️', 
    label: 'Flutuante Parado',
    description: 'Serviço executado sem salto, com trajetória flutuante e imprevisível',
    datavolleyCode: 'H'
  },
  { 
    type: 'JUMP_FLOAT', 
    emoji: '↗️', 
    label: 'Flutuante em Salto',
    description: 'Serviço em salto mas com contacto flutuante (sem rotação)',
    datavolleyCode: 'M'
  },
  { 
    type: 'POWER', 
    emoji: '⚡', 
    label: 'Potência (Topspin)',
    description: 'Serviço em salto com rotação forte (topspin), maior velocidade',
    datavolleyCode: 'Q'
  },
  { 
    type: 'OTHER', 
    emoji: '❓', 
    label: 'Outro',
    description: 'Serviços atípicos (side-arm, híbridos, underhand, etc.)',
    datavolleyCode: 'O'
  },
];
```

#### 2. Atualizar Secção de Serviço

Adicionar informação sobre tipos na secção existente:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🎯 Serviço                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Códigos de Resultado:                                              │
│  ┌─────┬─────────────────┬─────────────────────────────────┐        │
│  │  0  │ Erro de serviço │ Bola na rede ou fora            │        │
│  │  1  │ Serviço fraco   │ Receção fácil para adversário   │        │
│  │  2  │ Serviço bom     │ Receção dificultada             │        │
│  │  3  │ Ás              │ Ponto direto ou falha receção   │        │
│  └─────┴─────────────────┴─────────────────────────────────┘        │
│                                                                     │
│  Tipos de Serviço: (NOVO)                                           │
│  ┌──────────┬─────────────────┬─────────────────────────────┐       │
│  │ 〰️ Float │ Flutuante Parado│ Sem salto, trajetória flutuante│     │
│  │ ↗️ J.Float│ Flutuante Salto │ Salto + contacto flutuante  │       │
│  │ ⚡ Power │ Potência/Topspin│ Salto + rotação forte       │       │
│  │ ❓ Outro │ Atípico         │ Side-arm, underhand, etc.   │       │
│  └──────────┴─────────────────┴─────────────────────────────┘       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 3. Adicionar Secção: Regras de Bloco (Atualizado)

Documentar as regras de elegibilidade de bloco recentemente implementadas:

```typescript
const BLOCK_RULES = {
  eligibleZones: [2, 3, 4],
  excludedPositions: ['L', 'LIBERO'],
  description: 'Apenas jogadores na linha de ataque podem bloquear legalmente'
};
```

Conteúdo da secção:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🛡️ Regras de Bloco                                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Quem pode bloquear:                                                │
│  ✅ Jogadores em Z2, Z3 ou Z4 (linha de ataque)                     │
│  ❌ Líberos (posição L) - nunca podem bloquear                      │
│  ❌ Jogadores em Z1, Z5 ou Z6 - falta de posição                    │
│                                                                     │
│     ┌───────┐   ┌───────┐   ┌───────┐                               │
│     │  Z4   │   │  Z3   │   │  Z2   │  ← Podem bloquear             │
│     │  ✅   │   │  ✅   │   │  ✅   │                               │
│     └───────┘   └───────┘   └───────┘                               │
│     ═══════════════════════════════════  ← REDE                     │
│     ┌───────┐   ┌───────┐   ┌───────┐                               │
│     │  Z5   │   │  Z6   │   │  Z1   │  ← NÃO podem bloquear         │
│     │  ❌   │   │  ❌   │   │  ❌   │                               │
│     └───────┘   └───────┘   └───────┘                               │
│                                                                     │
│  Bloco Ponto (Stuff Block):                                         │
│  • Quando a_code=1 e b_code=3                                       │
│  • O sistema mostra apenas jogadores elegíveis do adversário        │
│  • Selecionar o bloqueador principal para atribuir o ponto          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 4. Adicionar Secção: Líbero no Início do Set

Documentar a funcionalidade recentemente adicionada:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  🔄 Entrada do Líbero no Início do Set                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  No Rally 1 de cada set:                                            │
│                                                                     │
│  Equipa que RECEBE:                                                 │
│  • Pode trocar jogador pelo líbero em Z1, Z5 ou Z6                  │
│  • Prompt automático aparece se houver líbero disponível            │
│                                                                     │
│  Equipa que SERVE:                                                  │
│  • Pode trocar jogador pelo líbero em Z5 ou Z6 apenas               │
│  • Z1 está a servir, normalmente não se substitui                   │
│  • Botão "Entrar" disponível no LiberoCard                          │
│                                                                     │
│  Após Rally 1:                                                      │
│  • Líbero só pode entrar quando a equipa recebe                     │
│  • Segue regras normais de substituição de líbero                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

#### 5. Atualizar Secção: Fluxo de Distribuição para Ataque

Documentar o encadeamento automático:

```text
┌─────────────────────────────────────────────────────────────────────┐
│  👐 Distribuição → Ataque (Encadeamento Automático)                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Após registar uma distribuição:                                    │
│  1. Selecionar distribuidor                                         │
│  2. Selecionar qualidade (Q0-Q3)                                    │
│  3. Selecionar destino (P2, P3, P4, etc.)                           │
│     ↓                                                               │
│  4. Sistema abre AUTOMATICAMENTE o ataque para a mesma equipa       │
│     - Step 1 já preenchido com o destino como zona                  │
│     - Qualidade do passe herdada para contexto                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Resumo de Ficheiros a Alterar

| Ficheiro | Tipo de Alteração |
|----------|-------------------|
| `src/types/volleyball.ts` | Adicionar `ServeType` e constantes |
| `src/types/rallyActions.ts` | Adicionar `serve_type` ao interface |
| `src/components/live/ActionEditor.tsx` | Novo Step 2 para tipo de serviço |
| `src/pages/Live.tsx` | Gerir estado `selectedServeType` |
| `src/pages/Guide.tsx` | Adicionar 4 novas secções de documentação |
| Migração SQL | Adicionar coluna `serve_type` |

---

## Critérios de Sucesso

### Tipo de Serviço
- Novo step aparece entre seleção de jogador e qualidade
- 3 opções principais visíveis (Float, J.Float, Power)
- Opção "Outro" discreta mas acessível
- Campo guardado na base de dados
- Compatível com dados existentes (nullable)

### Guia do Sistema
- Nova secção "Tipos de Serviço" com todos os tipos documentados
- Secção "Regras de Bloco" com zonas elegíveis e exclusão de líberos
- Secção "Líbero no Início do Set" com regras por equipa
- Secção "Encadeamento Distribuição → Ataque" documentada
- Todas as secções com exemplos visuais e explicações claras

