import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Info, ChevronDown, ChevronUp, Flame, Trophy, Zap, Target, AlertTriangle, MapPin, CircleDot, Shield, Swords, Square, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { SetKPIs } from '@/hooks/useSetKPIs';
import { cn } from '@/lib/utils';

interface WizardLegendProps {
  homeName: string;
  awayName: string;
  kpis?: SetKPIs;
}

// Rating code definitions by action type
const RATING_DEFINITIONS = {
  serve: {
    icon: CircleDot,
    label: 'Serviço',
    codes: [
      { code: 0, symbol: '✕', label: 'Erro', desc: 'Serviço falhado (fora/rede)' },
      { code: 1, symbol: '−', label: 'Fraco', desc: 'Serviço fácil de receber' },
      { code: 2, symbol: '+', label: 'Bom', desc: 'Dificulta receção adversária' },
      { code: 3, symbol: '★', label: 'Ás', desc: 'Ponto direto de serviço' },
    ]
  },
  reception: {
    icon: Shield,
    label: 'Receção',
    codes: [
      { code: 0, symbol: '✕', label: 'Erro', desc: 'Falha total (ponto adversário)' },
      { code: 1, symbol: '−', label: 'Fraca', desc: 'Limita opções de ataque' },
      { code: 2, symbol: '+', label: 'Boa', desc: 'Permite ataque organizado' },
      { code: 3, symbol: '★', label: 'Perfeita', desc: 'Todas opções disponíveis' },
    ]
  },
  attack: {
    icon: Swords,
    label: 'Ataque',
    codes: [
      { code: 0, symbol: '✕', label: 'Erro', desc: 'Ataque falhado (fora/rede)' },
      { code: 1, symbol: '−', label: 'Bloqueado', desc: 'Bloqueio ponto adversário' },
      { code: 2, symbol: '+', label: 'Defesa', desc: 'Defendido, rally continua' },
      { code: 3, symbol: '★', label: 'Kill', desc: 'Ponto direto de ataque' },
    ]
  },
  block: {
    icon: Square,
    label: 'Bloco',
    codes: [
      { code: 0, symbol: '✕', label: 'Falta', desc: 'Toque na rede ou invasão' },
      { code: 1, symbol: '−', label: 'Block-out', desc: 'Bola tocou e saiu' },
      { code: 2, symbol: '+', label: 'Toque', desc: 'Toca e rally continua' },
      { code: 3, symbol: '★', label: 'Ponto', desc: 'Bloco direto (stuff)' },
    ]
  },
  defense: {
    icon: ShieldCheck,
    label: 'Defesa',
    codes: [
      { code: 0, symbol: '✕', label: 'Falha', desc: 'Bola não tocada/defendida' },
      { code: 1, symbol: '−', label: 'Fraca', desc: 'Defesa sem controlo' },
      { code: 2, symbol: '+', label: 'Boa', desc: 'Permite contra-ataque' },
      { code: 3, symbol: '★', label: 'Perfeita', desc: 'Bola ideal para distribuidor' },
    ]
  },
  setter: {
    icon: Target,
    label: 'Distribuição',
    codes: [
      { code: 0, symbol: '✕', label: 'Erro', desc: 'Falha no passe/toque duplo' },
      { code: 1, symbol: '−', label: 'Fraco', desc: 'Atacante com dificuldade' },
      { code: 2, symbol: '+', label: 'Bom', desc: 'Ataque com opções' },
      { code: 3, symbol: '★', label: 'Perfeito', desc: 'Atacante livre de bloco' },
    ]
  },
};

const CODE_COLORS = {
  0: { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive' },
  1: { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' },
  2: { bg: 'bg-success/20', border: 'border-success/40', text: 'text-success' },
  3: { bg: 'bg-success/30', border: 'border-success/50', text: 'text-success' },
};

export function WizardLegend({ homeName, awayName, kpis }: WizardLegendProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedAction, setExpandedAction] = useState<string | null>(null);

  const hasInsights = kpis && (
    kpis.longestRun ||
    kpis.clutchPoints ||
    kpis.topAttackersHome.length > 0 ||
    kpis.topAttackersAway.length > 0 ||
    kpis.topServersHome.length > 0 ||
    kpis.topServersAway.length > 0 ||
    kpis.worstRotationHome ||
    kpis.worstRotationAway ||
    kpis.topZoneHome ||
    kpis.topZoneAway
  );

  const toggleAction = (key: string) => {
    setExpandedAction(prev => prev === key ? null : key);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-muted bg-muted/30">
        <CollapsibleTrigger asChild>
          <div className="py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>Legenda {hasInsights && '& Insights'}</span>
              </div>
              <Button variant="ghost" size="sm" className="h-5 px-1.5">
                {isOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-3 space-y-3">
            {/* Team Colors */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Cores das Equipas</div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-home/20 border border-home/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-home"></span>
                  <span className="text-xs font-medium text-home">{homeName}</span>
                  <span className="text-[10px] text-home/70">(CASA)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-away/20 border border-away/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-away"></span>
                  <span className="text-xs font-medium text-away">{awayName}</span>
                  <span className="text-[10px] text-away/70">(FORA)</span>
                </div>
              </div>
            </div>

            {/* Rating Codes Explanation */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="text-xs font-medium text-muted-foreground">Códigos de Avaliação</div>
              
              {/* Quick overview of codes */}
              <div className="grid grid-cols-4 gap-1.5 mb-2">
                {[0, 1, 2, 3].map((code) => {
                  const colors = CODE_COLORS[code as keyof typeof CODE_COLORS];
                  return (
                    <div 
                      key={code}
                      className={cn(
                        "flex items-center justify-center gap-1.5 px-2 py-1.5 rounded border",
                        colors.bg,
                        colors.border
                      )}
                    >
                      <span className={cn("text-sm font-bold", colors.text)}>
                        {code === 0 ? '✕' : code === 1 ? '−' : code === 2 ? '+' : '★'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {code === 0 ? 'Má' : code === 1 ? 'Fraca' : code === 2 ? 'Boa' : 'Excelente'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Detailed per-action explanation - collapsible */}
              <div className="space-y-1">
                {Object.entries(RATING_DEFINITIONS).map(([key, action]) => {
                  const Icon = action.icon;
                  const isExpanded = expandedAction === key;
                  return (
                    <div key={key} className="border border-border/40 rounded-md overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleAction(key)}
                        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs font-medium text-foreground/80 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          <Icon className="h-3 w-3" />
                          <span>{action.label}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Preview of codes when collapsed */}
                          {!isExpanded && (
                            <div className="flex gap-0.5">
                              {action.codes.map((codeInfo) => {
                                const colors = CODE_COLORS[codeInfo.code as keyof typeof CODE_COLORS];
                                return (
                                  <span 
                                    key={codeInfo.code}
                                    className={cn("text-[10px] px-1 rounded", colors.bg, colors.text)}
                                  >
                                    {codeInfo.symbol}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="grid grid-cols-4 gap-1 px-2 pb-2">
                          {action.codes.map((codeInfo) => {
                            const colors = CODE_COLORS[codeInfo.code as keyof typeof CODE_COLORS];
                            return (
                              <div 
                                key={codeInfo.code}
                                className={cn(
                                  "px-1.5 py-1 rounded text-center border",
                                  colors.bg,
                                  colors.border
                                )}
                                title={codeInfo.desc}
                              >
                                <div className={cn("text-[10px] font-medium leading-tight", colors.text)}>
                                  {codeInfo.label}
                                </div>
                                <div className="text-[9px] text-muted-foreground leading-tight truncate">
                                  {codeInfo.desc}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Quick Insights Section */}
            {hasInsights && (
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="text-xs font-medium text-muted-foreground">Insights Rápidos</div>
                <div className="space-y-1.5">
                  {/* Longest Run */}
                  {kpis.longestRun && kpis.longestRun.length >= 3 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Flame className="h-3.5 w-3.5 text-orange-500" />
                      <span className="text-muted-foreground">Maior Sequência:</span>
                      <span className={kpis.longestRun.side === 'CASA' ? 'text-home font-medium' : 'text-away font-medium'}>
                        {kpis.longestRun.side === 'CASA' ? homeName : awayName} {kpis.longestRun.length} pts
                      </span>
                      <span className="text-muted-foreground/60 text-[10px]">
                        (R{kpis.longestRun.startRally}-{kpis.longestRun.endRally})
                      </span>
                    </div>
                  )}

                  {/* Clutch Points */}
                  {kpis.clutchPoints && kpis.clutchPoints.totalRallies > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <Trophy className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-muted-foreground">Clutch (20+):</span>
                      <span>
                        <span className="text-home font-medium">{kpis.clutchPoints.homePoints}</span>
                        <span className="text-muted-foreground mx-1">-</span>
                        <span className="text-away font-medium">{kpis.clutchPoints.awayPoints}</span>
                      </span>
                    </div>
                  )}

                  {/* Top Attackers */}
                  {(kpis.topAttackersHome.length > 0 || kpis.topAttackersAway.length > 0) && (
                    <div className="flex items-center gap-2 text-xs">
                      <Zap className="h-3.5 w-3.5 text-purple-500" />
                      <span className="text-muted-foreground">Top Atacantes:</span>
                      <span>
                        {kpis.topAttackersHome[0] && (
                          <span className="text-home font-medium">
                            #{kpis.topAttackersHome[0].playerNo} ({kpis.topAttackersHome[0].count}x)
                          </span>
                        )}
                        {kpis.topAttackersHome[0] && kpis.topAttackersAway[0] && (
                          <span className="text-muted-foreground mx-1">vs</span>
                        )}
                        {kpis.topAttackersAway[0] && (
                          <span className="text-away font-medium">
                            #{kpis.topAttackersAway[0].playerNo} ({kpis.topAttackersAway[0].count}x)
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Top Servers */}
                  {(kpis.topServersHome.length > 0 || kpis.topServersAway.length > 0) && (
                    <div className="flex items-center gap-2 text-xs">
                      <Target className="h-3.5 w-3.5 text-blue-500" />
                      <span className="text-muted-foreground">Top Servidores:</span>
                      <span>
                        {kpis.topServersHome[0] && (
                          <span className="text-home font-medium">
                            #{kpis.topServersHome[0].playerNo} ({kpis.topServersHome[0].count}x)
                          </span>
                        )}
                        {kpis.topServersHome[0] && kpis.topServersAway[0] && (
                          <span className="text-muted-foreground mx-1">vs</span>
                        )}
                        {kpis.topServersAway[0] && (
                          <span className="text-away font-medium">
                            #{kpis.topServersAway[0].playerNo} ({kpis.topServersAway[0].count}x)
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Worst Rotation */}
                  {(kpis.worstRotationHome || kpis.worstRotationAway) && (
                    <div className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-muted-foreground">Pior Rotação:</span>
                      <span>
                        {kpis.worstRotationHome && (
                          <span className="text-home">
                            R{kpis.worstRotationHome.rotation} ({kpis.worstRotationHome.percent}%)
                          </span>
                        )}
                        {kpis.worstRotationHome && kpis.worstRotationAway && (
                          <span className="text-muted-foreground mx-1">vs</span>
                        )}
                        {kpis.worstRotationAway && (
                          <span className="text-away">
                            R{kpis.worstRotationAway.rotation} ({kpis.worstRotationAway.percent}%)
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Top Zone Distribution */}
                  {(kpis.topZoneHome || kpis.topZoneAway) && (
                    <div className="flex items-center gap-2 text-xs">
                      <MapPin className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-muted-foreground">Zona Preferida:</span>
                      <span>
                        {kpis.topZoneHome && (
                          <span className="text-home font-medium">
                            {kpis.topZoneHome.zone} ({kpis.topZoneHome.percent}%)
                          </span>
                        )}
                        {kpis.topZoneHome && kpis.topZoneAway && (
                          <span className="text-muted-foreground mx-1">vs</span>
                        )}
                        {kpis.topZoneAway && (
                          <span className="text-away font-medium">
                            {kpis.topZoneAway.zone} ({kpis.topZoneAway.percent}%)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
