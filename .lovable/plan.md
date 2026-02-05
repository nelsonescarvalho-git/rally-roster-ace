

# Plano: Corrigir Atacante Não Gravado no Fluxo Distribuição→Ataque

## Problema Identificado

No fluxo **Distribuição → Ataque** encadeado:
1. Utilizador seleciona destino (ex: P4)
2. Sistema confirma setter e abre automaticamente o editor de Ataque
3. Utilizador seleciona jogador atacante e código de ataque
4. **BUG:** O `a_player_id` não é gravado na base de dados

### Causa Raiz

Quando o ataque é encadeado automaticamente, existem dois problemas:

1. **O `pendingAction` para o ataque não está a herdar o `playerId`** quando é criado pelo `handleSelectAction`
2. **O atacante selecionado no Step 1 pode não estar a ser propagado** para o `registeredActions` antes do ponto ser fechado

Analisando o código em `Live.tsx`:
- `handleConfirmAction` recebe o `pendingAction.playerId` e cria o `RallyAction`
- O problema pode estar em **timing** - o ataque pode estar a ser confirmado com `playerId: null`

---

## Diagnóstico Técnico

### Fluxo Atual

```text
[ActionEditor: Setter]
   ↓ handleDestinationWithAutoConfirm()
   ↓ onConfirm({ passDestination, passCode, setterId })
   ↓ onChainAction('attack', side, { passDestination })
      ↓ handleChainAction()
         ↓ handleSelectAction('attack', side)
            ↓ setPendingAction({ playerId: null, ... })

[ActionEditor: Attack]
   ↓ Utilizador seleciona jogador → onPlayerChange(id)
   ↓ Utilizador seleciona código → handleCodeWithAutoConfirm()
      ↓ onConfirm() ← pendingAction.playerId pode ainda não estar atualizado!
```

### O Bug

O `handleCodeWithAutoConfirm` no `ActionEditor` usa `setTimeout(..., 0)` dentro de `requestAnimationFrame`, mas:
- Para **kills** (código 3), o fluxo vai para Step 3 → kill type → outro timeout
- A confirmação pode acontecer **antes** do React atualizar `pendingAction.playerId` no componente pai

---

## Solução Proposta

### Abordagem: Passar `playerId` Diretamente no `onConfirm()`

Similar ao que já fazemos com `passDestination`, devemos passar o `playerId` diretamente como override para evitar race conditions.

### Alterações

#### 1. Atualizar interface `onConfirm` no ActionEditor

**Ficheiro:** `src/components/live/ActionEditor.tsx`

Expandir os overrides suportados:

```typescript
onConfirm: (overrides?: {
  passDestination?: PassDestination | null;
  passCode?: number | null;
  setterId?: string | null;
  playerId?: string | null;  // NOVO
  code?: number | null;      // NOVO
  killType?: KillType | null; // NOVO
}) => void;
```

#### 2. Passar `playerId` em todas as confirmações de Ataque

No `handleCodeWithAutoConfirm` e `handleKillTypeWithAutoConfirm`:

```typescript
// Para código 0 (erro) e código 2 (defendido):
onConfirm({ playerId: selectedPlayer, code: code });

// Para kill type:
onConfirm({ playerId: selectedPlayer, code: 3, killType: type });

// Para Block result:
onConfirm({ playerId: selectedPlayer, code: 1, blockCode: bCode });
```

#### 3. Atualizar `handleConfirmAction` no Live.tsx

Usar os overrides para `playerId`:

```typescript
const handleConfirmAction = (overrides?: {
  // ... existentes
  playerId?: string | null;
  code?: number | null;
  killType?: KillType | null;
}) => {
  // ...
  const effectivePlayerId = overrides?.playerId ?? pendingAction.playerId;
  const effectiveCode = overrides?.code ?? pendingAction.code;
  const effectiveKillType = overrides?.killType ?? pendingAction.killType;
  
  const newAction: RallyAction = {
    // ...
    playerId: effectivePlayerId,
    code: effectiveCode,
    killType: effectiveKillType,
    // ...
  };
};
```

---

## Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/ActionEditor.tsx` | Expandir overrides e passar `playerId`/`code`/`killType` em confirmações |
| `src/pages/Live.tsx` | Processar novos overrides em `handleConfirmAction` |

---

## Validação

Após implementação:
1. Registar distribuição → destino P4
2. No ataque encadeado, selecionar jogador #11
3. Selecionar código 3 (Kill) → Chão
4. Verificar no RallyHistory se o atacante #11 aparece
5. Verificar console logs para confirmar que `attackAction.playerId` está preenchido

---

## Critérios de Sucesso

- ✅ Atacante é corretamente gravado em ataques encadeados de Distribuição
- ✅ Atacante é corretamente gravado em ataques com fecho automático (Kills)
- ✅ Atacante é corretamente gravado em ataques com fecho manual
- ✅ Dados existentes não são afetados (requer Auto-fix manual)

