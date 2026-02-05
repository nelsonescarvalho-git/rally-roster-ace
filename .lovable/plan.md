

## Plano: Adicionar Cartão "Líbero & Substituições" no Painel Direito

### Objetivo

Criar um novo componente compacto que agrupe atalhos rápidos para:
1. **Estado do Líbero** de cada equipa (em campo ou disponível)
2. **Botões de Substituição** rápida para cada equipa
3. **Contadores de Substituições** usadas no set atual

### Localização

- **Desktop**: Coluna direita, imediatamente abaixo do `TimeoutCard`
- **Mobile**: Igual ao TimeoutCard (pode ser colapsado)

---

### Novo Componente: `SubsLiberosCard.tsx`

**Ficheiro**: `src/components/live/SubsLiberosCard.tsx`

```tsx
interface SubsLiberosCardProps {
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
  // Libero state
  homeLiberoOnCourt: boolean;
  homeLiberoPlayer: (Player | MatchPlayer) | null;
  awayLiberoOnCourt: boolean;
  awayLiberoPlayer: (Player | MatchPlayer) | null;
  // Substitutions
  homeSubsUsed: number;
  awaySubsUsed: number;
  maxSubstitutions: number;
  // Callbacks
  onOpenSubModal: (side: Side) => void;
  onLiberoEntry: (side: Side) => void;
  onLiberoExit: (side: Side) => void;
  // Eligibility
  homeCanEnterLibero: boolean;
  awayCanEnterLibero: boolean;
  homeMustExitLibero: boolean;
  awayMustExitLibero: boolean;
}
```

### Layout do Card

```
+------------------------------------------+
| 🔄 Líbero & Substituições                |
+------------------------------------------+
| CASA                    | FORA           |
|-------------------------|----------------|
| [🟢 #15 L. Silva]      | [⚫ Libero Off] |
|  └─ Em campo (Z6)      |  └─ Disponível  |
|                        |                 |
| Subs: 2/6              | Subs: 1/6       |
| [📥 Substituir]        | [📥 Substituir] |
+------------------------------------------+
```

**Estados visuais do Líbero:**
- 🟢 Em campo: Badge verde com número e nome
- 🟡 Pode entrar: Badge amarelo "Entrar Líbero"
- 🔴 Deve sair: Badge vermelho pulsante "Saída Obrigatória"
- ⚫ Sem líbero: Badge cinza desabilitado

---

### Alterações em `Live.tsx`

**Inserir após TimeoutCard (linha ~1953)**:

```tsx
{/* Subs & Libero Quick Card */}
<SubsLiberosCard
  homeName={match.home_name}
  awayName={match.away_name}
  homeColor={teamColors.home.primary}
  awayColor={teamColors.away.primary}
  // Libero state
  homeLiberoOnCourt={liberoTrackingHome.isLiberoOnCourt}
  homeLiberoPlayer={liberoTrackingHome.activeLiberoPlayer}
  awayLiberoOnCourt={liberoTrackingAway.isLiberoOnCourt}
  awayLiberoPlayer={liberoTrackingAway.activeLiberoPlayer}
  // Substitutions
  homeSubsUsed={getSubstitutionsUsed(currentSet, 'CASA')}
  awaySubsUsed={getSubstitutionsUsed(currentSet, 'FORA')}
  maxSubstitutions={6}
  // Callbacks
  onOpenSubModal={setSubModalSide}
  onLiberoEntry={(side) => {
    // Trigger libero prompt
    if (side === 'CASA') {
      setShowHomeLiberoPrompt(true);
    } else {
      setShowAwayLiberoPrompt(true);
    }
  }}
  onLiberoExit={async (side) => {
    if (side === 'CASA') {
      await liberoTrackingHome.exitLibero();
    } else {
      await liberoTrackingAway.exitLibero();
    }
  }}
  // Eligibility
  homeCanEnterLibero={liberoTrackingHome.shouldPromptLiberoEntry}
  awayCanEnterLibero={liberoTrackingAway.shouldPromptLiberoEntry}
  homeMustExitLibero={liberoTrackingHome.mustExitLibero}
  awayMustExitLibero={liberoTrackingAway.mustExitLibero}
/>
```

---

### Resumo das Alterações

| Ficheiro | Alteração |
|----------|-----------|
| `src/components/live/SubsLiberosCard.tsx` | **Novo** - Componente de atalho |
| `src/pages/Live.tsx` | Importar e inserir após `TimeoutCard` |

---

### Benefícios

1. **Acesso rápido**: Líberos e substituições visíveis sem scroll
2. **Estado claro**: Indica visualmente se líbero está em campo
3. **Consistência**: Segue o mesmo padrão visual do TimeoutCard
4. **UX melhorada**: Reduz cliques para ações comuns

