

## Plano: Corrigir Alinhamento dos Campos com Bola de Serviço

### Problema Identificado

Na imagem, quando a equipa "Amares" (CASA) está a servir, a bola 🏐 aparece no header e ocupa espaço extra, causando desalinhamento entre os dois campos de jogo.

**Código atual (linha 94):**
```tsx
{isServing && <span className="text-sm lg:text-lg animate-pulse">🏐</span>}
```

O problema é que o ícone da bola só existe de um lado, empurrando o conteúdo e tornando os headers de tamanhos diferentes.

---

### Solução

Manter a bola **sempre presente** em ambos os lados, mas tornando-a **invisível** quando a equipa não está a servir. Isto garante que ambos os headers ocupem o mesmo espaço.

**Alteração simples:** Usar `opacity-0` em vez de renderização condicional.

---

### Alterações Técnicas

**Ficheiro:** `src/components/live/CourtView.tsx`

**Linha 94** - Substituir:
```tsx
{isServing && <span className="text-sm lg:text-lg animate-pulse">🏐</span>}
```

**Por:**
```tsx
<span className={cn(
  "text-sm lg:text-lg",
  isServing ? "animate-pulse" : "opacity-0"
)}>
  🏐
</span>
```

---

### Resultado Visual

| Estado | Antes | Depois |
|--------|-------|--------|
| **CASA a servir** | 🏐 visível só na CASA, header mais largo | 🏐 visível CASA, invisível (mas presente) FORA |
| **FORA a servir** | 🏐 visível só na FORA, header mais largo | 🏐 visível FORA, invisível (mas presente) CASA |

Ambos os headers terão o mesmo tamanho, garantindo alinhamento perfeito dos campos.

---

### Resumo

| Ficheiro | Linha | Alteração |
|----------|-------|-----------|
| `src/components/live/CourtView.tsx` | 94 | Usar `opacity-0` em vez de renderização condicional para a bola |

---

### Benefícios

1. **Alinhamento perfeito**: Ambos os campos ficam com a mesma largura
2. **Alteração mínima**: Uma linha de código
3. **Mantém animação**: A bola continua a pulsar quando visível

