

# Fix: OUTROS com clique único (remover press-and-hold)

## Problema
O botão "OUTROS" na etapa 3 da Distribuição exige manter pressionado 250ms para confirmar, enquanto todos os outros destinos (P2, P3, P4, OP, PIPE, BACK) confirmam com um clique simples. Isto é confuso e inconsistente.

## Solução

No ficheiro `src/components/live/ActionEditor.tsx`:

1. **Remover** todo o estado e lógica de press-and-hold (`outrosPressed`, `outrosPressTimer`, `handleOutrosStart`, `handleOutrosEnd`)
2. **Substituir** o botão OUTROS separado por uma entrada normal no array `availablePositions` — ou simplesmente chamar `handleDestinationWithAutoConfirm('OUTROS')` no `onClick`, igual aos outros destinos
3. **Mover OUTROS para o grid** dos destinos (como 7º botão) ou mantê-lo separado mas com `onClick` simples — a opção mais limpa é incluí-lo no grid para consistência visual

### Resultado
- OUTROS comporta-se exactamente como P2/P3/P4/OP/PIPE/BACK: clique → confirma
- Texto do botão passa de "OUTROS (manter 250ms)" para apenas "OUTROS"
- Sem alterações a BD

