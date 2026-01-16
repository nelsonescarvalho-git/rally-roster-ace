import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { useStats } from '@/hooks/useStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download } from 'lucide-react';
import { Side } from '@/types/volleyball';

export default function Stats() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { match, rallies, loading, loadMatch, getRalliesForSet, getEffectivePlayers } = useMatch(matchId || null);
  const effectivePlayers = getEffectivePlayers();
  const [selectedSet, setSelectedSet] = useState(0); // 0 = all
  const [selectedSide, setSelectedSide] = useState<Side>('CASA');

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId, loadMatch]);

  const filteredRallies = selectedSet === 0 ? rallies : getRalliesForSet(selectedSet);
  const { playerStats, rotationStats } = useStats(filteredRallies, effectivePlayers);
  const filteredPlayerStats = playerStats.filter(p => p.side === selectedSide);
  const filteredRotationStats = rotationStats.filter(r => r.side === selectedSide);

  const exportCSV = () => {
    const headers = ['Rally,Set,Phase,ServeSide,ServeRot,RecvSide,RecvRot,PointWon,Reason'];
    const rows = rallies.map(r => 
      `${r.rally_no},${r.set_no},${r.phase},${r.serve_side},${r.serve_rot},${r.recv_side},${r.recv_rot},${r.point_won_by || ''},${r.reason || ''}`
    );
    const csv = [...headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${match?.title || 'stats'}.csv`;
    a.click();
  };

  if (loading || !match) {
    return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/live/${matchId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Estatísticas</h1>
            <p className="text-xs text-muted-foreground">{match.title}</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1">
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedSet === 0 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSet(0)}
          >
            Total
          </Button>
          {[1, 2, 3, 4, 5].map((set) => (
            <Button
              key={set}
              variant={selectedSet === set ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSet(set)}
            >
              S{set}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <Button
            variant={selectedSide === 'CASA' ? 'default' : 'outline'}
            onClick={() => setSelectedSide('CASA')}
            className="flex-1"
          >
            {match.home_name}
          </Button>
          <Button
            variant={selectedSide === 'FORA' ? 'default' : 'outline'}
            onClick={() => setSelectedSide('FORA')}
            className="flex-1"
          >
            {match.away_name}
          </Button>
        </div>

        <Tabs defaultValue="players">
          <TabsList className="w-full">
            <TabsTrigger value="players" className="flex-1">Jogadores</TabsTrigger>
            <TabsTrigger value="rotations" className="flex-1">Rotações</TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead className="text-center">Srv</TableHead>
                      <TableHead className="text-center">Att</TableHead>
                      <TableHead className="text-center">Eff%</TableHead>
                      <TableHead className="text-center">Blk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayerStats.map((p) => (
                      <TableRow key={p.playerId}>
                        <TableCell className="font-medium">{p.jerseyNumber}</TableCell>
                        <TableCell>{p.playerName}</TableCell>
                        <TableCell className="text-center">
                          {p.servePoints}/{p.serveAttempts}
                        </TableCell>
                        <TableCell className="text-center">
                          {p.attPoints}/{p.attAttempts}
                        </TableCell>
                        <TableCell className="text-center">
                          {p.attAttempts > 0 ? (p.attEfficiency * 100).toFixed(0) : '-'}%
                        </TableCell>
                        <TableCell className="text-center">{p.blkPoints}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rotations">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rot</TableHead>
                      <TableHead className="text-center">SO%</TableHead>
                      <TableHead className="text-center">Brk%</TableHead>
                      <TableHead className="text-center">+/-</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRotationStats.map((r) => (
                      <TableRow key={r.rotation}>
                        <TableCell className="font-medium">R{r.rotation}</TableCell>
                        <TableCell className="text-center">
                          {r.sideoutAttempts > 0 ? r.sideoutPercent.toFixed(0) : '-'}%
                        </TableCell>
                        <TableCell className="text-center">
                          {r.breakAttempts > 0 ? r.breakPercent.toFixed(0) : '-'}%
                        </TableCell>
                        <TableCell className="text-center">
                          {r.pointsFor - r.pointsAgainst > 0 ? '+' : ''}{r.pointsFor - r.pointsAgainst}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
