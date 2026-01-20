import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, Zap, Target, Users, RotateCcw, MapPin, Trophy, ArrowRight, Calculator } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

// Code colors matching the system
const CODE_COLORS = {
  0: { bg: 'bg-red-500', text: 'text-white', label: 'Má/Erro', symbol: '✕' },
  1: { bg: 'bg-yellow-500', text: 'text-yellow-950', label: 'Fraca', symbol: '−' },
  2: { bg: 'bg-green-500', text: 'text-white', label: 'Boa', symbol: '+' },
  3: { bg: 'bg-green-700', text: 'text-white', label: 'Excelente', symbol: '★' },
};

// Action definitions with codes
const ACTION_DEFINITIONS = {
  serve: {
    icon: '🎯',
    label: 'Serviço',
    codes: [
      { code: 0, label: 'Erro de serviço', description: 'Bola na rede ou fora' },
      { code: 1, label: 'Serviço fraco', description: 'Receção fácil para adversário' },
      { code: 2, label: 'Serviço bom', description: 'Receção dificultada' },
      { code: 3, label: 'Ás', description: 'Ponto direto ou falha de receção' },
    ]
  },
  reception: {
    icon: '🏐',
    label: 'Receção',
    codes: [
      { code: 0, label: 'Erro de receção', description: 'Ponto perdido ou bola incontrolável' },
      { code: 1, label: 'Receção fraca', description: 'Opções de ataque muito limitadas' },
      { code: 2, label: 'Receção boa', description: 'Algumas opções de ataque disponíveis' },
      { code: 3, label: 'Receção perfeita', description: 'Todas as opções de ataque disponíveis' },
    ]
  },
  pass: {
    icon: '👐',
    label: 'Distribuição/Passe',
    codes: [
      { code: 0, label: 'Erro de passe', description: 'Bola perdida ou ataque impossível' },
      { code: 1, label: 'Passe fraco', description: 'Ataque forçado, sem opções' },
      { code: 2, label: 'Passe bom', description: 'Ataque normal possível' },
      { code: 3, label: 'Passe perfeito', description: 'Atacante em condições ideais' },
    ]
  },
  attack: {
    icon: '💥',
    label: 'Ataque',
    codes: [
      { code: 0, label: 'Erro de ataque', description: 'Bola na rede ou fora → ponto adversário' },
      { code: 1, label: 'Tocou bloco', description: 'Resultado depende do b_code (0-3)' },
      { code: 2, label: 'Defendido', description: 'Rally continua com contra-ataque' },
      { code: 3, label: 'Kill', description: 'Ponto direto → escolher tipo: Chão ou Blockout' },
    ],
    killTypes: [
      { type: 'FLOOR', emoji: '⬇️', label: 'Chão', description: 'Bola toca diretamente no chão do campo adversário' },
      { type: 'BLOCKOUT', emoji: '↗️', label: 'Blockout', description: 'Bola sai para fora após tocar no bloco adversário' },
    ]
  },
  block: {
    icon: '🛡️',
    label: 'Bloco',
    codes: [
      { code: 0, label: 'Falta de bloco', description: 'Toque na rede ou fora de posição → ponto para atacante' },
      { code: 1, label: 'Bloco ofensivo', description: 'Bola fica jogável no campo adversário' },
      { code: 2, label: 'Bloco defensivo', description: 'Bola fica jogável no campo da equipa que blocou' },
      { code: 3, label: 'Bloco ponto (Stuff)', description: 'Bola cai no campo do atacante → ponto imediato' },
    ]
  },
  defense: {
    icon: '🧤',
    label: 'Defesa',
    codes: [
      { code: 0, label: 'Defesa falhada', description: 'Bola no chão' },
      { code: 1, label: 'Defesa fraca', description: 'Bola controlada mas sem opções' },
      { code: 2, label: 'Defesa boa', description: 'Contra-ataque possível' },
      { code: 3, label: 'Defesa perfeita', description: 'Condições ideais para contra-ataque' },
    ]
  },
};

// K-Phases definition
const K_PHASES = [
  { phase: 'K1', name: 'Side-out', description: 'Primeiro ataque após receção', attackSide: 'Equipa que recebe', color: 'bg-blue-500' },
  { phase: 'K2', name: 'Transição 1', description: 'Contra-ataque após defesa', attackSide: 'Equipa que recebe', color: 'bg-purple-500' },
  { phase: 'K3', name: 'Transição 2+', description: 'Contra-ataque da equipa que serve', attackSide: 'Equipa que serve', color: 'bg-orange-500' },
];

// Player positions
const POSITIONS = [
  { abbr: 'L', name: 'Libero', color: 'bg-amber-500 text-amber-950', role: 'Especialista em receção e defesa. Não pode atacar acima da rede.' },
  { abbr: 'S', name: 'Setter/Distribuidor', color: 'bg-blue-500 text-blue-50', role: 'Distribui a bola para os atacantes. Cérebro da equipa.' },
  { abbr: 'OH', name: 'Outside Hitter/Ponta', color: 'bg-green-600 text-green-50', role: 'Atacante principal na zona 4. Também recebe.' },
  { abbr: 'OP', name: 'Opposite/Oposto', color: 'bg-red-500 text-red-50', role: 'Atacante na zona 2. Geralmente o maior pontuador.' },
  { abbr: 'MB', name: 'Middle Blocker/Central', color: 'bg-purple-600 text-purple-50', role: 'Bloco e ataques rápidos na zona 3.' },
];

// Point reasons
const POINT_REASONS = [
  { code: 'ACE', description: 'Ponto direto de serviço', scorer: 'Servidor' },
  { code: 'SE', description: 'Erro de serviço (Server Error)', scorer: 'Recetor' },
  { code: 'KILL', description: 'Ataque vencedor', scorer: 'Atacante' },
  { code: 'AE', description: 'Erro de ataque (Attack Error)', scorer: 'Defensor' },
  { code: 'BLK', description: 'Bloco vencedor', scorer: 'Bloqueador' },
  { code: 'DEF', description: 'Defesa que leva a ponto', scorer: 'Defensor' },
  { code: 'OP', description: 'Erro posicional / Falta técnica', scorer: 'Adversário' },
];

// Pass destinations
const PASS_DESTINATIONS = [
  { code: 'P2', zone: 'Zona 2', description: 'Passe para atacante na direita (Oposto)' },
  { code: 'P3', zone: 'Zona 3', description: 'Passe rápido para central' },
  { code: 'P4', zone: 'Zona 4', description: 'Passe para ponta na esquerda' },
  { code: 'OP', zone: 'Oposto', description: 'Passe específico para o oposto' },
  { code: 'PIPE', zone: 'Pipe', description: 'Ataque de segunda linha na zona 6' },
  { code: 'BACK', zone: 'Atrás', description: 'Bola alta atrás do distribuidor' },
  { code: 'OUTROS', zone: 'Outros', description: 'Situações especiais ou emergência' },
];

// Reception quality → attack options
const RECEPTION_OPTIONS = [
  { quality: 3, label: 'Excelente', options: ['P2', 'P3', 'P4', 'OP', 'PIPE', 'OUTROS'], count: 6 },
  { quality: 2, label: 'Boa', options: ['P2', 'P4', 'OP', 'PIPE', 'OUTROS'], count: 5 },
  { quality: 1, label: 'Fraca', options: ['P2', 'P4', 'OP', 'OUTROS'], count: 4 },
  { quality: 0, label: 'Má', options: ['BACK', 'OUTROS'], count: 2 },
];

function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children,
  defaultOpen = false 
}: { 
  title: string; 
  icon: React.ElementType; 
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {title}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {children}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function CodeBadge({ code }: { code: 0 | 1 | 2 | 3 }) {
  const config = CODE_COLORS[code];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold", config.bg, config.text)}>
      {code} {config.symbol}
    </span>
  );
}

function CourtDiagram() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="grid grid-cols-3 gap-1 w-48 aspect-[3/2] border-2 border-primary rounded-lg overflow-hidden">
        {/* Front row - Z4, Z3, Z2 */}
        <div className="bg-green-600/20 border border-border flex items-center justify-center text-sm font-bold">
          Z4
        </div>
        <div className="bg-purple-600/20 border border-border flex items-center justify-center text-sm font-bold">
          Z3
        </div>
        <div className="bg-red-500/20 border border-border flex items-center justify-center text-sm font-bold">
          Z2
        </div>
        {/* Back row - Z5, Z6, Z1 */}
        <div className="bg-muted/50 border border-border flex items-center justify-center text-sm font-bold">
          Z5
        </div>
        <div className="bg-muted/50 border border-border flex items-center justify-center text-sm font-bold">
          Z6
        </div>
        <div className="bg-blue-500/20 border border-border flex items-center justify-center text-sm font-bold relative">
          Z1
          <span className="absolute -bottom-1 text-[10px]">🎯</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Z1 = Zona de serviço • Z4 = Ponta • Z3 = Central • Z2 = Oposto
      </p>
    </div>
  );
}

export default function Guide() {
  return (
    <MainLayout title="Guia do Sistema">
      <div className="space-y-4 pb-8">
        {/* Introduction */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Este guia contém toda a documentação do sistema de lançamento de voleibol, 
              incluindo códigos de avaliação, lógicas de jogo e relações entre entidades.
            </p>
          </CardContent>
        </Card>

        {/* Code System Overview */}
        <CollapsibleSection title="Sistema de Códigos (0-3)" icon={Zap} defaultOpen>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Todas as ações são avaliadas numa escala de 0 a 3, onde valores mais altos indicam melhor qualidade.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(CODE_COLORS).map(([code, config]) => (
                <div key={code} className={cn("p-3 rounded-lg text-center", config.bg, config.text)}>
                  <div className="text-2xl font-bold">{code}</div>
                  <div className="text-lg">{config.symbol}</div>
                  <div className="text-xs font-medium mt-1">{config.label}</div>
                </div>
              ))}
            </div>
          </div>
        </CollapsibleSection>

        {/* Action-specific codes */}
        <CollapsibleSection title="Códigos por Tipo de Ação" icon={Target}>
          <div className="space-y-4">
            {Object.entries(ACTION_DEFINITIONS).map(([key, action]) => (
              <Collapsible key={key}>
                <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left">
                  <span className="text-xl">{action.icon}</span>
                  <span className="font-medium flex-1">{action.label}</span>
                  <ChevronDown className="h-4 w-4" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Código</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="hidden sm:table-cell">Detalhe</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {action.codes.map((item) => (
                        <TableRow key={item.code}>
                          <TableCell>
                            <CodeBadge code={item.code as 0 | 1 | 2 | 3} />
                          </TableCell>
                          <TableCell className="font-medium">{item.label}</TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                            {item.description}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {/* Show Kill Types subsection for attack */}
                  {key === 'attack' && 'killTypes' in action && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <span>⚔️</span> Tipos de Kill (quando código 3)
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {(action as typeof ACTION_DEFINITIONS.attack).killTypes?.map((kt) => (
                          <div key={kt.type} className="p-3 rounded-lg border bg-success/10 border-success/30">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{kt.emoji}</span>
                              <Badge className="bg-success text-success-foreground">{kt.type}</Badge>
                            </div>
                            <h5 className="font-medium text-sm">{kt.label}</h5>
                            <p className="text-xs text-muted-foreground mt-1">{kt.description}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-2 bg-muted/50 rounded text-xs text-muted-foreground">
                        <strong>📊 Para KPIs:</strong> Ambos os tipos contam como Kill (a_code=3), 
                        mas a distinção permite análise detalhada de eficácia contra diferentes sistemas de bloco.
                      </div>
                    </div>
                  )}
                  {/* Show Block relationship for attack code 1 */}
                  {key === 'attack' && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <h4 className="font-medium text-sm mb-3 flex items-center gap-2">
                        <span>🛡️</span> Quando "Tocou bloco" (código 1) → Resultado do b_code
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 rounded bg-success/10 border border-success/30">
                          <span className="font-bold">b_code 0:</span> Falta → <span className="text-success font-medium">Ponto atacante</span>
                        </div>
                        <div className="p-2 rounded bg-primary/10 border border-primary/30">
                          <span className="font-bold">b_code 1:</span> Ofensivo → <span className="text-muted-foreground">Rally continua</span>
                        </div>
                        <div className="p-2 rounded bg-warning/10 border border-warning/30">
                          <span className="font-bold">b_code 2:</span> Defensivo → <span className="text-muted-foreground">Rally continua</span>
                        </div>
                        <div className="p-2 rounded bg-destructive/10 border border-destructive/30">
                          <span className="font-bold">b_code 3:</span> Stuff → <span className="text-destructive font-medium">Ponto bloqueador</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </CollapsibleSection>

        {/* K-Phases */}
        <CollapsibleSection title="Fases de Ataque (K-Phases)" icon={ArrowRight}>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              As fases K determinam o contexto do ataque e qual equipa está a atacar.
            </p>
            <div className="space-y-2">
              {K_PHASES.map((phase) => (
                <div key={phase.phase} className="flex items-center gap-3 p-3 rounded-lg border">
                  <Badge className={cn(phase.color, "text-white font-bold px-3")}>{phase.phase}</Badge>
                  <div className="flex-1">
                    <div className="font-medium">{phase.name}</div>
                    <div className="text-sm text-muted-foreground">{phase.description}</div>
                  </div>
                  <div className="text-xs text-right">
                    <span className="text-muted-foreground">Ataca:</span>
                    <div className="font-medium">{phase.attackSide}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Fluxo das Fases:</h4>
              <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
                <Badge variant="outline">Serviço</Badge>
                <ArrowRight className="h-3 w-3" />
                <Badge className="bg-blue-500">K1</Badge>
                <ArrowRight className="h-3 w-3" />
                <span className="text-muted-foreground">(se defendido)</span>
                <ArrowRight className="h-3 w-3" />
                <Badge className="bg-orange-500">K3</Badge>
                <ArrowRight className="h-3 w-3" />
                <span className="text-muted-foreground">(se defendido)</span>
                <ArrowRight className="h-3 w-3" />
                <Badge className="bg-purple-500">K2</Badge>
                <span className="text-muted-foreground">...</span>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Rotation System */}
        <CollapsibleSection title="Sistema de Rotação" icon={RotateCcw}>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-6 items-start">
              <CourtDiagram />
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className="font-medium text-sm">Rotação no Voleibol</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Os jogadores rodam no sentido dos ponteiros do relógio quando ganham o serviço 
                    (side-out). O jogador na Z1 serve.
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Quando Rodar?</h4>
                  <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                    <li>• <strong>Side-out:</strong> Equipa que recebe ganha → roda e passa a servir</li>
                    <li>• <strong>Break:</strong> Equipa que serve ganha → mantém rotação</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Rotações (1-6)</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cada rotação define a posição inicial dos 6 jogadores. 
                    Rotação 1 = formação base, Rotação 6 = última antes de voltar à 1.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Player Positions */}
        <CollapsibleSection title="Posições dos Jogadores" icon={Users}>
          <div className="space-y-2">
            {POSITIONS.map((pos) => (
              <div key={pos.abbr} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge className={cn(pos.color, "font-bold px-3 shrink-0")}>{pos.abbr}</Badge>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{pos.name}</div>
                  <div className="text-sm text-muted-foreground">{pos.role}</div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Point Reasons */}
        <CollapsibleSection title="Razões de Ponto" icon={Trophy}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-24">Quem marca</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {POINT_REASONS.map((reason) => (
                <TableRow key={reason.code}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono">{reason.code}</Badge>
                  </TableCell>
                  <TableCell>{reason.description}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{reason.scorer}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CollapsibleSection>

        {/* Pass Destinations */}
        <CollapsibleSection title="Destinos de Passe" icon={MapPin}>
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Código</TableHead>
                  <TableHead className="w-24">Zona</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PASS_DESTINATIONS.map((dest) => (
                  <TableRow key={dest.code}>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">{dest.code}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{dest.zone}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{dest.description}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <div className="mt-4">
              <h4 className="font-medium text-sm mb-2">Opções por Qualidade de Receção:</h4>
              <div className="space-y-2">
                {RECEPTION_OPTIONS.map((opt) => (
                  <div key={opt.quality} className="flex items-center gap-2 p-2 rounded border">
                    <CodeBadge code={opt.quality as 0 | 1 | 2 | 3} />
                    <span className="text-sm font-medium w-20">{opt.label}</span>
                    <div className="flex gap-1 flex-wrap flex-1">
                      {opt.options.map((o) => (
                        <Badge key={o} variant="outline" className="text-xs">{o}</Badge>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">{opt.count} opções</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Efficiency Calculations */}
        <CollapsibleSection title="Cálculos de Eficiência" icon={Calculator}>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium mb-2">Eficiência de Ataque</h4>
              <code className="text-sm bg-background px-2 py-1 rounded block">
                (Kills - Erros - Bloqueados Ponto) / Total Ataques
              </code>
              <div className="text-xs text-muted-foreground mt-2 space-y-1">
                <p><strong>Kills</strong> = a_code === 3</p>
                <p><strong>Erros</strong> = a_code === 0</p>
                <p><strong>Bloqueados Ponto</strong> = a_code === 1 AND b_code === 3</p>
                <p><strong>Total Ataques</strong> = count(a_player_id && a_code != null)</p>
              </div>
              <div className="mt-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
                <strong>⚠️ Importante:</strong> Toques no bloco (a_code=1) onde b_code ≠ 3 <strong>não penalizam</strong> a eficiência.
              </div>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium mb-2">Relação Ataque ↔ Bloco</h4>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">a_code</TableHead>
                    <TableHead className="w-24">b_code</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead className="w-32">Ponto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><CodeBadge code={1} /></TableCell>
                    <TableCell><CodeBadge code={3} /></TableCell>
                    <TableCell>Bloco ponto (Stuff block)</TableCell>
                    <TableCell className="text-destructive font-medium">Bloqueador</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><CodeBadge code={1} /></TableCell>
                    <TableCell><CodeBadge code={2} /></TableCell>
                    <TableCell>Bloco defensivo, rally continua</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><CodeBadge code={1} /></TableCell>
                    <TableCell><CodeBadge code={1} /></TableCell>
                    <TableCell>Bloco ofensivo, bola no adversário</TableCell>
                    <TableCell className="text-muted-foreground">—</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><CodeBadge code={1} /></TableCell>
                    <TableCell><CodeBadge code={0} /></TableCell>
                    <TableCell>Falta de bloco (net/posição)</TableCell>
                    <TableCell className="text-success font-medium">Atacante</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium mb-2">Percentagem de Side-out</h4>
              <code className="text-sm bg-background px-2 py-1 rounded">
                Pontos ao receber / Total de receções × 100
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Mede a eficácia da equipa quando recebe o serviço adversário.
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium mb-2">Percentagem de Break</h4>
              <code className="text-sm bg-background px-2 py-1 rounded">
                Pontos ao servir / Total de serviços × 100
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Mede a eficácia da equipa quando está a servir.
              </p>
            </div>
            
            <div className="p-4 rounded-lg border bg-muted/30">
              <h4 className="font-medium mb-2">KPIs de Bloco</h4>
              <div className="text-sm text-muted-foreground space-y-2">
                <div>
                  <strong>Pressão de Bloco</strong> = (b_code in 1,2,3) / Total tentativas de bloco
                  <p className="text-xs">Mede com que frequência o bloco afeta o ataque adversário.</p>
                </div>
                <div>
                  <strong>% Bloco Ponto</strong> = (b_code === 3) / Total tentativas de bloco
                  <p className="text-xs">Taxa de blocos que resultam em ponto direto.</p>
                </div>
                <div>
                  <strong>% Bloco Defensivo</strong> = (b_code === 2) / Total tentativas de bloco
                  <p className="text-xs">Taxa de blocos que mantêm a bola jogável na própria equipa.</p>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Rally Flow Diagram */}
        <CollapsibleSection title="Fluxo de um Rally" icon={ArrowRight}>
          <div className="space-y-4">
            <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <Badge className="bg-primary">🏐 Início</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="outline">🎯 Serviço</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="outline">Receção</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="outline">👐 Distribuição</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge className="bg-blue-500 text-white">💥 Ataque K1</Badge>
              </div>
              <div className="text-xs text-muted-foreground pl-4 border-l-2 border-primary/30 space-y-1">
                <p>• Se <strong>Kill (código 3)</strong> → Escolher tipo: Chão ou Blockout → Ponto atacante</p>
                <p>• Se <strong>Tocou bloco (código 1)</strong> → Consultar b_code:</p>
                <p className="ml-4">• b_code 0 (Falta) → Ponto atacante</p>
                <p className="ml-4">• b_code 1-2 (Ofensivo/Defensivo) → Rally continua</p>
                <p className="ml-4">• b_code 3 (Stuff) → Ponto bloqueador</p>
                <p>• Se <strong>Defendido (código 2)</strong> → Contra-ataque (K2/K3)</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-sm mt-2">
                <Badge className="bg-orange-500 text-white">K3 Contra-ataque</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge variant="outline">🧤 Defesa</Badge>
                <ArrowRight className="h-4 w-4" />
                <Badge className="bg-purple-500 text-white">K2 Transição</Badge>
                <ArrowRight className="h-4 w-4" />
                <span className="text-muted-foreground">... até ponto</span>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Legenda:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-lg">🎯</span>
                  <span>Serviço</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg">🏐</span>
                  <span>Receção</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg">👐</span>
                  <span>Distribuição</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg">💥</span>
                  <span>Ataque</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg">🛡️</span>
                  <span>Bloco</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg">🧤</span>
                  <span>Defesa</span>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>
      </div>
    </MainLayout>
  );
}
