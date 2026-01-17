import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAttackStats, AttackerStats, DistributionBreakdown } from '@/hooks/useAttackStats';
import { Rally, Player, MatchPlayer, Side, Match, DISTRIBUTION_LABELS } from '@/types/volleyball';
import { Progress } from '@/components/ui/progress';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
            <TableHead className="w-[100px]">Dist.</TableHead>
            <TableHead className="text-center">Dific.</TableHead>
            <TableHead className="text-center">Ataques</TableHead>
            <TableHead className="text-center">Kills</TableHead>
            <TableHead className="text-center">Erros</TableHead>
            <TableHead className="text-center">Efic.</TableHead>
            <TableHead>Top Atacantes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {breakdown.map(row => (
            <TableRow key={row.distributionCode} className={row.totalAttempts === 0 ? 'opacity-50' : ''}>
              <TableCell className="font-medium">
                <span className="mr-1">{row.emoji}</span>
                {row.distributionCode} - {row.qualityLabel}
              </TableCell>
              <TableCell className="text-center text-xs text-muted-foreground">{row.difficulty}</TableCell>
              <TableCell className="text-center">{row.totalAttempts}</TableCell>
              <TableCell className="text-center text-success">{row.totalKills}</TableCell>
              <TableCell className="text-center text-destructive">{row.totalErrors}</TableCell>
              <TableCell className="text-center font-semibold">
                {row.totalAttempts > 0 ? `${(row.killRate * 100).toFixed(0)}%` : '-'}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">{row.topAttackers}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  const renderAttackerRow = (stat: AttackerStats) => {
    const effDiff = stat.efficiencyWithGoodDist - stat.efficiencyWithBadDist;
    const isAdaptable = stat.attemptsWithBadDist >= 2 && stat.efficiencyWithBadDist > 0;
    
    return (
      <TableRow key={stat.attackerId}>
        <TableCell className="font-medium whitespace-nowrap">
          #{stat.jerseyNumber} {stat.attackerName}
        </TableCell>
        <TableCell className="text-center">{stat.totalAttempts}</TableCell>
        <TableCell className="text-center text-success">{stat.totalKills}</TableCell>
        <TableCell className="text-center text-destructive">{stat.totalErrors}</TableCell>
        <TableCell className="text-center font-semibold">
          {(stat.efficiency * 100).toFixed(0)}%
        </TableCell>
        <TableCell className="text-center text-xs">{stat.avgDistributionQuality.toFixed(1)}</TableCell>
        <TableCell className="text-center text-xs text-success">
          {stat.attemptsWithGoodDist > 0 ? `${(stat.efficiencyWithGoodDist * 100).toFixed(0)}%` : '-'}
        </TableCell>
        <TableCell className="text-center text-xs text-warning">
          {stat.attemptsWithBadDist > 0 ? `${(stat.efficiencyWithBadDist * 100).toFixed(0)}%` : '-'}
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
                <TableHead className="text-center">Att</TableHead>
                <TableHead className="text-center">K</TableHead>
                <TableHead className="text-center">E</TableHead>
                <TableHead className="text-center">Efic.</TableHead>
                <TableHead className="text-center text-xs">Média Dist.</TableHead>
                <TableHead className="text-center text-xs">Efic. c/Boa</TableHead>
                <TableHead className="text-center text-xs">Efic. c/Má</TableHead>
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
