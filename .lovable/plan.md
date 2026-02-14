

# Atalhos de Teclado para Estatisticas por Set

## Objetivo
Adicionar teclas de atalho na pagina de Estatisticas (`/stats/:matchId`) para navegar rapidamente entre sets e alternar equipas, e verificar a veracidade dos dados apresentados.

## Verificacao de Dados

Analisei a base de dados e os calculos estao coerentes:
- **Match 1 (Set 1)**: 39 rallies, 25 CASA / 14 FORA, 3 aces, 7 erros de servico, 18 kills, 4 blocos com codigo
- **Match 1 (Set 2)**: 40 rallies, 15 CASA / 25 FORA, 2 aces, 2 erros de servico, 19 kills, 6 blocos com codigo
- **Match 2 (Set 1)**: 33 rallies, 13 CASA / 20 FORA, 3 blocos sem codigo (dados incompletos sinalizados)

Os totais de pontos batem certo com os scores. A logica de calculo em `useSetKPIs.ts` e `useStats.ts` esta alinhada com as definicoes de eficacia documentadas (serve: aces-erros/total, ataque: kills-erros-blocosPonto/total, etc.).

Os 3 blocos sem `b_code` no Match 2 sao corretamente sinalizados como `attBlockIncomplete` nos warnings da consola.

## Atalhos a Implementar

| Tecla | Acao |
|-------|------|
| `1-5` | Selecionar Set 1-5 |
| `0` ou `T` | Selecionar Total (todos os sets) |
| `H` | Alternar para equipa Casa |
| `A` | Alternar para equipa Fora |

## Alteracoes Tecnicas

### Ficheiro: `src/pages/Stats.tsx`

**1. Adicionar `useEffect` para escutar teclas** (apos os hooks existentes, ~linha 62):

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    
    const key = e.key.toLowerCase();
    
    // Set selection: 1-5
    if (['1','2','3','4','5'].includes(key)) {
      e.preventDefault();
      setSelectedSet(parseInt(key));
      return;
    }
    // Total: 0 or T
    if (key === '0' || key === 't') {
      e.preventDefault();
      setSelectedSet(0);
      return;
    }
    // Side toggle: H = home, A = away
    if (key === 'h') {
      e.preventDefault();
      setSelectedSide('CASA');
      return;
    }
    if (key === 'a') {
      e.preventDefault();
      setSelectedSide('FORA');
      return;
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, []);
```

**2. Adicionar indicacao visual dos atalhos** nos botoes de set e equipa:

- Nos botoes de set, adicionar `title` com a tecla correspondente (ex: `title="Tecla: 1"`)
- Nos botoes de equipa, adicionar `title` com a tecla correspondente (ex: `title="Tecla: H"`)

**3. Adicionar hint discreto** abaixo dos filtros com texto como:
```
Atalhos: 0-5 sets · H casa · A fora
```

## Resultado Esperado
- Premir `1` muda para Set 1, `2` para Set 2, etc.
- Premir `0` ou `T` mostra o total
- Premir `H` seleciona equipa Casa, `A` seleciona equipa Fora
- Hint visual discreto indica os atalhos disponiveis
- Dados verificados e coerentes com a base de dados

