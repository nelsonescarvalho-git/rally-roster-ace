import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAttackStats, AttackerStats, DistributionBreakdown } from '@/hooks/useAttackStats';
import { Rally, Player, MatchPlayer, Side, Match, DISTRIBUTION_LABELS } from '@/types/volleyball';
import { Progress } from '@/components/ui/progress';
import { Zap, TrendingUp, TrendingDown, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StatCell, STAT_THRESHOLDS } from '@/components/ui/StatCell';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Detailed descriptions for each distribution quality
const DISTRIBUTION_DESCRIPTIONS: Record<number, { title: string; description: string; attackOptions: string }> = {
  3: {
    title: 'Distribuição Excelente (Q3)',
    description: 'Passe perfeito que permite todas as combinações de ataque.',
    attackOptions: 'Primeiros tempos, bolas rápidas, combinações'
  },
  2: {
    title: 'Distribuição Boa (Q2)',
    description: 'Passe com boas condições para ataque organizado.',
    attackOptions: 'Bolas altas, alguns primeiros tempos'
  },
  1: {
    title: 'Distribuição Fraca (Q1)',
    description: 'Passe que limita as opções de ataque.',
    attackOptions: 'Bola alta forçada, poucos recursos'
  },
  0: {
    title: 'Distribuição Má (Q0)',
    description: 'Passe muito fraco, ataque em condições difíceis.',
    attackOptions: 'Bola de segurança, freeball'
  }
};

interface AttackTabProps {
  rallies: Rally[];
  players: (Player | MatchPlayer)[];
  match: Match;
  selectedSet: number;
  getRalliesForSet: (setNo: number) => Rally[];
}

export function AttackTab({ rallies, players, match, selectedSet, getRalliesForSet }: AttackTabProps) {
  const [sideFilter, setSideFilter] = useState<Side | 'TODAS'>('TODAS');
  const [attackerFilter, setAttackerFilter] = useState<string | null>(null);
  const [distributionFilter, setDistributionFilter] = useState<number | null>(null);

  const filteredRallies = selectedSet === 0 ? rallies : getRalliesForSet(selectedSet);

  const { attackerStats, attackers, globalDistributionBreakdown } = useAttackStats(
    filteredRallies,
    players,
    { side: sideFilter, attackerId: attackerFilter, distributionCode: distributionFilter }
  );

  // Group stats by side when showing all
  const casaStats = attackerStats.filter(s => s.side === 'CASA');
  const foraStats = attackerStats.filter(s => s.side === 'FORA');

  const renderDistributionBreakdownTable = (breakdown: DistributionBreakdown[]) => {
    const hasData = breakdown.some(b => b.totalAttempts > 0);
    
    if (!hasData) {
      return (
        <div className="text-center text-muted-foreground py-4 text-sm">
          Sem dados de ataque
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">
              <div className="flex items-center gap-1">
                Distribuição
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[250px]">
                      <div className="space-y-1 text-xs">
                        <div className="font-medium">Qualidade da Distribuição</div>
                        <div>Q3: Todas as opções disponíveis</div>
                        <div>Q2: Várias opções de ataque</div>
                        <div>Q1: Opções limitadas</div>
                        <div>Q0: Ataque muito difícil</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </TableHead>
            <TableHead className="text-center">K/Att (Efic.)</TableHead>
            <TableHead>Top Atacantes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {breakdown.map(row => {
            const distInfo = DISTRIBUTION_DESCRIPTIONS[row.distributionCode];
            const neutrals = row.totalAttempts - row.totalKills - row.totalErrors;
            const expectedDiff = row.totalAttempts > 0 
              ? (row.killRate * 100) - (row.expectedKillRate * 100)
              : 0;
            
            return (
              <TableRow key={row.distributionCode} className={row.totalAttempts === 0 ? 'opacity-50' : ''}>
                <TableCell className="font-medium">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-1 cursor-help">
                          <span className="mr-1">{row.emoji}</span>
                          <span>Q{row.distributionCode}</span>
                          <span className="text-muted-foreground text-xs">- {row.qualityLabel}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-[280px]">
                        <div className="space-y-2 text-xs">
                          <div className="font-medium">{distInfo?.title}</div>
                          <div className="text-muted-foreground">{distInfo?.description}</div>
                          <div className="pt-1 border-t border-border">
                            <span className="text-muted-foreground">Opções: </span>
                            {distInfo?.attackOptions}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Dificuldade: </span>
                            <span className="font-medium">{row.difficulty}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Kill% esperada: </span>
                            <span className="font-medium">{Math.round(row.expectedKillRate * 100)}%</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell className="text-center">
                  <StatCell
                    success={row.totalKills}
                    total={row.totalAttempts}
                    errors={row.totalErrors}
                    efficiency={row.killRate * 100}
                    thresholds={STAT_THRESHOLDS.attack}
                    tooltipContent={
                      <div className="space-y-1.5">
                        <div className="font-medium border-b border-border pb-1">
                          {row.emoji} Q{row.distributionCode} - {row.qualityLabel}
                        </div>
                        <div className="grid grid-cols-2 gap-x-3">
                          <span className="text-muted-foreground">Kills:</span>
                          <span className="text-primary font-medium">{row.totalKills}</span>
                          <span className="text-muted-foreground">Erros:</span>
                          <span className="text-destructive">{row.totalErrors}</span>
                          <span className="text-muted-foreground">Neutros:</span>
                          <span>{neutrals}</span>
                        </div>
                        <div className="pt-1 border-t border-border">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Kill% atual:</span>
                            <span className="font-medium">{Math.round(row.killRate * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Kill% esperada:</span>
                            <span>{Math.round(row.expectedKillRate * 100)}%</span>
                          </div>
                          {row.totalAttempts > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Diferença:</span>
                              <span className={expectedDiff >= 0 ? 'text-primary' : 'text-destructive'}>
                                {expectedDiff >= 0 ? '+' : ''}{expectedDiff.toFixed(0)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    }
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.topAttackers}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const renderAttackerRow = (stat: AttackerStats) => {
    const effDiff = stat.efficiencyWithGoodDist - stat.efficiencyWithBadDist;
    const isAdaptable = stat.attemptsWithBadDist >= 2 && stat.efficiencyWithBadDist > 0;
    const neutrals = stat.totalAttempts - stat.totalKills - stat.totalErrors;
    
    return (
      <TableRow key={stat.attackerId}>
        <TableCell className="font-medium whitespace-nowrap">
          #{stat.jerseyNumber} {stat.attackerName}
        </TableCell>
        <TableCell className="text-center">
          <StatCell
            success={stat.totalKills}
            total={stat.totalAttempts}
            errors={stat.totalErrors}
            efficiency={stat.efficiency * 100}
            thresholds={STAT_THRESHOLDS.attack}
            tooltipContent={
              <div className="space-y-1">
                <div className="font-medium">{stat.attackerName}</div>
                <div>Kills: {stat.totalKills}</div>
                <div>Erros: {stat.totalErrors}</div>
                <div>Neutros: {neutrals}</div>
                <div className="pt-1 border-t border-border">
                  Média Dist.: {stat.avgDistributionQuality.toFixed(1)}
                </div>
              </div>
            }
          />
        </TableCell>
        <TableCell className="text-center text-xs">{stat.avgDistributionQuality.toFixed(1)}</TableCell>
        <TableCell className="text-center text-xs">
          {stat.attemptsWithGoodDist > 0 ? (
            <StatCell
              success={Math.round(stat.efficiencyWithGoodDist * stat.attemptsWithGoodDist)}
              total={stat.attemptsWithGoodDist}
              efficiency={stat.efficiencyWithGoodDist * 100}
              thresholds={STAT_THRESHOLDS.attack}
              compact
              tooltipContent="Eficiência com distribuição boa (Q2-Q3)"
            />
          ) : '-'}
        </TableCell>
        <TableCell className="text-center text-xs">
          {stat.attemptsWithBadDist > 0 ? (
            <StatCell
              success={Math.round(stat.efficiencyWithBadDist * stat.attemptsWithBadDist)}
              total={stat.attemptsWithBadDist}
              efficiency={stat.efficiencyWithBadDist * 100}
              thresholds={STAT_THRESHOLDS.attack}
              compact
              tooltipContent="Eficiência com distribuição má (Q0-Q1)"
            />
          ) : '-'}
        </TableCell>
        <TableCell className="text-center">
          {stat.attemptsWithGoodDist > 0 && stat.attemptsWithBadDist > 0 ? (
            <Badge variant={isAdaptable ? 'default' : 'secondary'} className="text-xs">
              {effDiff > 0 ? '+' : ''}{(effDiff * 100).toFixed(0)}%
            </Badge>
          ) : '-'}
        </TableCell>
      </TableRow>
    );
  };

  const renderMiniChart = (stat: AttackerStats) => {
    if (stat.totalAttempts === 0) return null;
    
    return (
      <div className="mt-2 space-y-1">
        {stat.statsByDistribution.map(d => {
          if (d.attempts === 0) return null;
          const info = DISTRIBUTION_LABELS[d.distributionCode];
          const effPct = d.attempts > 0 ? d.efficiency * 100 : 0;
          
          return (
            <div key={d.distributionCode} className="flex items-center gap-2 text-xs">
              <span className="w-14 text-muted-foreground">{info?.emoji} {d.distributionCode}</span>
              <Progress value={Math.max(0, effPct + 50)} className="flex-1 h-2" />
              <span className="w-10 text-right">
                {d.kills}/{d.attempts}
              </span>
              <span className="w-12 text-right font-medium">
                {effPct > 0 ? '+' : ''}{effPct.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStatsTable = (stats: AttackerStats[], title?: string) => {
    if (stats.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          Sem dados de ataque
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {title && <h3 className="font-semibold text-lg">{title}</h3>}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Atacante</TableHead>
                <TableHead className="text-center">K/Att (Efic.)</TableHead>
                <TableHead className="text-center text-xs">Média Dist.</TableHead>
                <TableHead className="text-center text-xs">c/Boa Dist.</TableHead>
                <TableHead className="text-center text-xs">c/Má Dist.</TableHead>
                <TableHead className="text-center text-xs">Δ Adapt.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map(renderAttackerRow)}
            </TableBody>
          </Table>
        </div>
        
        {/* Mini charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {stats.slice(0, 6).map(stat => (
            <Card key={stat.attackerId} className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-sm">
                  #{stat.jerseyNumber} {stat.attackerName}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {stat.attemptsWithGoodDist > 0 && stat.attemptsWithBadDist > 0 && (
                    <>
                      {stat.efficiencyWithBadDist > 0.1 ? (
                        <Badge variant="default" className="text-xs gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Adaptável
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs gap-1">
                          <TrendingDown className="h-3 w-3" />
                          Dependente
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
              {renderMiniChart(stat)}
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Distribution Quality Breakdown Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Ataque por Qualidade de Distribuição
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderDistributionBreakdownTable(globalDistributionBreakdown)}
        </CardContent>
      </Card>

      {/* Main Attack Stats Card */}
      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-1">
              <Button
                variant={sideFilter === 'TODAS' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSideFilter('TODAS')}
              >
                Todas
              </Button>
              <Button
                variant={sideFilter === 'CASA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSideFilter('CASA')}
              >
                {match.home_name}
              </Button>
              <Button
                variant={sideFilter === 'FORA' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSideFilter('FORA')}
              >
                {match.away_name}
              </Button>
            </div>

            <Select
              value={attackerFilter || 'all'}
              onValueChange={(v) => setAttackerFilter(v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Atacante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Atacantes</SelectItem>
                {attackers.map(attacker => (
                  <SelectItem key={attacker.id} value={attacker.id}>
                    #{attacker.jersey_number} {attacker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={distributionFilter !== null ? String(distributionFilter) : 'all'}
              onValueChange={(v) => setDistributionFilter(v === 'all' ? null : Number(v))}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Distribuição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Dist.</SelectItem>
                <SelectItem value="3">⭐ 3 - Excelente</SelectItem>
                <SelectItem value="2">+ 2 - Boa</SelectItem>
                <SelectItem value="1">- 1 - Fraca</SelectItem>
                <SelectItem value="0">✗ 0 - Má</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          {sideFilter === 'TODAS' ? (
            <div className="space-y-6">
              {casaStats.length > 0 && renderStatsTable(casaStats, match.home_name)}
              {foraStats.length > 0 && renderStatsTable(foraStats, match.away_name)}
              {casaStats.length === 0 && foraStats.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  Sem dados de ataque. Registe rallies com atacante e código de ataque.
                </div>
              )}
            </div>
          ) : (
            renderStatsTable(attackerStats)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
