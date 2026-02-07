

# Plano: Edição Completa de Jogadores

## Objetivo

Permitir a edição de todos os campos de um jogador, incluindo os novos metadados:
- Nome
- Posição
- Capitão
- **Altura (cm)**
- **Data de Nascimento**
- **Nº Licença Federativa**

## Problema Atual

A edição inline na tabela só permite alterar nome, posição e capitão. Os campos adicionais (altura, nascimento, federação) ficam inacessíveis após a criação do jogador.

## Solução Proposta

Criar um **modal de edição** (similar ao `AddPlayerDialog`) que aparece ao clicar no ícone de edição. Isto permite:
- Espaço adequado para todos os campos
- Melhor UX em dispositivos móveis
- Consistência com o diálogo de criação

## Interface Proposta

```text
┌─────────────────────────────────────────────────┐
│ ✏️ Editar Jogador                               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌───────────┐  ┌─────────────────────────────┐│
│  │  Número   │  │      Nome *                 ││
│  │    [7]    │  │  [João Pedro]               ││
│  └───────────┘  └─────────────────────────────┘│
│                                                 │
│  ┌─────────────────┐  ┌─────────────────────┐  │
│  │   Posição       │  │  ☐ Capitão          │  │
│  │   [OH ▼]        │  │                     │  │
│  └─────────────────┘  └─────────────────────┘  │
│                                                 │
│  ─────────── Dados Adicionais ───────────       │
│                                                 │
│  ┌─────────────────┐  ┌─────────────────────┐  │
│  │  Altura (cm)    │  │  Data Nascimento    │  │
│  │    [185]        │  │  [2000-05-15]       │  │
│  └─────────────────┘  └─────────────────────┘  │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │  Nº Licença Federativa                   │  │
│  │  [FPV-12345]                             │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│                          [Cancelar]  [Guardar]  │
└─────────────────────────────────────────────────┘
```

## Ficheiros a Criar/Alterar

| Ficheiro | Operação | Descrição |
|----------|----------|-----------|
| `src/components/team/EditPlayerDialog.tsx` | Criar | Modal para edição completa do jogador |
| `src/components/team/PlayerTable.tsx` | Alterar | Integrar o novo modal e atualizar interface |
| `src/pages/TeamDetail.tsx` | Alterar | Expandir `onUpdatePlayer` para incluir todos os campos |

## Detalhes Técnicos

### 1. Novo Componente EditPlayerDialog

```typescript
interface EditPlayerDialogProps {
  player: TeamPlayer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (playerId: string, data: {
    name: string;
    position: string | null;
    is_captain: boolean;
    height_cm: number | null;
    birth_date: string | null;
    federation_id: string | null;
  }) => Promise<boolean>;
}
```

### 2. Atualizar PlayerTable

- Remover a lógica de edição inline (estados `editingId`, `editName`, etc.)
- Adicionar estado para o jogador selecionado para edição
- Renderizar `EditPlayerDialog` com o jogador selecionado
- Manter a visualização simplificada na tabela

### 3. Atualizar TeamDetail.tsx

Expandir a assinatura do `handleUpdatePlayer` para aceitar todos os campos:

```typescript
const handleUpdatePlayer = async (
  playerId: string, 
  data: { 
    name: string; 
    position: string | null; 
    is_captain: boolean;
    height_cm: number | null;
    birth_date: string | null;
    federation_id: string | null;
  }
) => {
  const success = await updateTeamPlayer(playerId, data);
  if (success) {
    loadPlayers();
  }
  return success;
};
```

## Estrutura do EditPlayerDialog

Reutilizar o layout do `AddPlayerDialog`:
- Mesmos inputs e validações
- Pré-preenchido com dados atuais do jogador
- Número do jogador apenas em modo leitura (para evitar conflitos)

## Fluxo de Utilização

1. Utilizador clica no ícone ✏️ na linha do jogador
2. Abre modal com todos os dados do jogador pré-preenchidos
3. Utilizador altera os campos desejados
4. Clica em "Guardar"
5. Sistema atualiza os dados e fecha o modal
6. Tabela é atualizada automaticamente

## Critérios de Sucesso

- Todos os campos do jogador podem ser editados via modal
- Dados existentes são pré-preenchidos corretamente
- Validação de campos obrigatórios (nome)
- Número do jogador visível mas não editável
- Feedback visual de sucesso/erro
- Modal responsivo para mobile

