# Plano Expandido: Gestão Completa de Equipas

## Status: ✅ IMPLEMENTADO

---

## Funcionalidades Implementadas

### ✅ Base de Dados
- `teams.coach_name` - Treinador principal
- `teams.assistant_coach` - Treinador adjunto  
- `teams.team_manager` - Delegado
- `teams.logo_url` - URL do emblema (preparado)
- `team_players.height_cm` - Altura em cm
- `team_players.birth_date` - Data de nascimento
- `team_players.federation_id` - Nº licença federativa
- `team_players.is_captain` - Marcador de capitão

### ✅ Criar Equipa no Setup
- Botão "Criar Nova Equipa" no card de seleção
- Dialog com campos: nome, treinador, adjunto, delegado, cores
- Seleção automática da equipa após criação

### ✅ Dropdown Padronizado de Posições
- Setup.tsx usa dropdown com posições: OH, OP, MB, S, L
- TeamDetail.tsx usa o mesmo dropdown

### ✅ Lista de Equipas Melhorada
- Mostra contagem de jogadores ativos
- Mostra nome do treinador (se existir)
- Cores da equipa aplicadas ao ícone

### ✅ Gestão de Staff Técnico
- Card dedicado no TeamDetail para equipa técnica
- Campos: Treinador Principal, Adjunto, Delegado
- Botão único para guardar todas as alterações

### ✅ Capitão da Equipa
- Checkbox no formulário de adicionar jogador
- Badge com coroa (👑) na tabela de jogadores
- Editável inline na tabela

### ✅ Dados Adicionais do Jogador
- Altura em centímetros
- Data de nascimento
- Número de licença federativa

---

## Ficheiros Alterados

| Ficheiro | Alteração |
|----------|-----------|
| `supabase/migrations/` | Novos campos adicionados |
| `src/types/volleyball.ts` | Interfaces Team e TeamPlayer atualizadas |
| `src/hooks/useTeams.ts` | createTeam e addTeamPlayer com novos parâmetros |
| `src/components/CreateTeamDialog.tsx` | Novo componente para criar equipa |
| `src/pages/Setup.tsx` | Botão criar equipa + dropdown posições |
| `src/pages/Teams.tsx` | Contagem jogadores + treinador |
| `src/pages/TeamDetail.tsx` | Staff técnico + capitão + dados adicionais |

---

## Próximos Passos (Fase 3 - Opcional)

- [ ] Upload de logótipo da equipa
- [ ] Visualização de altura média por posição
- [ ] Cálculo de idade média da equipa
- [ ] Exportação de ficha de equipa
