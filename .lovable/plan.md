

# Plano Expandido: Gestão Completa de Equipas

## Melhorias Identificadas

Após analisar o sistema atual, identifico as seguintes oportunidades de melhoria no contexto de introdução e gestão de equipas:

---

## 1. Campo de Treinador (já planeado) ✓

Adicionar `coach_name` à tabela `teams` para registar o treinador principal.

---

## 2. Criar Equipa Diretamente no Setup (já planeado) ✓

Permitir criar nova equipa sem sair da página de configuração do jogo.

---

## 3. Altura e Data de Nascimento dos Jogadores (NOVO)

Adicionar campos opcionais aos jogadores para análise mais detalhada:

```text
team_players
├── height_cm (INTEGER) - Altura em centímetros
└── birth_date (DATE) - Data de nascimento
```

**Benefícios:**
- Calcular idade média da equipa
- Analisar altura por posição
- Útil para scout de equipas adversárias

---

## 4. Foto/Imagem da Equipa (NOVO)

Adicionar campo para logótipo/emblema da equipa:

```text
teams
└── logo_url (TEXT) - URL da imagem do emblema
```

**Benefícios:**
- Identificação visual nas listas
- Mostrar emblema no scoreboard
- Profissionalizar a apresentação

---

## 5. Posição com Dropdown Padronizado (MELHORIA)

Atualmente o campo "Posição" no Setup é texto livre, mas no TeamDetail já usa dropdown. Uniformizar para dropdown em ambos os locais:
- OH (Ponta)
- OP (Oposto)
- MB (Central)
- S (Levantador)
- L (Líbero)

---

## 6. Número de Identificação do Jogador (NOVO)

Campo opcional para número federativo ou de licença:

```text
team_players
└── federation_id (TEXT) - Número de licença federativa
```

**Benefícios:**
- Identificação oficial em competições
- Cruzamento com dados federativos

---

## 7. Staff Técnico Adicional (NOVO)

Além do treinador principal, suportar equipa técnica:

```text
teams
├── coach_name (TEXT) - Treinador principal
├── assistant_coach (TEXT) - Treinador adjunto
└── team_manager (TEXT) - Delegado/Manager
```

**Benefícios:**
- Registo completo da equipa técnica
- Útil para relatórios oficiais

---

## 8. Contagem de Jogadores na Lista de Equipas (MELHORIA)

Mostrar número de jogadores ativos no card de cada equipa na página `/equipas`:

```text
┌─────────────────────────────────────────┐
│ [🏐] Amares SC                    →     │
│      14 jogadores · Treinador: J. Silva │
└─────────────────────────────────────────┘
```

---

## 9. Capitão da Equipa (NOVO)

Marcar um jogador como capitão:

```text
team_players
└── is_captain (BOOLEAN DEFAULT false)
```

**Benefícios:**
- Identificar capitão nas formações
- Mostrar badge "C" no número
- Importante para protocolos oficiais

---

## Resumo das Alterações de Base de Dados

### Tabela `teams` (novos campos):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `coach_name` | TEXT | Treinador principal |
| `assistant_coach` | TEXT | Treinador adjunto |
| `team_manager` | TEXT | Delegado |
| `logo_url` | TEXT | URL do emblema |

### Tabela `team_players` (novos campos):

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `height_cm` | INTEGER | Altura em cm |
| `birth_date` | DATE | Data nascimento |
| `federation_id` | TEXT | Nº licença |
| `is_captain` | BOOLEAN | É capitão |

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/migrations/` | Adicionar novos campos às tabelas |
| `src/types/volleyball.ts` | Atualizar interfaces `Team` e `TeamPlayer` |
| `src/hooks/useTeams.ts` | Atualizar `createTeam` e `addTeamPlayer` |
| `src/pages/Setup.tsx` | Diálogo criar equipa + dropdown posição |
| `src/pages/Teams.tsx` | Mostrar contagem jogadores e treinador |
| `src/pages/TeamDetail.tsx` | Campos treinador, adjunto, delegado, capitão |

---

## Prioridades Sugeridas

### Fase 1 (Essencial)
1. ✅ Campo de treinador (`coach_name`)
2. ✅ Criar equipa no Setup
3. ✅ Dropdown padronizado de posições
4. ✅ Contagem de jogadores na lista

### Fase 2 (Melhorias)
5. Capitão da equipa (`is_captain`)
6. Staff técnico adicional
7. Altura e data de nascimento

### Fase 3 (Opcional)
8. Logótipo da equipa
9. Número federativo

---

## Interface Proposta - Criar Equipa no Setup

```text
┌────────────────────────────────────────────┐
│ Criar Nova Equipa                      [X] │
├────────────────────────────────────────────┤
│                                            │
│ Nome da Equipa *                           │
│ [________________________________]         │
│                                            │
│ ──── Equipa Técnica (opcional) ────        │
│                                            │
│ Treinador Principal                        │
│ [________________________________]         │
│                                            │
│ Treinador Adjunto                          │
│ [________________________________]         │
│                                            │
│ Delegado                                   │
│ [________________________________]         │
│                                            │
│ ──── Cores ────                            │
│                                            │
│ [🎨 Primária]     [🎨 Secundária]          │
│                                            │
│ [         Criar Equipa          ]          │
└────────────────────────────────────────────┘
```

---

## Interface Proposta - Adicionar Jogador Expandido

```text
┌────────────────────────────────────────────┐
│ Adicionar Jogador                      [X] │
├────────────────────────────────────────────┤
│                                            │
│ Nº *        Nome *                         │
│ [___]       [_________________________]    │
│                                            │
│ Posição               ☐ Capitão            │
│ [▼ Selecionar posição ____________]        │
│                                            │
│ ──── Dados Adicionais (opcional) ────      │
│                                            │
│ Altura (cm)           Data Nascimento      │
│ [___________]         [📅 ___________]     │
│                                            │
│ Nº Licença Federativa                      │
│ [________________________________]         │
│                                            │
│ [        Adicionar Jogador       ]         │
└────────────────────────────────────────────┘
```

---

## Critérios de Sucesso

- ✅ Utilizador pode criar equipa completa (nome, treinador, cores) diretamente no Setup
- ✅ Posições usam dropdown consistente em toda a aplicação
- ✅ Lista de equipas mostra contagem de jogadores e nome do treinador
- ✅ Jogadores podem ter dados adicionais (altura, nascimento, federação)
- ✅ Capitão identificado visualmente com badge "C"
- ✅ Staff técnico completo registado na equipa

