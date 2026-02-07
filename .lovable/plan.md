
# Plano: Corrigir Registo da Qualidade da Defesa

## Problema Identificado

A aplicação não está a registar o código de qualidade (0-3) para ações de defesa porque existe uma **race condition** no fluxo de auto-confirmação.

### Análise do Código

No ficheiro `ActionEditor.tsx`, linhas 243-258:

```typescript
onCodeChange(code); // Chamado setPendingAction assíncrono

if (actionType === 'block' || actionType === 'defense') {
  // ...
  requestAnimationFrame(() => {
    setTimeout(() => {
      showConfirmToast(player?.jersey_number, code);
      onConfirm(); // ← PROBLEMA: não passa o código como override!
    }, 0);
  });
```

O `onCodeChange(code)` actualiza o state via `setPendingAction`, que é **assíncrono**. Quando `onConfirm()` é chamado logo de seguida (mesmo com `requestAnimationFrame` e `setTimeout`), o estado `pendingAction.code` pode ainda estar desactualizado.

No `handleConfirmAction` (Live.tsx, linha 945):
```typescript
const effectiveCode = overrides?.code ?? pendingAction.code;
```

Como não é passado `overrides.code`, o sistema usa `pendingAction.code` que ainda pode ser `null`.

### Evidência nos Screenshots

Os screenshots mostram múltiplas defesas com "⚠ Código em falta":
- Rally 8: Defesa #13 (Póv), Defesa #14 Duarte (Lic), Defesa #18 João Cardoso (Lic), Defesa #8 (Póv)
- Rally 11: Defesa #8 (Póv), Defesa #18 João Cardoso (Lic)
- Rally 14: Defesa #11 (Póv)

O jogador é registado correctamente (player_id preenchido), mas o código fica `null`.

---

## Solução

Passar o código explicitamente como override no `onConfirm()` para evitar a race condition:

### Ficheiro: `src/components/live/ActionEditor.tsx`

**Antes (linha 255):**
```typescript
onConfirm();
```

**Depois:**
```typescript
onConfirm({ code: code });
```

### Código Completo da Alteração

Linha ~243-258 (função `handleCodeWithAutoConfirm`):

```typescript
onCodeChange(code);

// Auto-confirm for Block and Defense (no additional input needed)
if (actionType === 'block' || actionType === 'defense') {
  if (!selectedPlayer) {
    toast.warning('Selecione um jogador primeiro');
    return;
  }
  const player = players.find(p => p.id === selectedPlayer);
  requestAnimationFrame(() => {
    setTimeout(() => {
      showConfirmToast(player?.jersey_number, code);
      onConfirm({ code: code }); // ← CORRECÇÃO: passar código como override
    }, 0);
  });
  return;
}
```

---

## Impacto da Alteração

| Aspecto | Detalhe |
|---------|---------|
| Ficheiros alterados | 1 (`ActionEditor.tsx`) |
| Linhas alteradas | 1 |
| Risco | Baixo - apenas adiciona parâmetro |
| Testes | Registar defesas e verificar que o código aparece no histórico |

---

## Verificação

Após a correcção:
1. No jogo em Live, registar um ataque "Defendido" (code 2)
2. O sistema encadeia automaticamente para Defesa
3. Seleccionar jogador da defesa
4. Seleccionar qualidade (0-3)
5. Verificar no Histórico que a defesa tem código preenchido (sem badge "Código em falta")
