

# Plano: Erro de Distribuição Auto-Finaliza Ponto

## Problema Identificado

Atualmente, quando o utilizador seleciona "0" (Erro) na **Qualidade do Passe** da Distribuição, o fluxo apenas avança para o Passo 3 (destino). Isto não faz sentido porque:
1. Um erro de distribuição significa que a bola não chegou ao atacante
2. O ponto deve ser atribuído à equipa adversária
3. Não há destino para selecionar se houve erro

## Comportamento Esperado

Quando `passCode === 0` é selecionado:
1. Registar a distribuição com código 0 (erro)
2. Auto-finalizar o ponto para a equipa adversária
3. Registar na estatística como erro do distribuidor
4. Não avançar para o passo de destino

## Solução Proposta

### Alteração em ActionEditor.tsx

Modificar o handler do QualityPad na seção `setter` (Passo 2) para detetar quando código 0 é selecionado e auto-finalizar o ponto:

```typescript
// Passo 2: Qualidade do Passe para setter
onSelect={(code) => {
  onPassCodeChange?.(code);
  
  if (code === 0) {
    // Erro de distribuição: auto-confirmar e dar ponto ao adversário
    const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
    const player = players.find(p => p.id === selectedSetter);
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        toast.success(
          `#${player?.jersey_number || '?'} · Distribuição · Erro`,
          { duration: 2500 }
        );
        onConfirm({
          passCode: 0,
          setterId: selectedSetter,
          passDestination: null, // Sem destino em erro
        });
        // Auto-finish: ponto para adversário com razão 'OP' (out/falta)
        onAutoFinishPoint?.(opponent, 'OP');
      }, 0);
    });
    return;
  }
  
  // Código 1, 2 ou 3: avançar para destino
  setCurrentStep(3);
}}
```

### Reason a Usar

Para erro de distribuição, vou usar a reason `'OP'` (Out/Falta) pois representa um erro técnico que não é específico de ataque ou serviço.

---

## Ficheiro a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/ActionEditor.tsx` | Modificar handler do QualityPad no caso `setter` para auto-finalizar quando código 0 |

---

## Critérios de Sucesso

- Selecionar "0 Erro" na Distribuição finaliza o ponto para adversário
- O erro é registado na estatística do distribuidor
- Não aparece o passo de destino quando há erro
- A timeline mostra corretamente o erro de distribuição

