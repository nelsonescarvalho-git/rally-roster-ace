import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useDistributionStats, SetterDistribution } from '@/hooks/useDistributionStats';
import { Rally, Player, MatchPlayer, Side, Match } from '@/types/volleyball';
import { Progress } from '@/components/ui/progress';

interface DistributionTabProps {
  rallies: Rally[];
  players: (Player | MatchPlayer)[];
  match: Match;
  selectedSet: number;
  getRalliesForSet: (setNo: number) => Rally[];
}

export function DistributionTab({ rallies, players, match, selectedSet, getRalliesForSet }: DistributionTabProps) {
  const [sideFilter, setSideFilter] = useState<Side | 'TODAS'>('TODAS');
  const [setterFilter, setSetterFilter] = useState<string | null>(null);

  const filteredRallies = selectedSet === 0 ? rallies : getRalliesForSet(selectedSet);

  const { distributionStats, setters, destinations } = useDistributionStats(
    filteredRallies,
    players,
    { side: sideFilter, setterId: setterFilter }
  );

  // Group stats by side when showing all
  const casaStats = distributionStats.filter(s => s.side === 'CASA');
  const foraStats = distributionStats.filter(s => s.side === 'FORA');

  const renderSetterRow = (stat: SetterDistribution) => {
    const maxCount = Math.max(...Object.values(stat.destinations));
    
    return (
      <TableRow key={stat.setterId}>
        <TableCell className="font-medium whitespace-nowrap">
          #{stat.jerseyNumber} {stat.setterName}
        </TableCell>
        {destinations.map(dest => {
          const count = stat.destinations[dest];
          const pct = stat.total > 0 ? (count / stat.total) * 100 : 0;
          return (
            <TableCell key={dest} className="text-center text-xs">
              {count > 0 ? `${count} (${pct.toFixed(0)}%)` : '-'}
            </TableCell>
          );
        })}
        <TableCell className="text-center font-semibold">{stat.total}</TableCell>
        <TableCell className="text-center font-medium text-primary">{stat.preference}</TableCell>
        <TableCell className="text-center text-xs whitespace-nowrap">{stat.top2}</TableCell>
      </TableRow>
    );
  };

  const renderMiniChart = (stat: SetterDistribution) => {
    if (stat.total === 0) return null;
    
    return (
      <div className="mt-2 space-y-1">
        {destinations.map(dest => {
          const count = stat.destinations[dest];
          const pct = stat.total > 0 ? (count / stat.total) * 100 : 0;
          if (count === 0) return null;
          
          return (
            <div key={dest} className="flex items-center gap-2 text-xs">
              <span className="w-12 text-muted-foreground">{dest}</span>
              <Progress value={pct} className="flex-1 h-2" />
              <span className="w-10 text-right">{pct.toFixed(0)}%</span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderStatsTable = (stats: SetterDistribution[], title?: string) => {
    if (stats.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          Sem dados de distribuição
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
                <TableHead>Setter</TableHead>
                {destinations.map(dest => (
                  <TableHead key={dest} className="text-center text-xs px-2">{dest}</TableHead>
                ))}
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Pref.</TableHead>
                <TableHead className="text-center">Top 2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.map(renderSetterRow)}
            </TableBody>
          </Table>
        </div>
        
        {/* Mini charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {stats.map(stat => (
            <Card key={stat.setterId} className="p-3">
              <div className="font-medium text-sm">
                #{stat.jerseyNumber} {stat.setterName}
              </div>
              {renderMiniChart(stat)}
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
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
            value={setterFilter || 'all'}
            onValueChange={(v) => setSetterFilter(v === 'all' ? null : v)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Setter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Setters</SelectItem>
              {setters.map(setter => (
                <SelectItem key={setter.id} value={setter.id}>
                  #{setter.jerseyNumber} {setter.name}
                </SelectItem>
              ))}
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
                Sem dados de distribuição. Registe rallies com setter e destino.
              </div>
            )}
          </div>
        ) : (
          renderStatsTable(distributionStats)
        )}
      </CardContent>
    </Card>
  );
}
