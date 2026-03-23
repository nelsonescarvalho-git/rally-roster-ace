

## Corrigir Aviso "setters sem attack subsequente"

### Problema

O auto-fix (Step 3) infere o `code` do setter a partir do ataque seguinte do mesmo lado. Quando não existe ataque subsequente (ex: rally terminou com erro do setter, freeball sem ação de ataque registada, ou distribuição para contra-ataque não registado), o setter é contado como "skipped" e o aviso aparece.

Dois problemas:
1. **Freeballs (code -1)** agora existem como ações de ataque — o auto-fix já deveria encontrá-las, mas copia o `-1` para o `code` do setter, o que não faz sentido (o setter code deve representar qualidade do passe, não resultado do ataque)
2. O aviso é ruidoso — 7 setters sem ataque subsequente pode ser normal em muitos cenários

### Correção em `src/hooks/useRallyActions.ts`

**Linha 485-501** — Melhorar a lógica de inferência:

1. **Excluir freeballs** da inferência: ao procurar `nextAttack`, filtrar `a.code !== -1` (freeball não indica qualidade do passe)
2. **Para freeballs**, atribuir `code = 0` ao setter (passe fraco que resultou em bola fácil)
3. **Não contar como "skipped"** setters que precedem freeballs — contar como corrigidos
4. **Suprimir aviso** quando todos os skipped são casos legítimos (setter é última ação do rally)

### Lógica proposta

```typescript
if (nextAttack && nextAttack.code !== null) {
  if (nextAttack.code === -1) {
    // Freeball → setter quality = 0 (fraco)
    inferredCode = 0;
  } else {
    inferredCode = nextAttack.code;
  }
  // update setter code...
} else {
  results.settersSkipped++;
}
```

### Ficheiros afetados
- `src/hooks/useRallyActions.ts` — lógica de inferência do setter code (1 bloco, ~10 linhas)

