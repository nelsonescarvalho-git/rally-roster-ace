

## Plano: Adicionar Opção "Sem Bloco" no Menu de Resultado do Bloco

### Problema Identificado

Quando o utilizador seleciona **a_code = 1 ("Tocou Bloco")** no Step 2 do Ataque, o sistema força a seleção de um "Resultado do Bloco" (b_code 0-3). No entanto:

- Nem todos os ataques com código 1 têm um bloco real que precise de ser detalhado
- O utilizador pode querer apenas marcar que a bola foi "interceptada" sem especificar o tipo de bloco
- O fluxo atual torna-se bloqueante e lento

---

### Solução Proposta

Adicionar uma **5ª opção no Step 3**: **"Continua Rally"** (ou "Sem Bloco Detalhado") que confirma a ação e encadeia para a próxima ação lógica sem exigir `b_code`.

---

### Fluxo Visual Proposto

**Step 3 - Resultado do Bloco** (quando `a_code = 1`):

```text
┌─────────────────────────────────────────────────────────┐
│              Resultado do Bloco *                       │
├─────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐                 │
│  │ 🎯 Falta       │  │ ⚔️ Bloco       │                 │
│  │ Ponto Atacante │  │ Ofensivo       │                 │
│  └────────────────┘  └────────────────┘                 │
│  ┌────────────────┐  ┌────────────────┐                 │
│  │ 🛡️ Bloco       │  │ 🧱 Bloco       │                 │
│  │ Defensivo      │  │ Ponto          │                 │
│  └────────────────┘  └────────────────┘                 │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐│
│  │         ➡️ Continua (sem detalhar bloco)            ││
│  │         Rally continua → abre Defesa                ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

---

### Lógica de Encadeamento

| Opção | Ação |
|-------|------|
| **Falta (0)** | Ponto para atacante (side) |
| **Ofensivo (1)** | Defesa para equipa bloqueadora (oponente) |
| **Defensivo (2)** | Defesa para equipa atacante (side) |
| **Ponto (3)** | Ponto para bloqueador (oponente) |
| **Continua** (NOVO) | Confirma ação → Defesa para equipa bloqueadora (oponente) |

A opção "Continua" assume que o bloco foi tocado mas o rally prossegue, encadeando para a defesa do adversário (equipa que bloqueou).

---

### Alterações Técnicas

**Ficheiro:** `src/components/live/ActionEditor.tsx`

#### 1. Adicionar Botão "Continua Rally" (linhas 646-706)

Após o grid 2x2 dos 4 resultados de bloco, adicionar:

```typescript
{/* Botão para continuar sem detalhar bloco */}
<Button
  variant="outline"
  className="w-full h-12 mt-3 text-sm text-muted-foreground hover:text-foreground"
  onClick={() => {
    // Confirma sem b_code e encadeia para defesa do oponente
    onConfirm();
    const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
    onChainAction?.('defense', opponent);
  }}
>
  ➡️ Continua Rally (sem detalhar bloco)
</Button>
```

---

### Alternativa Considerada

Alterar a label de `a_code = 1` de "Bloco" para "Interceptado" e não pedir `b_code`, mas isto removeria a capacidade de rastrear estatísticas detalhadas de bloco quando desejado. A solução proposta **mantém** a flexibilidade para quem quer detalhar, enquanto oferece um atalho rápido.

---

### Ficheiros a Alterar

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/ActionEditor.tsx` | Adicionar botão "Continua Rally" no Step 3 do Ataque (após grid de `b_code`) |

---

### Benefícios

1. **Menos fricção**: Utilizadores que não querem detalhar o bloco podem avançar rapidamente
2. **Estatísticas opcionais**: Quem quer registar `b_code` continua a poder fazê-lo
3. **Fluxo natural**: O rally continua logicamente para a defesa do adversário
4. **Retro-compatível**: Não altera a estrutura de dados existente

