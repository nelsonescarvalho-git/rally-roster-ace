

# Plano: Sistema Flexível de Registo e Visualização de Rally

## Problema Identificado

### Limitação da Estrutura Atual
A tabela `rallies` tem uma estrutura **achatada** onde cada linha suporta no máximo:
- 1 serviço (`s_*`)
- 1 receção (`r_*`)
- 1 distribuição (`setter_*`, `pass_*`)
- 1 ataque (`a_*`)
- 1 bloco até 3 jogadores (`b1_*`, `b2_*`, `b3_*`, `b_code`)
- 1 defesa (`d_*`)

Mas um rally real pode ter **múltiplas sequências**:
```text
Serviço → Receção → Distribuição → Ataque → Bloco → Defesa → 
         Nova Distribuição → Novo Ataque → Bloco → Kill
```

### Rally #32 como Exemplo
```text
BD: a_code=3 (Kill), b_code=2 (Defensivo), d_player_id=8 mas d_code=NULL
```

O que aconteceu: houve bloco, depois defesa, mas o fluxo de "Kill" encerrou o registo antes de capturar o código da defesa. A estrutura não consegue representar que **após a defesa** houve mais jogadas.

### Dados Parciais Detectados
- Defesa com jogador mas **sem código**: `d_player_id ✓` + `d_code NULL`
- Bloco com código mas **sem jogadores**: `b_code ✓` + `b1_player_id NULL`
- Ataques **sem atacante** identificado: `a_code ✓` + `a_player_id NULL`

---

## Solução em Duas Partes

### Parte 1: Melhorar Visualização e Detecção de Problemas (Imediato)

Expandir o sistema de avisos para identificar **todos** os tipos de dados parciais e mostrar com clareza o que está em falta.

### Parte 2: Criar Tabela de Ações Detalhadas (Evolução Futura)

Criar uma nova tabela `rally_actions` que armazena cada toque individual, permitindo rallies com múltiplas sequências. A tabela `rallies` mantém-se como resumo/resultado final.

---

## Parte 1: Implementação Imediata

### 1.1. Expandir Detecção de Issues

**Ficheiro:** `src/pages/RallyHistory.tsx`

```typescript
// Deteção expandida de dados parciais
const hasDataIssue = phases.some(p => 
  // Ataque sem atacante identificado
  (p.a_code !== null && !p.a_player_id) ||
  // Passe sem distribuidor
  (p.pass_destination && !p.setter_player_id) ||
  // Receção sem recetor
  (p.r_code !== null && !p.r_player_id)
);

const hasPartialData = phases.some(p =>
  // Defesa com jogador mas sem código
  (p.d_player_id && p.d_code === null) ||
  // Bloco com código mas sem jogadores
  (p.b_code !== null && !p.b1_player_id)
);
```

### 1.2. Novos Badges de Warning na Timeline

**Ficheiro:** `src/components/rally/TimelineItem.tsx`

Adicionar prop `isPartial` e `partialMessage` para indicar dados incompletos:

```typescript
interface TimelineItemProps {
  // ... existentes ...
  isPartial?: boolean;
  partialMessage?: string;
}

// Renderizar badge de aviso
{isPartial && (
  <Badge variant="outline" className="text-[10px] border-warning text-warning">
    ⚠️ {partialMessage || 'Incompleto'}
  </Badge>
)}
```

### 1.3. Aplicar Badges nos Casos Detectados

**Ficheiro:** `src/pages/RallyHistory.tsx`

```typescript
// Defense com jogador mas sem código
if (rally.d_player_id || rally.d_code !== null) {
  const isPartial = rally.d_player_id && rally.d_code === null;
  items.push(
    <TimelineItem
      key={`${rally.id}-def`}
      icon={ShieldCheck}
      action="Defesa"
      // ... resto das props ...
      isPartial={isPartial}
      partialMessage="Código em falta"
    />
  );
}

// Block com código mas sem jogadores
if (rally.b1_player_id || rally.b_code !== null) {
  const isPartial = rally.b_code !== null && !rally.b1_player_id;
  items.push(
    <TimelineItem
      key={`${rally.id}-block`}
      icon={Square}
      action="Bloco"
      // ... resto das props ...
      isPartial={isPartial}
      partialMessage="Jogador(es) em falta"
    />
  );
}
```

### 1.4. Contadores Específicos na Página Stats

**Ficheiro:** `src/pages/Stats.tsx`

Adicionar contagem e mensagens específicas para cada tipo de dado incompleto:

```typescript
// Novos contadores
const defenseWithoutCode = filteredRallies.filter(r => 
  r.d_player_id && r.d_code === null
).length;

const blockWithoutPlayer = filteredRallies.filter(r => 
  r.b_code !== null && !r.b1_player_id
).length;

// Mensagens atualizadas
if (defenseWithoutCode > 0) {
  messages.push(`${defenseWithoutCode} defesa(s) sem código`);
}
if (blockWithoutPlayer > 0) {
  messages.push(`${blockWithoutPlayer} bloco(s) sem jogador`);
}
```

### 1.5. Indicadores no EditRallyModal

**Ficheiro:** `src/components/EditRallyModal.tsx`

Destacar campos parcialmente preenchidos:

```typescript
const hasDefenseIssue = editData.d_player_id && 
  (editData.d_code === null || editData.d_code === undefined);

const hasBlockIssue = editData.b_code !== null && 
  !editData.b1_player_id;

// Na label do campo
<Label className="flex items-center gap-2">
  Defesa
  {hasDefenseIssue && (
    <Badge variant="outline" className="border-warning text-warning text-[10px]">
      Código em falta
    </Badge>
  )}
</Label>
```

---

## Parte 2: Evolução Futura (Nova Tabela)

### 2.1. Criar Tabela `rally_actions`

```sql
CREATE TABLE public.rally_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rally_id UUID NOT NULL REFERENCES rallies(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,  -- ordem dentro do rally (1, 2, 3...)
  action_type TEXT NOT NULL,     -- 'serve', 'reception', 'setter', 'attack', 'block', 'defense'
  side TEXT NOT NULL,            -- 'CASA' ou 'FORA'
  player_id UUID REFERENCES match_players(id),
  player_no INTEGER,
  code INTEGER,                  -- 0-3 qualidade/resultado
  -- Campos específicos por tipo
  pass_destination TEXT,         -- para setter
  kill_type TEXT,                -- para attack (FLOOR/BLOCKOUT)
  b2_player_id UUID,             -- para block (2º bloqueador)
  b3_player_id UUID,             -- para block (3º bloqueador)
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(rally_id, sequence_no)
);
```

### 2.2. Benefícios da Nova Estrutura

| Aspeto | Estrutura Atual | Nova Estrutura |
|--------|-----------------|----------------|
| Ações por rally | Máximo 6 tipos | Ilimitado |
| Múltiplos ataques | Não | Sim |
| Contra-ataques | Perdidos | Registados |
| Defesas múltiplas | Não | Sim |
| Compatibilidade | N/A | 100% (rallies mantém-se) |

### 2.3. Migração de Dados

A tabela `rallies` mantém-se para compatibilidade e como resumo. Os dados existentes podem ser migrados via script opcional.

---

## Ficheiros a Alterar (Parte 1)

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/RallyHistory.tsx` | Expandir deteção de issues, aplicar badges de dados parciais |
| `src/pages/Stats.tsx` | Adicionar contadores específicos para novos tipos de dados incompletos |
| `src/components/rally/TimelineItem.tsx` | Adicionar props `isPartial` e `partialMessage` |
| `src/components/EditRallyModal.tsx` | Destacar campos com dados parciais |

---

## Critérios de Sucesso

### Parte 1 (Imediato)
- ✅ Rally #32 mostra claramente que defesa #8 existe mas **código em falta**
- ✅ Rally #32 mostra claramente que há **b_code=2 mas bloqueadores em falta**
- ✅ Stats.tsx mostra contagens específicas por tipo de problema
- ✅ EditRallyModal destaca campos que precisam de correção
- ✅ Utilizador consegue identificar e corrigir rallies incompletos rapidamente

### Parte 2 (Futuro)
- ✅ Rallies com múltiplas sequências são completamente registados
- ✅ Contra-ataques e defesas sucessivas são capturados
- ✅ Histórico mostra toda a sequência do rally de forma intuitiva

---

## Diagrama: Rally #32 com Nova Visualização

```text
┌─────────────────────────────────────────────────────────────────┐
│ Rally #32 - Set 1                                        [Edit] │
├─────────────────────────────────────────────────────────────────┤
│ ⊙ Serviço    Lic  #10 João Cardoso    ●●○○                     │
│ ◐ Receção    Ama  #15 H.Ferreira      ●●○○                     │
│ ⊕ Passe      Ama  #1 B.Carvas         Q1 → P4                  │
│ ⚔ Ataque     Ama  #11 W.Oliveira      ★★★ FLOOR               │
│ □ Bloco      Lic  ⚠️ Jogador em falta  Defensivo (2)           │
│ ◎ Defesa     Lic  #8 J.Soares         ⚠️ Código em falta       │
├─────────────────────────────────────────────────────────────────┤
│ ✓ Ponto: Amares | Razão: KILL                                  │
│                                                                 │
│ ⚠️ 2 campos incompletos - clique em Edit para corrigir        │
└─────────────────────────────────────────────────────────────────┘
```

