

# Plano: Melhorar UI do Cartão de Líbero & Substituições

## Problema Atual

O cartão atual combina demasiada informação num espaço limitado:
- Estado do líbero (disponível/em campo)
- Botões de ação (Trocar/Sair) 
- Contador de substituições
- Botão para abrir modal de subs

Quando o líbero está em campo com opção de troca, a UI fica densa e confusa.

---

## Solução Proposta

Separar em **dois cartões distintos** com layouts mais limpos:

```text
┌─────────────────────────────────────────────────────────────┐
│ 🔄 Substituições                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────┐   ┌─────────────────────┐         │
│   │  Póvoa        0/6 ⇄ │   │  Liceu        0/6 ⇄ │         │
│   └─────────────────────┘   └─────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 👤 Líbero                                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────────┐   ┌─────────────────────┐         │
│   │  ● Póvoa            │   │  ● Liceu            │         │
│   │  ─ Disponível       │   │  #14 Em campo       │         │
│   │                     │   │  [Trocar] [Sair]    │         │
│   └─────────────────────┘   └─────────────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefícios

1. **Clareza visual**: Cada cartão tem um propósito único
2. **Espaço para ações**: Botões de líbero têm espaço dedicado
3. **Consistência**: Layout similar ao cartão de Timeouts
4. **Escalabilidade**: Fácil adicionar mais informação no futuro

---

## Ficheiros a Criar/Alterar

| Ficheiro | Operação | Descrição |
|----------|----------|-----------|
| `src/components/live/SubstitutionsCard.tsx` | **Criar** | Cartão dedicado para substituições normais |
| `src/components/live/LiberoCard.tsx` | **Criar** | Cartão dedicado para estado e ações do líbero |
| `src/components/live/SubsLiberosCard.tsx` | Manter | Manter como backup ou remover após migração |
| `src/pages/Live.tsx` | Alterar | Usar os dois novos cartões separados |

---

## Detalhes Técnicos

### 1. SubstitutionsCard - Layout Limpo

```typescript
interface SubstitutionsCardProps {
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
  homeSubsUsed: number;
  awaySubsUsed: number;
  maxSubstitutions: number;
  onOpenSubModal: (side: Side) => void;
}
```

Layout inspirado no TimeoutCard:
- Grid 2 colunas
- Cada célula: Nome da equipa + Badge contador + Ícone clicável
- Fundo muda para vermelho quando atinge limite (6/6)

### 2. LiberoCard - Estado e Ações

```typescript
interface LiberoCardProps {
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
  // Estado
  homeLiberoOnCourt: boolean;
  homeLiberoPlayer: (Player | MatchPlayer) | null;
  awayLiberoOnCourt: boolean;
  awayLiberoPlayer: (Player | MatchPlayer) | null;
  // Ações
  onLiberoEntry: (side: Side) => void;
  onLiberoExit: (side: Side) => void;
  onLiberoSwap?: (side: Side) => void;
  // Elegibilidade
  homeCanEnterLibero: boolean;
  awayCanEnterLibero: boolean;
  homeMustExitLibero: boolean;
  awayMustExitLibero: boolean;
  homeCanSwapLibero?: boolean;
  awayCanSwapLibero?: boolean;
  homeHasLibero?: boolean;
  awayHasLibero?: boolean;
}
```

Layout por equipa (2 colunas):

| Estado | UI |
|--------|-----|
| Sem líbero | Texto cinza: "Sem líbero" |
| Disponível | Texto: "Disponível" + Botão "Entrar" (se elegível) |
| Em campo | Badge "#14" + Botões "Trocar" e "Sair" |
| Deve sair | Badge vermelho pulsante "#14 Sair!" |

### 3. Atualização do Live.tsx

Substituir o `SubsLiberosCard` único por:

```tsx
{/* Substitutions Card */}
<SubstitutionsCard
  homeName={match.home_name}
  awayName={match.away_name}
  homeColor={teamColors.home.primary}
  awayColor={teamColors.away.primary}
  homeSubsUsed={getSubstitutionsUsed(currentSet, 'CASA')}
  awaySubsUsed={getSubstitutionsUsed(currentSet, 'FORA')}
  maxSubstitutions={6}
  onOpenSubModal={setSubModalSide}
/>

{/* Libero Card */}
<LiberoCard
  homeName={match.home_name}
  awayName={match.away_name}
  homeColor={teamColors.home.primary}
  awayColor={teamColors.away.primary}
  homeLiberoOnCourt={liberoTrackingHome.isLiberoOnCourt}
  homeLiberoPlayer={liberoTrackingHome.activeLiberoPlayer}
  awayLiberoOnCourt={liberoTrackingAway.isLiberoOnCourt}
  awayLiberoPlayer={liberoTrackingAway.activeLiberoPlayer}
  onLiberoEntry={(side) => setManualLiberoPromptSide(side)}
  onLiberoExit={async (side) => { ... }}
  onLiberoSwap={(side) => setLiberoSwapPromptSide(side)}
  homeCanEnterLibero={liberoTrackingHome.shouldPromptLiberoEntry}
  awayCanEnterLibero={liberoTrackingAway.shouldPromptLiberoEntry}
  homeMustExitLibero={liberoTrackingHome.mustExitLibero}
  awayMustExitLibero={liberoTrackingAway.mustExitLibero}
  homeCanSwapLibero={liberoTrackingHome.canSwapLibero}
  awayCanSwapLibero={liberoTrackingAway.canSwapLibero}
  homeHasLibero={liberoTrackingHome.availableLiberos.length > 0}
  awayHasLibero={liberoTrackingAway.availableLiberos.length > 0}
/>
```

---

## Design Visual

### SubstitutionsCard

```text
┌──────────────────────────────────────────────────┐
│ ⇄ Substituições                                  │
├──────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────┐  │
│  │ ● Póvoa      [0/6]⇄│  │ ● Liceu      [0/6]⇄│  │
│  └────────────────────┘  └────────────────────┘  │
└──────────────────────────────────────────────────┘
```

- Clique na área abre modal de substituição
- Ícone ⇄ pequeno ao lado do contador
- Badge muda para vermelho em 6/6

### LiberoCard

```text
┌──────────────────────────────────────────────────┐
│ 👤 Líbero                                        │
├──────────────────────────────────────────────────┤
│  ● Póvoa              │  ● Liceu                 │
│  ┌──────────────────┐ │  ┌──────────────────┐    │
│  │ ─ Disponível     │ │  │ #14 Em campo     │    │
│  │                  │ │  │ [Trocar] [Sair]  │    │
│  └──────────────────┘ │  └──────────────────┘    │
└──────────────────────────────────────────────────┘
```

- Estados claros por equipa
- Botões de ação com espaço adequado
- Animação pulsante quando líbero DEVE sair

---

## Critérios de Sucesso

- Substituições e Líbero em cartões separados
- Layout consistente com TimeoutCard
- Botões de ação do líbero visíveis e acessíveis
- Transições suaves entre estados
- Responsivo para mobile e desktop

