import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ServeTypeStats } from '@/hooks/useServeTypeStats';

interface ServeTypeStatsCardProps {
  stats: ServeTypeStats[];
  teamName: string;
  teamSide: 'home' | 'away';
}

// Get efficiency color based on thresholds
const getEfficiencyColor = (efficiency: number) => {
  const percent = efficiency * 100;
  if (percent >= 15) return 'text-success';
  if (percent >= 0) return 'text-warning';
  return 'text-destructive';
};

// Get rate color (for ACE rate)
const getAceRateColor = (rate: number) => {
  const percent = rate * 100;
  if (percent >= 10) return 'text-success';
  if (percent >= 5) return 'text-warning';
  return 'text-muted-foreground';
};

// Get error rate color (lower is better)
const getErrorRateColor = (rate: number) => {
  const percent = rate * 100;
  if (percent <= 10) return 'text-success';
  if (percent <= 20) return 'text-warning';
  return 'text-destructive';
};

export function ServeTypeStatsCard({ stats, teamName, teamSide }: ServeTypeStatsCardProps) {
  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <span className={cn(
              'w-3 h-3 rounded-full',
              teamSide === 'home' ? 'bg-home' : 'bg-away'
            )} />
            {teamName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Sem dados de tipo de serviço registados
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totals = stats.reduce((acc, s) => ({
    total: acc.total + s.total,
    aces: acc.aces + s.aces,
    errors: acc.errors + s.errors,
  }), { total: 0, aces: 0, errors: 0 });

  const totalEfficiency = totals.total > 0 
    ? (totals.aces - totals.errors) / totals.total 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className={cn(
            'w-3 h-3 rounded-full',
            teamSide === 'home' ? 'bg-home' : 'bg-away'
          )} />
          {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">Tipo</TableHead>
              <TableHead className="text-center w-[50px]">Serv.</TableHead>
              <TableHead className="text-center w-[60px]">ACE%</TableHead>
              <TableHead className="text-center w-[60px]">Erro%</TableHead>
              <TableHead className="text-center w-[60px]">Efic.</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {stats.map((s) => (
              <TableRow key={s.type + s.label}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    <span>{s.emoji}</span>
                    <span className="text-sm">{s.label}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className="text-xs">
                    {s.total}
                  </Badge>
                </TableCell>
                <TableCell className={cn('text-center font-medium', getAceRateColor(s.aceRate))}>
                  {(s.aceRate * 100).toFixed(0)}%
                  <span className="text-[10px] text-muted-foreground ml-0.5">
                    ({s.aces})
                  </span>
                </TableCell>
                <TableCell className={cn('text-center font-medium', getErrorRateColor(s.errorRate))}>
                  {(s.errorRate * 100).toFixed(0)}%
                  <span className="text-[10px] text-muted-foreground ml-0.5">
                    ({s.errors})
                  </span>
                </TableCell>
                <TableCell className={cn('text-center font-semibold', getEfficiencyColor(s.efficiency))}>
                  {(s.efficiency * 100).toFixed(0)}%
                </TableCell>
              </TableRow>
            ))}
            
            {/* Totals row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>
                <div className="flex items-center gap-1.5">
                  <span>📊</span>
                  <span className="text-sm">Total</span>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary" className="text-xs">
                  {totals.total}
                </Badge>
              </TableCell>
              <TableCell className={cn('text-center', getAceRateColor(totals.aces / totals.total))}>
                {totals.total > 0 ? ((totals.aces / totals.total) * 100).toFixed(0) : 0}%
                <span className="text-[10px] text-muted-foreground ml-0.5">
                  ({totals.aces})
                </span>
              </TableCell>
              <TableCell className={cn('text-center', getErrorRateColor(totals.errors / totals.total))}>
                {totals.total > 0 ? ((totals.errors / totals.total) * 100).toFixed(0) : 0}%
                <span className="text-[10px] text-muted-foreground ml-0.5">
                  ({totals.errors})
                </span>
              </TableCell>
              <TableCell className={cn('text-center', getEfficiencyColor(totalEfficiency))}>
                {(totalEfficiency * 100).toFixed(0)}%
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
