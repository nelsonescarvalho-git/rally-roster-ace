import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useErrorStats } from '@/hooks/useErrorStats';
import { Side, Rally, Player, MatchPlayer, Match, Sanction } from '@/types/volleyball';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface ErrorsTabProps {
  rallies: Rally[];
  players: (Player | MatchPlayer)[];
  match: Match;
  sanctions: Sanction[];
  selectedSet: number;
}

export function ErrorsTab({ rallies, players, match, sanctions, selectedSet }: ErrorsTabProps) {
  const [sideFilter, setSideFilter] = useState<Side | 'TODAS'>('TODAS');

  const { playerErrors, teamTotals, playerSanctions, teamSanctions } = useErrorStats(
    rallies, players, sanctions, { side: sideFilter, selectedSet }
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-1">
        <Button variant={sideFilter === 'TODAS' ? 'default' : 'outline'} size="sm" onClick={() => setSideFilter('TODAS')}>Todas</Button>
        <Button variant={sideFilter === 'CASA' ? 'default' : 'outline'} size="sm" onClick={() => setSideFilter('CASA')}>{match.home_name}</Button>
        <Button variant={sideFilter === 'FORA' ? 'default' : 'outline'} size="sm" onClick={() => setSideFilter('FORA')}>{match.away_name}</Button>
      </div>

      {/* Error totals */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Erros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2 text-center text-xs mb-4">
            {['Serviço', 'Ataque', 'Receção', 'Bloco', 'Total'].map((label, i) => {
              const homeVals = [teamTotals.home.serve, teamTotals.home.attack, teamTotals.home.reception, teamTotals.home.block, teamTotals.home.total];
              const awayVals = [teamTotals.away.serve, teamTotals.away.attack, teamTotals.away.reception, teamTotals.away.block, teamTotals.away.total];
              return (
                <div key={label}>
                  <div className="text-muted-foreground mb-1">{label}</div>
                  <div className="font-bold">
                    <span className="text-home">{homeVals[i]}</span>
                    {' / '}
                    <span className="text-away">{awayVals[i]}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {playerErrors.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center text-xs">Svc</TableHead>
                  <TableHead className="text-center text-xs">Atq</TableHead>
                  <TableHead className="text-center text-xs">Rec</TableHead>
                  <TableHead className="text-center text-xs">Blc</TableHead>
                  <TableHead className="text-center font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerErrors.map(p => (
                  <TableRow key={p.playerId}>
                    <TableCell className="font-medium text-xs">{p.jerseyNumber}</TableCell>
                    <TableCell className="text-sm truncate max-w-[100px]">{p.playerName}</TableCell>
                    <TableCell className="text-center text-xs">{p.serveErrors || '-'}</TableCell>
                    <TableCell className="text-center text-xs">{p.attackErrors || '-'}</TableCell>
                    <TableCell className="text-center text-xs">{p.receptionErrors || '-'}</TableCell>
                    <TableCell className="text-center text-xs">{p.blockErrors || '-'}</TableCell>
                    <TableCell className="text-center font-semibold text-xs text-destructive">{p.totalErrors}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sanctions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-warning" />
            Faltas / Sanções
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-around text-center text-xs mb-4">
            <div>
              <div className="text-muted-foreground mb-1">{match.home_name}</div>
              <div className="font-bold text-home">{teamSanctions.home}</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">{match.away_name}</div>
              <div className="font-bold text-away">{teamSanctions.away}</div>
            </div>
          </div>

          {playerSanctions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-center text-xs">Avisos</TableHead>
                  <TableHead className="text-center text-xs">Penal.</TableHead>
                  <TableHead className="text-center font-semibold">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playerSanctions.map((s, i) => (
                  <TableRow key={`${s.playerId}-${i}`}>
                    <TableCell className="font-medium text-xs">{s.jerseyNumber || '-'}</TableCell>
                    <TableCell className="text-sm truncate max-w-[100px]">{s.playerName}</TableCell>
                    <TableCell className="text-center text-xs">{s.warnings || '-'}</TableCell>
                    <TableCell className="text-center text-xs">{s.penalties || '-'}</TableCell>
                    <TableCell className="text-center font-semibold text-xs">{s.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-4">Sem sanções registadas</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
