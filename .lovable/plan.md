

## Correção: Lógica de Erros no Terminar Ponto

### Problema
Quando o utilizador clica em "Erro Ataque" da equipa CASA, o ponto está a ser atribuído à CASA. Deveria ser atribuído à equipa FORA (o adversário), porque um erro significa que a equipa **perde** o ponto.

### Lógica Correta

| Razão | Tipo | Quem ganha |
|-------|------|------------|
| KILL | Positivo | Equipa clicada |
| ACE | Positivo | Equipa clicada |
| BLK | Positivo | Equipa clicada |
| SE (Erro Serviço) | Erro | Adversário |
| AE (Erro Ataque) | Erro | Adversário |
| OP (Out/Falta) | Erro | Adversário |

### Alteração em `src/components/live/PointFinisher.tsx`

**Linhas 126-142** - Adicionar lógica para determinar o vencedor:

```typescript
// Reasons where the team commits an error (opponent wins)
const ERROR_REASONS: Reason[] = ['SE', 'AE', 'OP'];

// Inside the map:
{REASON_OPTIONS.map((reason) => {
  // For errors, the opponent wins; for positive actions, the team wins
  const isError = ERROR_REASONS.includes(reason.value);
  const winner: Side = isError 
    ? (side === 'CASA' ? 'FORA' : 'CASA')  // Opponent wins on error
    : side;  // Team wins on positive action
  
  return (
    <Button
      key={`${side}-${reason.value}`}
      variant="outline"
      size="sm"
      className={cn(
        'text-xs h-9',
        side === 'CASA' 
          ? 'hover:bg-home/20 hover:border-home' 
          : 'hover:bg-away/20 hover:border-away'
      )}
      onClick={() => onFinishPoint(winner, reason.value)}
    >
      <span className="mr-1">{reason.emoji}</span>
      {reason.label}
    </Button>
  );
})}
```

---

### Resultado Esperado

| Ação do Utilizador | Antes | Depois |
|--------------------|-------|--------|
| Clica "Erro Ataque" em CASA | Ponto CASA ❌ | Ponto FORA ✅ |
| Clica "Erro Serviço" em FORA | Ponto FORA ❌ | Ponto CASA ✅ |
| Clica "Kill" em CASA | Ponto CASA ✅ | Ponto CASA ✅ |
| Clica "ACE" em FORA | Ponto FORA ✅ | Ponto FORA ✅ |

---

### Ficheiro a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/PointFinisher.tsx` | Adicionar lógica de erro vs positivo (~10 linhas) |

