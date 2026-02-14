

# Adicionar Seleção de Bloqueador para Bloco Ofensivo e Defensivo

## Problema Atual
Quando no ataque se escolhe "Bloco" (a_code=1) e depois "Bloco Ofensivo" ou "Bloco Defensivo", o sistema confirma imediatamente e passa para a defesa sem perguntar **quem fez o bloco**. Apenas o "Bloco Ponto" (b_code=3) tem o Step 4 de seleção de bloqueador.

## Solução
Estender o Step 4 (seleção de bloqueador) para os três tipos de bloco: Ofensivo (b_code=1), Defensivo (b_code=2), e Ponto (b_code=3). Após selecionar o bloqueador, o sistema encadeia para a ação seguinte conforme o tipo de bloco.

## Fluxo Atualizado

```text
Ataque → Bloco (a_code=1) → Resultado do Bloco (Step 3)
  ├── Falta (b_code=0) → Auto-finish (ponto atacante) [sem bloqueador]
  ├── Ofensivo (b_code=1) → Step 4: Selecionar Bloqueador → Defesa (lado bloqueador)
  ├── Defensivo (b_code=2) → Step 4: Selecionar Bloqueador → Defesa (lado atacante)
  └── Ponto (b_code=3) → Step 4: Selecionar Bloqueador → Auto-finish (ponto bloqueador)
```

## Alteracoes Tecnicas

### Ficheiro: `src/components/live/ActionEditor.tsx`

**1. `totalSteps` (linha ~196)**: Mudar a condicao para incluir b_code 1 e 2 no Step 4.

De:
```typescript
if (selectedCode === 1 && selectedBlockCode === 3) return 4;
```
Para:
```typescript
if (selectedCode === 1 && (selectedBlockCode === 1 || selectedBlockCode === 2 || selectedBlockCode === 3)) return 4;
```

**2. `handleBlockCodeWithAutoConfirm` (linhas 363-402)**: Para b_code 1 e 2, em vez de confirmar imediatamente, avanca para Step 4 (igual ao b_code 3).

De:
```typescript
if (bCode === 3) {
  setCurrentStep(4);
  return;
}
// ... confirma e encadeia para defesa
```
Para:
```typescript
if (bCode === 1 || bCode === 2 || bCode === 3) {
  setCurrentStep(4);
  return;
}
// ... apenas b_code=0 (falta) confirma imediatamente
```

**3. Step 4 UI (linhas 966-1024)**: Generalizar o ecra de selecao de bloqueador para os 3 tipos de bloco, com titulo e comportamento pos-selecao diferenciado.

- b_code 1 (Ofensivo): apos selecionar bloqueador → confirma + encadeia defesa para lado bloqueador
- b_code 2 (Defensivo): apos selecionar bloqueador → confirma + encadeia defesa para lado atacante
- b_code 3 (Ponto): comportamento atual mantido (confirma + auto-finish ponto)

**4. Novo handler `handleBlockerConfirmForChain`**: Similar ao `handleStuffBlockConfirm` mas em vez de finalizar ponto, encadeia para defesa.

## Resultado Esperado

| Tipo de Bloco | Antes | Depois |
|---------------|-------|--------|
| Falta (b_code=0) | Auto-finish sem bloqueador | Igual (sem alteracao) |
| Ofensivo (b_code=1) | Confirma e vai para defesa sem bloqueador | Pede bloqueador, depois vai para defesa |
| Defensivo (b_code=2) | Confirma e vai para defesa sem bloqueador | Pede bloqueador, depois vai para defesa |
| Ponto (b_code=3) | Pede bloqueador e finaliza ponto | Igual (sem alteracao) |

