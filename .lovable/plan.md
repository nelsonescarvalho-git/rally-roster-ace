
# Ecrã de Set Terminado: Mostrar Apenas Uma Vez

## Problema Atual
O overlay "Set Terminado" aparece **sempre** que `isSetComplete(currentSet)` retorna `complete: true`. Isto significa que se o utilizador navegar para um set ja terminado (ex: clicar em S1 depois de iniciar S2), o overlay reaparece, bloqueando a interface.

## Solucao
Manter um registo dos sets cujo resumo ja foi visto/descartado. O overlay so aparece se o set acabou de terminar e ainda nao foi descartado.

## Alteracoes Tecnicas

### Ficheiro: `src/pages/Live.tsx`

**1. Novo estado** para rastrear sets descartados (~linha 133):

```typescript
const [dismissedSets, setDismissedSets] = useState<Set<number>>(new Set());
```

**2. Condicao do overlay** (~linha 2037): Mudar de:

```typescript
if (setStatus.complete) {
```

Para:

```typescript
if (setStatus.complete && !dismissedSets.has(currentSet)) {
```

**3. Ao clicar "Iniciar Set X"** (~linha 2115): Adicionar o set atual aos descartados antes de avancar:

```typescript
onClick={() => {
  setDismissedSets(prev => new Set([...prev, currentSet]));
  setCurrentSet(currentSet + 1);
  resetWizard();
  toast({ title: `Set ${currentSet + 1} iniciado` });
}}
```

**4. Ao clicar "Inicio"** (~linhas 2100, 2111): Tambem descartar o set antes de navegar:

```typescript
onClick={() => {
  setDismissedSets(prev => new Set([...prev, currentSet]));
  navigate('/');
}}
```

**5. Ao clicar "Ver Estatisticas"** (~linha 2104): Descartar antes de navegar:

```typescript
onClick={() => {
  setDismissedSets(prev => new Set([...prev, currentSet]));
  navigate(`/stats/${matchId}`);
}}
```

## Resultado Esperado

| Cenario | Antes | Depois |
|---------|-------|--------|
| Set termina | Overlay aparece | Overlay aparece (igual) |
| Clicar "Iniciar Set X" | Avanca para proximo set | Avanca + marca como visto |
| Voltar a set terminado | Overlay reaparece | Nao aparece overlay, ve-se o campo normal |
| Clicar "Ver Estatisticas" | Navega para stats | Navega para stats (igual) |
| Recarregar pagina num set terminado | Overlay aparece | Overlay aparece (estado em memoria, nao persistido) |

Nota: O estado nao e persistido em localStorage propositadamente -- se o utilizador recarregar a pagina, o overlay volta a aparecer uma vez, garantindo que nao perde a informacao.
