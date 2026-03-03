

# Fix: Dados em falta e validação de ordem no EditRallyActionsModal

## Problemas identificados

1. **Setter usa `code` em vez de `pass_code`** — Linha 280: o dropdown de código usa sempre `action.code`. Para setter, a qualidade está em `pass_code` (que é `null` no `code`). Ao abrir o modal, o utilizador não vê a qualidade do passe nem consegue editá-la.

2. **`attack_direction` não está no modal** — O campo existe na BD mas não está no `ActionEditState` nem na UI. Ao editar um ataque, perde-se a direcção.

3. **Sem validação de ordem** — Não há indicação visual se a sequência de acções segue a lógica esperada (ex: serviço → receção → distribuição → ataque). Se acções estiverem fora de ordem ou repetidas inesperadamente, nada sinaliza.

## Alterações — `src/components/EditRallyActionsModal.tsx`

### 1. Fix setter code → pass_code

No Code Select (linhas 279-297):
- Quando `action.action_type === 'setter'`: ler `action.pass_code` e gravar em `pass_code`
- Caso contrário: manter `action.code` como agora

```typescript
value={(action.action_type === 'setter' ? action.pass_code : action.code)?.toString() ?? 'none'}
onValueChange={(v) => updateAction(idx, 
  action.action_type === 'setter' 
    ? { pass_code: v === 'none' ? null : parseInt(v) } 
    : { code: v === 'none' ? null : parseInt(v) }
)}
```

### 2. Adicionar `attack_direction` ao ActionEditState e UI

- Adicionar campo `attack_direction` ao interface `ActionEditState`
- No `useEffect` de inicialização, mapear `a.attack_direction`
- Para acções de ataque, adicionar um Select com as 5 direcções usando `ATTACK_DIRECTION_LABELS` de `volleyball.ts`
- Importar `AttackDirection` e `ATTACK_DIRECTION_LABELS`

### 3. Validação de ordem das acções

Adicionar uma função `getSequenceWarnings()` que verifica:
- **Primeiro acção deve ser serviço** — se não, warning "Esperado serviço como 1ª ação"
- **Acções consecutivas do mesmo tipo e lado** — warning "Ação duplicada consecutiva"
- **Lados alternados na sequência esperada** — serviço de um lado deve ser seguido de receção do lado oposto

Mostrar warnings como badges laranja junto ao cabeçalho de cada acção (similar aos issues existentes).

### 4. Incluir `attack_direction` no save

O `handleSave` já passa `editActions` para `onSave`. Basta garantir que o campo `attack_direction` está no interface e é passado ao update no hook `useRallyActions`.

