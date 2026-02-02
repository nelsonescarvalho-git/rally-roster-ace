

## Plano: Impedir Seleção Duplicada de Jogadores no Lineup

### Problema
Atualmente, na página de Setup → Lineup, é possível selecionar o mesmo jogador em múltiplas posições de rotação (rot1-rot6). Isto causa erros na lógica de rotação durante o jogo.

---

### Solução

Filtrar a lista de jogadores disponíveis em cada Select, removendo os jogadores que já estão selecionados noutras posições.

---

### Implementação

**Ficheiro:** `src/pages/Setup.tsx` (linhas 504-510)

**Antes:**
```typescript
<SelectContent>
  {sidePlayers.map((p) => (
    <SelectItem key={p.id} value={p.id}>
      #{p.jersey_number} {p.name}
    </SelectItem>
  ))}
</SelectContent>
```

**Depois:**
```typescript
<SelectContent>
  {sidePlayers
    .filter((p) => {
      // Allow the current selection for this rotation
      const currentValue = lineupSelections[`rot${rot}`];
      if (p.id === currentValue) return true;
      
      // Exclude players already selected in other rotations
      const selectedInOther = Object.entries(lineupSelections)
        .filter(([key, value]) => key !== `rot${rot}` && value)
        .map(([_, value]) => value);
      return !selectedInOther.includes(p.id);
    })
    .map((p) => (
      <SelectItem key={p.id} value={p.id}>
        #{p.jersey_number} {p.name}
      </SelectItem>
    ))}
</SelectContent>
```

---

### Lógica

1. **Permitir o jogador atual**: Se o jogador já está selecionado nesta rotação, mantê-lo disponível
2. **Excluir de outras rotações**: Remover jogadores que já estão em `rot1`-`rot6` (exceto a posição atual)
3. **Lista dinâmica**: À medida que seleciona jogadores, as opções nas outras posições atualizam automaticamente

---

### Exemplo Visual

```text
┌─────────────────────────────────────────┐
│ Lineup Set 1 - FORA                     │
├─────────────────────────────────────────┤
│ Rot 1: [#9 Filipe Ferreira      ▼]      │
│ Rot 2: [#1 Gonçalo Mota         ▼]      │
│ Rot 3: [Selecionar jogador      ▼]      │ ← Lista NÃO mostra #9 nem #1
│ Rot 4: [Selecionar jogador      ▼]      │
│ Rot 5: [Selecionar jogador      ▼]      │
│ Rot 6: [Selecionar jogador      ▼]      │
└─────────────────────────────────────────┘
```

---

### Ficheiro a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/pages/Setup.tsx` | Adicionar filtro ao mapeamento de `sidePlayers` no SelectContent |

---

### Benefícios

1. **Previne erros**: Impossível ter o mesmo jogador em duas posições
2. **UX clara**: Vês apenas os jogadores ainda disponíveis
3. **Feedback visual**: Se um jogador desaparece da lista, sabes que já está atribuído

