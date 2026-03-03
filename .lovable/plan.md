

# Opinião: Ordenação de jogadores por número vs. zona

## Análise

Concordo com a tua observação. Durante o registo ao vivo, o operador precisa de encontrar o jogador **rapidamente pelo número da camisola** — é o que se vê no campo. A ordenação por zona (Z1→Z6) obriga a mapear mentalmente "quem está na zona 3?" antes de clicar, o que atrasa o registo.

A zona já está visível como label no canto do botão (Z1, Z2, etc.), portanto a informação não se perde — apenas deixa de ditar a ordem.

## Fix

Alterar a ordenação no `PlayerGrid.tsx` para **sempre usar `jersey_number`**, mantendo a zona como label informativa:

```typescript
// Antes: sort by zone when getZoneLabel exists
// Depois: always sort by jersey number
const sortedPlayers = [...players].sort((a, b) => a.jersey_number - b.jersey_number);
```

Uma única linha alterada. Afecta ambas as equipas em todas as acções do ActionPad (serviço, receção, distribuição, ataque, bloco, defesa).

