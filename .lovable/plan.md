
# Fix: Botao "Iniciar Set X" mostra set errado

## Problema
Quando o overlay de "Set Terminado" aparece (ex: apos recarregar a pagina no Set 1), o botao usa `currentSet + 1` para calcular o proximo set. Mas se ja estamos no Set 1 e o resultado por sets e 1-1, o Set 2 ja foi jogado -- o botao deveria dizer "Iniciar Set 3".

Isto acontece porque `currentSet` pode estar num set anterior (ex: reload ou navegacao para tras), e o codigo assume cegamente que o proximo set e `currentSet + 1`.

## Solucao
Calcular o proximo set a iniciar com base no `matchStatus` em vez de `currentSet + 1`. O proximo set e o primeiro set incompleto.

## Alteracao Tecnica

### Ficheiro: `src/pages/Live.tsx` (~linha 2116)

Antes:
```typescript
<Button size="lg" onClick={() => {
  setDismissedSets(prev => new Set([...prev, currentSet]));
  setCurrentSet(currentSet + 1);
  resetWizard();
  toast({ title: `Set ${currentSet + 1} iniciado` });
}}>
  Iniciar Set {currentSet + 1}
</Button>
```

Depois -- calcular o proximo set disponivel a partir dos resultados do match:
```typescript
const nextSet = matchStatus.setResults.find(s => !s.complete)?.setNo
  ?? (currentSet + 1);

<Button size="lg" onClick={() => {
  setDismissedSets(prev => new Set([...prev, currentSet]));
  setCurrentSet(nextSet);
  resetWizard();
  toast({ title: `Set ${nextSet} iniciado` });
}}>
  Iniciar Set {nextSet}
</Button>
```

Isto garante que se o Set 1 e Set 2 ja estao completos, o botao mostra "Iniciar Set 3" independentemente de qual `currentSet` esta selecionado.

Adicionalmente, se nao houver sets incompletos (todos completos), o botao nao deveria aparecer (ja tratado pelo bloco `matchStatus.matchComplete`).
