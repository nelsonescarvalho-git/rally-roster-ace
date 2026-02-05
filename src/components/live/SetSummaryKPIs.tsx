import { useState } from 'react';
import { Rally, Side, MatchPlayer } from '@/types/volleyball';
import { useSetKPIs, SetKPIs } from '@/hooks/useSetKPIs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Flame, 
  Target, 
  Shield, 
  Zap,
  AlertTriangle,
  Trophy,
  MapPin,
  Users,
  Radio,
  Award
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface SetSummaryKPIsProps {
  rallies: Rally[];
  setNo: number;
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  previousSetRallies?: Rally[];
  players?: MatchPlayer[];
}

// Thresholds for different stats
const THRESHOLDS = {
  sideout: { excellent: 60, acceptable: 45 },
  break: { excellent: 50, acceptable: 35 },
  attack: { excellent: 40, acceptable: 20 },
  serve: { excellent: 15, acceptable: 5 },
  reception: { excellent: 70, acceptable: 50 },
  block: { excellent: 30, acceptable: 15 },
  defense: { excellent: 60, acceptable: 40 },
};

function getThresholdColor(value: number, thresholds: { excellent: number; acceptable: number }, lowerIsBetter = false) {
  if (lowerIsBetter) {
    if (value <= thresholds.acceptable) return 'text-primary';
    if (value <= thresholds.excellent) return 'text-warning';
    return 'text-destructive';
  }
  if (value >= thresholds.excellent) return 'text-primary';
  if (value >= thresholds.acceptable) return 'text-warning';
  return 'text-destructive';
}

function StatRow({ 
  label, 
  homeValue, 
  awayValue, 
  format = 'percent',
  highlightBetter = true,
  lowerIsBetter = false,
  thresholds,
  homeTooltip,
  awayTooltip,
  homeSuccess,
  homeTotal,
  awaySuccess,
  awayTotal,
}: {
  label: string;
  homeValue: number;
  awayValue: number;
  format?: 'percent' | 'number' | 'efficiency';
  highlightBetter?: boolean;
  lowerIsBetter?: boolean;
  thresholds?: { excellent: number; acceptable: number };
  homeTooltip?: React.ReactNode;
  awayTooltip?: React.ReactNode;
  homeSuccess?: number;
  homeTotal?: number;
  awaySuccess?: number;
  awayTotal?: number;
}) {
  const formatValue = (val: number) => {
    if (format === 'percent') return `${val}%`;
    if (format === 'efficiency') return val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
    return val.toString();
  };
  
  const homeBetter = lowerIsBetter ? homeValue < awayValue : homeValue > awayValue;
  const awayBetter = lowerIsBetter ? awayValue < homeValue : awayValue > homeValue;
  const diff = homeValue - awayValue;
  
  const homeColorClass = thresholds 
    ? getThresholdColor(homeValue, thresholds, lowerIsBetter)
    : (highlightBetter && homeBetter ? 'text-home' : '');
    
  const awayColorClass = thresholds 
    ? getThresholdColor(awayValue, thresholds, lowerIsBetter)
    : (highlightBetter && awayBetter ? 'text-away' : '');

  const renderValue = (
    value: number, 
    colorClass: string, 
    success?: number, 
    total?: number, 
    tooltip?: React.ReactNode,
    align: 'left' | 'right' = 'right'
  ) => {
    const showCounts = success !== undefined && total !== undefined && total > 0;
    const content = (
      <span className={cn(
        'font-medium min-w-[50px]',
        align === 'right' ? 'text-right' : 'text-left',
        colorClass
      )}>
        {showCounts ? (
          <span className="inline-flex items-baseline gap-0.5">
            <span>{success}</span>
            <span className="text-muted-foreground">/{total}</span>
            <span className="ml-0.5 text-xs">({formatValue(value)})</span>
          </span>
        ) : formatValue(value)}
      </span>
    );

    if (tooltip) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>{content}</TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-[200px]">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }
    return content;
  };
  
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground flex-1">{label}</span>
      <div className="flex items-center gap-3 text-sm">
        {renderValue(homeValue, homeColorClass, homeSuccess, homeTotal, homeTooltip, 'right')}
        <span className="text-muted-foreground text-xs min-w-[40px] text-center">
          {diff !== 0 && (
            <span className={diff > 0 ? 'text-home' : 'text-away'}>
              {diff > 0 ? '+' : ''}{format === 'percent' ? diff : diff.toFixed(2)}
            </span>
          )}
        </span>
        {renderValue(awayValue, awayColorClass, awaySuccess, awayTotal, awayTooltip, 'left')}
      </div>
    </div>
  );
}

function KPICard({ 
  icon: Icon, 
  label, 
  homeValue, 
  awayValue,
  format = 'percent',
}: { 
  icon: React.ElementType;
  label: string;
  homeValue: number;
  awayValue: number;
  format?: 'percent' | 'number';
}) {
  return (
    <Card className="bg-muted/30">
      <CardContent className="p-3 text-center">
        <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
        <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
        <div className="flex items-center justify-center gap-2 text-sm font-bold">
          <span className="text-home">{format === 'percent' ? `${homeValue}%` : homeValue}</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-away">{format === 'percent' ? `${awayValue}%` : awayValue}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SetSummaryKPIs({
  rallies,
  setNo,
  homeName,
  awayName,
  homeScore,
  awayScore,
  previousSetRallies,
  players,
}: SetSummaryKPIsProps) {
  const [activeTab, setActiveTab] = useState('geral');
  const kpis = useSetKPIs(rallies, setNo, previousSetRallies, players);
  
  return (
    <div className="w-full max-w-lg mx-auto mt-4">
      {/* Team headers */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-home" />
          <span className="text-sm font-medium">{homeName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{awayName}</span>
          <div className="w-3 h-3 rounded-full bg-away" />
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-8">
          <TabsTrigger value="geral" className="text-xs px-1">Geral</TabsTrigger>
          <TabsTrigger value="servico" className="text-xs px-1">Serviço</TabsTrigger>
          <TabsTrigger value="rececao" className="text-xs px-1">Receção</TabsTrigger>
          <TabsTrigger value="ataque" className="text-xs px-1">Ataque</TabsTrigger>
          <TabsTrigger value="insights" className="text-xs px-1">Insights</TabsTrigger>
        </TabsList>
        
        {/* GERAL */}
        <TabsContent value="geral" className="mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <KPICard 
              icon={Target} 
              label="Sideout" 
              homeValue={kpis.home.sideoutPercent} 
              awayValue={kpis.away.sideoutPercent} 
            />
            <KPICard 
              icon={Zap} 
              label="Break" 
              homeValue={kpis.home.breakPercent} 
              awayValue={kpis.away.breakPercent} 
            />
          </div>
          
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-xs font-medium">Erros Não Forçados</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <div className="text-muted-foreground">Serviço</div>
                  <div className="font-bold">
                    <span className="text-home">{kpis.home.unforcedServe}</span>
                    {' / '}
                    <span className="text-away">{kpis.away.unforcedServe}</span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Ataque</div>
                  <div className="font-bold">
                    <span className="text-home">{kpis.home.unforcedAttack}</span>
                    {' / '}
                    <span className="text-away">{kpis.away.unforcedAttack}</span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Outros</div>
                  <div className="font-bold">
                    <span className="text-home">{kpis.home.unforcedOther}</span>
                    {' / '}
                    <span className="text-away">{kpis.away.unforcedOther}</span>
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total</div>
                  <div className="font-bold">
                    <span className="text-home">{kpis.home.pointsOffered}</span>
                    {' / '}
                    <span className="text-away">{kpis.away.pointsOffered}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-2 gap-2">
            <KPICard 
              icon={Zap} 
              label="Efic. Ataque" 
              homeValue={Math.round(kpis.home.attEfficiency * 100)} 
              awayValue={Math.round(kpis.away.attEfficiency * 100)} 
            />
            <KPICard 
              icon={Shield} 
              label="Receção +" 
              homeValue={kpis.home.recPositivePercent} 
              awayValue={kpis.away.recPositivePercent} 
            />
          </div>
        </TabsContent>
        
        {/* SERVIÇO */}
        <TabsContent value="servico" className="mt-3">
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <StatRow 
                label="ACE%" 
                homeValue={kpis.home.serveAcePercent} 
                awayValue={kpis.away.serveAcePercent}
                thresholds={THRESHOLDS.serve}
                homeTooltip={`Aces: ${Math.round(kpis.home.serveAcePercent * kpis.home.serveTotal / 100)} / ${kpis.home.serveTotal}`}
                awayTooltip={`Aces: ${Math.round(kpis.away.serveAcePercent * kpis.away.serveTotal / 100)} / ${kpis.away.serveTotal}`}
              />
              <StatRow 
                label="Erro%" 
                homeValue={kpis.home.serveErrorPercent} 
                awayValue={kpis.away.serveErrorPercent}
                lowerIsBetter
                thresholds={{ excellent: 10, acceptable: 15 }}
              />
              <StatRow 
                label="Pressão% (1+2)" 
                homeValue={kpis.home.servePressurePercent} 
                awayValue={kpis.away.servePressurePercent}
                thresholds={{ excellent: 40, acceptable: 25 }}
              />
              <StatRow 
                label="Eficiência Líquida" 
                homeValue={kpis.home.serveEfficiency} 
                awayValue={kpis.away.serveEfficiency}
                format="efficiency"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
                <span>Total: {kpis.home.serveTotal}</span>
                <span>Total: {kpis.away.serveTotal}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* RECEÇÃO */}
        <TabsContent value="rececao" className="mt-3">
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <StatRow 
                label="Perfect% (3)" 
                homeValue={kpis.home.recPerfectPercent} 
                awayValue={kpis.away.recPerfectPercent}
                thresholds={{ excellent: 40, acceptable: 25 }}
              />
              <StatRow 
                label="Positive% (2+3)" 
                homeValue={kpis.home.recPositivePercent} 
                awayValue={kpis.away.recPositivePercent}
                thresholds={THRESHOLDS.reception}
                homeTooltip={`Receções positivas / Total`}
                awayTooltip={`Receções positivas / Total`}
              />
              <StatRow 
                label="Erro% (ACE sofrido)" 
                homeValue={kpis.home.recErrorPercent} 
                awayValue={kpis.away.recErrorPercent}
                lowerIsBetter
                thresholds={{ excellent: 5, acceptable: 10 }}
              />
              <StatRow 
                label="Sob Pressão%" 
                homeValue={kpis.home.recUnderPressurePercent} 
                awayValue={kpis.away.recUnderPressurePercent}
                lowerIsBetter
                thresholds={{ excellent: 20, acceptable: 35 }}
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
                <span>Total: {kpis.home.recTotal}</span>
                <span>Total: {kpis.away.recTotal}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* ATAQUE */}
        <TabsContent value="ataque" className="mt-3">
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <StatRow 
                label="Kill%" 
                homeValue={kpis.home.attKillPercent} 
                awayValue={kpis.away.attKillPercent}
                thresholds={THRESHOLDS.attack}
                homeTooltip={`Kills / Total ataques`}
                awayTooltip={`Kills / Total ataques`}
              />
              <StatRow 
                label="Erro%" 
                homeValue={kpis.home.attErrorPercent} 
                awayValue={kpis.away.attErrorPercent}
                lowerIsBetter
                thresholds={{ excellent: 10, acceptable: 15 }}
              />
              <StatRow 
                label="Bloq. Ponto%" 
                homeValue={kpis.home.attBlockedPointPercent} 
                awayValue={kpis.away.attBlockedPointPercent}
                lowerIsBetter
                thresholds={{ excellent: 5, acceptable: 10 }}
                homeTooltip="Ataques terminados em stuff block (b_code 3)"
                awayTooltip="Ataques terminados em stuff block (b_code 3)"
              />
              <StatRow 
                label="Bloq. Toque%" 
                homeValue={kpis.home.attBlockedTouchPercent} 
                awayValue={kpis.away.attBlockedTouchPercent}
                lowerIsBetter={false}
                highlightBetter={false}
                homeTooltip="Ataques que tocaram no bloco mas rally continuou (b_code 1,2)"
                awayTooltip="Ataques que tocaram no bloco mas rally continuou (b_code 1,2)"
              />
              <StatRow 
                label="Falta Bloco%" 
                homeValue={kpis.home.attBlockFaultPercent} 
                awayValue={kpis.away.attBlockFaultPercent}
                thresholds={{ excellent: 10, acceptable: 5 }}
                homeTooltip="Ataques onde o bloco cometeu falta (b_code 0)"
                awayTooltip="Ataques onde o bloco cometeu falta (b_code 0)"
              />
              <StatRow 
                label="Eficiência" 
                homeValue={Math.round(kpis.home.attEfficiency * 100)} 
                awayValue={Math.round(kpis.away.attEfficiency * 100)}
                format="percent"
                thresholds={THRESHOLDS.attack}
                homeTooltip="(Kills - Erros - Bloqueado) / Total"
                awayTooltip="(Kills - Erros - Bloqueado) / Total"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
                <span>Total: {kpis.home.attTotal}</span>
                <span>Total: {kpis.away.attTotal}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* INSIGHTS */}
        <TabsContent value="insights" className="mt-3 space-y-2">
          {/* Delta from previous */}
          {kpis.deltaFromPrevious && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  {kpis.deltaFromPrevious.homeSideoutDelta > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-destructive" />
                  )}
                  <span className="text-xs font-medium">Δ Sideout vs Set Anterior</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className={cn(
                    'font-medium',
                    kpis.deltaFromPrevious.homeSideoutDelta > 0 ? 'text-green-500' : 'text-destructive'
                  )}>
                    {homeName}: {kpis.deltaFromPrevious.homeSideoutDelta > 0 ? '+' : ''}{kpis.deltaFromPrevious.homeSideoutDelta}pp
                  </span>
                  <span className={cn(
                    'font-medium',
                    kpis.deltaFromPrevious.awaySideoutDelta > 0 ? 'text-green-500' : 'text-destructive'
                  )}>
                    {awayName}: {kpis.deltaFromPrevious.awaySideoutDelta > 0 ? '+' : ''}{kpis.deltaFromPrevious.awaySideoutDelta}pp
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Longest run */}
          {kpis.longestRun && kpis.longestRun.length >= 3 && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-xs font-medium">Maior Sequência</span>
                </div>
                <div className="mt-1 text-sm">
                  <span className={kpis.longestRun.side === 'CASA' ? 'text-home font-medium' : 'text-away font-medium'}>
                    {kpis.longestRun.side === 'CASA' ? homeName : awayName}
                  </span>
                  {' '}{kpis.longestRun.length} pontos seguidos
                  <span className="text-muted-foreground text-xs ml-1">
                    (R{kpis.longestRun.startRally}-{kpis.longestRun.endRally})
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Clutch points */}
          {kpis.clutchPoints && kpis.clutchPoints.totalRallies > 0 && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-medium">Clutch (20+)</span>
                </div>
                <div className="mt-1 text-sm">
                  <span className="text-home font-medium">{kpis.clutchPoints.homePoints}</span>
                  {' - '}
                  <span className="text-away font-medium">{kpis.clutchPoints.awayPoints}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    ({kpis.clutchPoints.totalRallies} rallies)
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Top Zone Distribution */}
          {(kpis.topZoneHome || kpis.topZoneAway) && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-violet-500" />
                  <span className="text-xs font-medium">Zona Preferida (Distribuição)</span>
                </div>
                <div className="flex justify-between text-sm">
                  {kpis.topZoneHome ? (
                    <div>
                      <span className="text-home font-medium">{homeName}</span>
                      <span className="text-muted-foreground">: {kpis.topZoneHome.zone}</span>
                      <Badge variant="outline" className="ml-1 text-xs">
                        {kpis.topZoneHome.percent}%
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs">-</div>
                  )}
                  {kpis.topZoneAway ? (
                    <div>
                      <span className="text-away font-medium">{awayName}</span>
                      <span className="text-muted-foreground">: {kpis.topZoneAway.zone}</span>
                      <Badge variant="outline" className="ml-1 text-xs">
                        {kpis.topZoneAway.percent}%
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-xs">-</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Top Attackers */}
          {(kpis.topAttackersHome.length > 0 || kpis.topAttackersAway.length > 0) && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs font-medium">Mais Solicitados (Ataque)</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-home font-medium text-xs mb-1">{homeName}</div>
                    {kpis.topAttackersHome.length > 0 ? (
                      <div className="space-y-0.5">
                        {kpis.topAttackersHome.map((attacker, idx) => (
                          <div key={attacker.playerId} className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">#{attacker.playerNo}</span>
                            {attacker.playerName && (
                              <span className="font-medium truncate max-w-[60px]">{attacker.playerName.split(' ')[0]}</span>
                            )}
                            <span>{attacker.count} atq</span>
                            <Badge variant="outline" className="text-[10px] px-1">
                              {attacker.percent}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">-</div>
                    )}
                  </div>
                  <div>
                    <div className="text-away font-medium text-xs mb-1">{awayName}</div>
                    {kpis.topAttackersAway.length > 0 ? (
                      <div className="space-y-0.5">
                        {kpis.topAttackersAway.map((attacker, idx) => (
                          <div key={attacker.playerId} className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">#{attacker.playerNo}</span>
                            {attacker.playerName && (
                              <span className="font-medium truncate max-w-[60px]">{attacker.playerName.split(' ')[0]}</span>
                            )}
                            <span>{attacker.count} atq</span>
                            <Badge variant="outline" className="text-[10px] px-1">
                              {attacker.percent}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">-</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Top Servers */}
          {(kpis.topServersHome.length > 0 || kpis.topServersAway.length > 0) && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Radio className="h-4 w-4 text-blue-500" />
                  <span className="text-xs font-medium">Mais Solicitados (Serviço)</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-home font-medium text-xs mb-1">{homeName}</div>
                    {kpis.topServersHome.length > 0 ? (
                      <div className="space-y-0.5">
                        {kpis.topServersHome.map((server) => (
                          <div key={server.playerId} className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">#{server.playerNo}</span>
                            {server.playerName && (
                              <span className="font-medium truncate max-w-[60px]">{server.playerName.split(' ')[0]}</span>
                            )}
                            <span>{server.count} svc</span>
                            <Badge variant="outline" className="text-[10px] px-1">
                              {server.percent}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">-</div>
                    )}
                  </div>
                  <div>
                    <div className="text-away font-medium text-xs mb-1">{awayName}</div>
                    {kpis.topServersAway.length > 0 ? (
                      <div className="space-y-0.5">
                        {kpis.topServersAway.map((server) => (
                          <div key={server.playerId} className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">#{server.playerNo}</span>
                            {server.playerName && (
                              <span className="font-medium truncate max-w-[60px]">{server.playerName.split(' ')[0]}</span>
                            )}
                            <span>{server.count} svc</span>
                            <Badge variant="outline" className="text-[10px] px-1">
                              {server.percent}%
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">-</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Top Scorers */}
          {(kpis.topScorersHome.length > 0 || kpis.topScorersAway.length > 0) && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium">Maiores Pontuadores</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-home font-medium text-xs mb-1">{homeName}</div>
                    {kpis.topScorersHome.length > 0 ? (
                      <div className="space-y-0.5">
                        {kpis.topScorersHome.map((scorer) => (
                          <div key={scorer.playerId} className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">#{scorer.playerNo}</span>
                            {scorer.playerName && (
                              <span className="font-medium truncate max-w-[50px]">{scorer.playerName.split(' ')[0]}</span>
                            )}
                            <span className="font-semibold">{scorer.total}pts</span>
                            <span className="text-muted-foreground text-[10px]">
                              ({scorer.kills}K/{scorer.aces}A/{scorer.blocks}B)
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">-</div>
                    )}
                  </div>
                  <div>
                    <div className="text-away font-medium text-xs mb-1">{awayName}</div>
                    {kpis.topScorersAway.length > 0 ? (
                      <div className="space-y-0.5">
                        {kpis.topScorersAway.map((scorer) => (
                          <div key={scorer.playerId} className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">#{scorer.playerNo}</span>
                            {scorer.playerName && (
                              <span className="font-medium truncate max-w-[50px]">{scorer.playerName.split(' ')[0]}</span>
                            )}
                            <span className="font-semibold">{scorer.total}pts</span>
                            <span className="text-muted-foreground text-[10px]">
                              ({scorer.kills}K/{scorer.aces}A/{scorer.blocks}B)
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">-</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Top Receivers */}
          {(kpis.topReceiversHome.length > 0 || kpis.topReceiversAway.length > 0) && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span className="text-xs font-medium">Eficiência de Receção</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-home font-medium text-xs mb-1">{homeName}</div>
                    {kpis.topReceiversHome.length > 0 ? (
                      <div className="space-y-0.5">
                        {kpis.topReceiversHome.map((receiver) => (
                          <div key={receiver.playerId} className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">#{receiver.playerNo}</span>
                            {receiver.playerName && (
                              <span className="font-medium truncate max-w-[50px]">{receiver.playerName.split(' ')[0]}</span>
                            )}
                            <span>{receiver.total} rec</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] px-1",
                                receiver.positivePercent >= 60 && "border-green-500 text-green-600",
                                receiver.positivePercent < 40 && "border-red-500 text-red-600"
                              )}
                            >
                              {receiver.positivePercent}%+
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">-</div>
                    )}
                  </div>
                  <div>
                    <div className="text-away font-medium text-xs mb-1">{awayName}</div>
                    {kpis.topReceiversAway.length > 0 ? (
                      <div className="space-y-0.5">
                        {kpis.topReceiversAway.map((receiver) => (
                          <div key={receiver.playerId} className="flex items-center gap-1 text-xs">
                            <span className="text-muted-foreground">#{receiver.playerNo}</span>
                            {receiver.playerName && (
                              <span className="font-medium truncate max-w-[50px]">{receiver.playerName.split(' ')[0]}</span>
                            )}
                            <span>{receiver.total} rec</span>
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] px-1",
                                receiver.positivePercent >= 60 && "border-green-500 text-green-600",
                                receiver.positivePercent < 40 && "border-red-500 text-red-600"
                              )}
                            >
                              {receiver.positivePercent}%+
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-xs">-</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {(kpis.worstRotationHome || kpis.worstRotationAway) && (
            <Card className="bg-muted/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-medium">Pior Rotação (Sideout)</span>
                </div>
                <div className="flex justify-between text-sm">
                  {kpis.worstRotationHome && (
                    <div>
                      <span className="text-home font-medium">{homeName}</span>
                      <span className="text-muted-foreground">: P{kpis.worstRotationHome.rotation}</span>
                      <Badge variant="outline" className="ml-1 text-xs">
                        {kpis.worstRotationHome.percent}%
                      </Badge>
                    </div>
                  )}
                  {kpis.worstRotationAway && (
                    <div>
                      <span className="text-away font-medium">{awayName}</span>
                      <span className="text-muted-foreground">: P{kpis.worstRotationAway.rotation}</span>
                      <Badge variant="outline" className="ml-1 text-xs">
                        {kpis.worstRotationAway.percent}%
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* No insights available */}
          {!kpis.deltaFromPrevious && 
           (!kpis.longestRun || kpis.longestRun.length < 3) && 
           !kpis.clutchPoints &&
           !kpis.worstRotationHome && 
           !kpis.worstRotationAway &&
           !kpis.topZoneHome &&
           !kpis.topZoneAway &&
           kpis.topAttackersHome.length === 0 &&
           kpis.topAttackersAway.length === 0 &&
           kpis.topScorersHome.length === 0 &&
           kpis.topScorersAway.length === 0 &&
           kpis.topReceiversHome.length === 0 &&
           kpis.topReceiversAway.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Sem insights disponíveis para este set
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
