

# Adicionar Contador Global de Discrepancias no Topo do Historico de Rallies

## O que vai mudar

Na pagina de Historico de Rallies, sera adicionado um contador visivel no topo que mostra quantos rallies tem discrepancias pendentes (rally_actions com menos registos que o legacy).

## Alteracao Tecnica

### Ficheiro: `src/pages/RallyHistory.tsx`

**1. Calcular contagem de discrepancias** (junto ao `issueCount` existente, ~linha 674):

Adicionar um `discrepancyCount` que percorre todos os `rallyGroups`, calcula `legacyActionsCount` e `actionsCount` para cada grupo, e conta quantos tem `actionsCount < legacyActionsCount`.

```typescript
const discrepancyCount = Array.from(rallyGroups.entries()).filter(([key, phases]) => {
  const sortedPhases = [...phases].sort((a, b) => a.phase - b.phase);
  const legacy = sortedPhases.reduce((sum, p) => sum + countLegacyActions(p), 0);
  const actions = sortedPhases.reduce((sum, p) => sum + (rallyActionsMap?.get(p.id)?.length || 0), 0);
  return actions < legacy;
}).length;
```

**2. Mostrar badge no cabecalho** (apos o titulo, ~linha 694):

Adicionar um badge laranja com icone GitCompare abaixo do titulo que mostra a contagem, visivel apenas quando `discrepancyCount > 0`.

```tsx
{discrepancyCount > 0 && (
  <Badge variant="outline" className="border-orange-500 text-orange-500 gap-1">
    <GitCompare className="h-3 w-3" />
    {discrepancyCount} discrepancias
  </Badge>
)}
```

**3. Importar `GitCompare`** no bloco de imports do lucide-react.

## Resultado Esperado

- Badge laranja no topo com "X discrepancias" quando existem rallies com dados legacy nao sincronizados
- Badge desaparece automaticamente apos correr "Fix Tudo" com sucesso
- Nao interfere com o contador de issues existente
