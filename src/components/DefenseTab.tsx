import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDefenseStats } from '@/hooks/useDefenseStats';
import { Side, Player, MatchPlayer, Match } from '@/types/volleyball';
import { RallyActionWithPlayer } from '@/types/rallyActions';
import { cn } from '@/lib/utils';

interface DefenseTabProps {
  rallyActionsMap: Map<string, RallyActionWithPlayer[]> | undefined;
  players: (Player | MatchPlayer)[];
  match: Match;
  selectedSet: number;
}

function QualityCell({ count, total }: { count: number; total: number }) {
  if (total === 0) return <span className="text-muted-foreground">-</span>;
  const pct = Math.round((count / total) * 100);
  return (
    <span className="text-xs">
      {count} <span className="text-muted-foreground">({pct}%)</span>
    </span>
  );
}

function PercentBadge({ value, thresholds }: { value: number; thresholds: { good: number; ok: number } }) {
  const color = value >= thresholds.good ? 'text-primary' : value >= thresholds.ok ? 'text-warning' : 'text-destructive';
  return <span className={cn('font-medium text-xs', color)}>{value}%</span>;
}

export function DefenseTab({ rallyActionsMap, players, match, selectedSet }: DefenseTabProps) {
  const [sideFilter, setSideFilter] = useState<Side>('CASA');

  const stats = useDefenseStats(rallyActionsMap, players, { side: sideFilter, selectedSet });

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <Button variant={sideFilter === 'CASA' ? 'default' : 'outline'} size="sm" onClick={() => setSideFilter('CASA')}>
          {match.home_name}
        </Button>
        <Button variant={sideFilter === 'FORA' ? 'default' : 'outline'} size="sm" onClick={() => setSideFilter('FORA')}>
          {match.away_name}
        </Button>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {stats.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 text-sm">Sem dados de defesa</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="min-w-[80px]">Nome</TableHead>
                  <TableHead className="text-center">⭐ Exc.</TableHead>
                  <TableHead className="text-center">+ Boa</TableHead>
                  <TableHead className="text-center">- Fraca</TableHead>
                  <TableHead className="text-center">✗ Má</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pos.%</TableHead>
                  <TableHead className="text-center">Exc.%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map(p => (
                  <TableRow key={p.playerId}>
                    <TableCell className="font-medium">{p.jerseyNumber}</TableCell>
                    <TableCell className="text-sm truncate max-w-[100px]">{p.playerName}</TableCell>
                    <TableCell className="text-center"><QualityCell count={p.excellent} total={p.total} /></TableCell>
                    <TableCell className="text-center"><QualityCell count={p.good} total={p.total} /></TableCell>
                    <TableCell className="text-center"><QualityCell count={p.poor} total={p.total} /></TableCell>
                    <TableCell className="text-center"><QualityCell count={p.bad} total={p.total} /></TableCell>
                    <TableCell className="text-center font-semibold text-xs">{p.total}</TableCell>
                    <TableCell className="text-center"><PercentBadge value={p.positivePercent} thresholds={{ good: 60, ok: 40 }} /></TableCell>
                    <TableCell className="text-center"><PercentBadge value={p.excellentPercent} thresholds={{ good: 30, ok: 15 }} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
