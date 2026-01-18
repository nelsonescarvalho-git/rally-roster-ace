import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Info, ChevronDown, ChevronUp, Flame, Trophy, Zap, Target, AlertTriangle, MapPin } from 'lucide-react';
import { useState } from 'react';
import { SetKPIs } from '@/hooks/useSetKPIs';

interface WizardLegendProps {
  homeName: string;
  awayName: string;
  kpis?: SetKPIs;
}

export function WizardLegend({ homeName, awayName, kpis }: WizardLegendProps) {
  const [isOpen, setIsOpen] = useState(false);

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

            {/* Rating Codes Legend */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="text-xs font-medium text-muted-foreground">Códigos de Avaliação (0-3)</div>
              
              {/* Color Scale */}
              <div className="flex gap-1">
                <div className="flex-1 text-center py-1 rounded bg-destructive/20 border border-destructive/30">
                  <span className="text-xs font-semibold text-destructive">0 ✕</span>
                  <div className="text-[10px] text-destructive/80">Má</div>
                </div>
                <div className="flex-1 text-center py-1 rounded bg-warning/20 border border-warning/30">
                  <span className="text-xs font-semibold text-warning">1 −</span>
                  <div className="text-[10px] text-warning/80">Fraca</div>
                </div>
                <div className="flex-1 text-center py-1 rounded bg-info/20 border border-info/30">
                  <span className="text-xs font-semibold text-info">2 +</span>
                  <div className="text-[10px] text-info/80">Boa</div>
                </div>
                <div className="flex-1 text-center py-1 rounded bg-success/20 border border-success/30">
                  <span className="text-xs font-semibold text-success">3 ★</span>
                  <div className="text-[10px] text-success/80">Excelente</div>
                </div>
              </div>

              {/* Action-specific explanations */}
              <div className="space-y-2 text-[11px]">
                <div className="p-2 rounded bg-muted/50">
                  <div className="font-semibold text-foreground mb-1">🏐 Serviço</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                    <span><strong className="text-destructive">0</strong> — Erro directo</span>
                    <span><strong className="text-warning">1</strong> — Serviço facilitado</span>
                    <span><strong className="text-info">2</strong> — Dificulta recepção</span>
                    <span><strong className="text-success">3</strong> — Ás / Ponto directo</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-muted/50">
                  <div className="font-semibold text-foreground mb-1">🛡️ Recepção</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                    <span><strong className="text-destructive">0</strong> — Erro / Perdida</span>
                    <span><strong className="text-warning">1</strong> — Má, só dá bola alta</span>
                    <span><strong className="text-info">2</strong> — Boa, permite opções</span>
                    <span><strong className="text-success">3</strong> — Perfeita, todas as opções</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-muted/50">
                  <div className="font-semibold text-foreground mb-1">⚔️ Ataque</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                    <span><strong className="text-destructive">0</strong> — Erro / Bloqueado</span>
                    <span><strong className="text-warning">1</strong> — Defendido / Reciclado</span>
                    <span><strong className="text-info">2</strong> — Dificilmente defendido</span>
                    <span><strong className="text-success">3</strong> — Kill / Ponto directo</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-muted/50">
                  <div className="font-semibold text-foreground mb-1">🧱 Bloco</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                    <span><strong className="text-destructive">0</strong> — Erro / Toque na rede</span>
                    <span><strong className="text-warning">1</strong> — Bola passa sem tocar</span>
                    <span><strong className="text-info">2</strong> — Toque / Suaviza ataque</span>
                    <span><strong className="text-success">3</strong> — Stuff / Ponto directo</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-muted/50">
                  <div className="font-semibold text-foreground mb-1">🛡️ Defesa</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                    <span><strong className="text-destructive">0</strong> — Erro / Não toca</span>
                    <span><strong className="text-warning">1</strong> — Toca mas não controla</span>
                    <span><strong className="text-info">2</strong> — Boa, permite ataque</span>
                    <span><strong className="text-success">3</strong> — Perfeita para 1º tempo</span>
                  </div>
                </div>

                <div className="p-2 rounded bg-muted/50">
                  <div className="font-semibold text-foreground mb-1">🎯 Distribuição</div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
                    <span><strong className="text-destructive">0</strong> — Erro / Perdida</span>
                    <span><strong className="text-warning">1</strong> — Má, força bola alta</span>
                    <span><strong className="text-info">2</strong> — Boa, atacante confortável</span>
                    <span><strong className="text-success">3</strong> — Perfeita, atacante livre</span>
                  </div>
                </div>
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
