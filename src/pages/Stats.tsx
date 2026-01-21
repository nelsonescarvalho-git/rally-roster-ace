import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { useStats } from '@/hooks/useStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, AlertTriangle, Pencil } from 'lucide-react';
import { Side, Rally } from '@/types/volleyball';
import { DistributionTab } from '@/components/DistributionTab';
import { AttackTab } from '@/components/AttackTab';
import { EditRallyModal } from '@/components/EditRallyModal';

export default function Stats() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { match, rallies, loading, loadMatch, getRalliesForSet, getEffectivePlayers, updateRally } = useMatch(matchId || null);
  const effectivePlayers = getEffectivePlayers();
  const [selectedSet, setSelectedSet] = useState(0); // 0 = all
  const [selectedSide, setSelectedSide] = useState<Side>('CASA');
  const [editingRally, setEditingRally] = useState<Rally | null>(null);

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
          <Button variant="outline" size="sm" onClick={() => navigate(`/history/${matchId}`)} className="gap-1">
            Histórico
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
            <TabsTrigger value="rallies" className="flex-1">Rallies</TabsTrigger>
            <TabsTrigger value="attack" className="flex-1">Ataque</TabsTrigger>
            <TabsTrigger value="distribution" className="flex-1">Dist.</TabsTrigger>
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

          <TabsContent value="rallies">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                {(() => {
                  // Get rallies with issues (KILL without attacker, setter without destination, block touched without result)
                  const ralliesWithIssues = filteredRallies.filter(r => 
                    (r.reason === 'KILL' && !r.a_player_id) ||
                    (r.setter_player_id && !r.pass_destination) ||
                    (r.a_code === 1 && r.b_code === null)
                  );
                  
                  // Group rallies by rally_no and get final phase
                  const rallyMap = new Map<string, Rally>();
                  filteredRallies.forEach(r => {
                    const key = `${r.set_no}-${r.rally_no}`;
                    const existing = rallyMap.get(key);
                    if (!existing || r.phase > existing.phase) {
                      rallyMap.set(key, r);
                    }
                  });
                  
                  const uniqueRallies = Array.from(rallyMap.values())
                    .sort((a, b) => {
                      if (a.set_no !== b.set_no) return a.set_no - b.set_no;
                      return b.rally_no - a.rally_no;
                    });

                  return (
                    <>
                      {ralliesWithIssues.length > 0 && (
                        <div className="p-3 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-sm text-destructive">
                            {ralliesWithIssues.length} rally(s) com dados em falta (KILL sem atacante)
                          </span>
                        </div>
                      )}
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">Set</TableHead>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Serv</TableHead>
                            <TableHead>Rec</TableHead>
                            <TableHead>Dist</TableHead>
                            <TableHead>Atq</TableHead>
                            <TableHead>Bloco</TableHead>
                            <TableHead>Def</TableHead>
                            <TableHead>Result</TableHead>
                            <TableHead className="w-12"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {uniqueRallies.map((r) => {
                            const hasIssue = (r.reason === 'KILL' && !r.a_player_id) ||
                              (r.setter_player_id && !r.pass_destination) ||
                              (r.a_code === 1 && r.b_code === null);
                            const sPlayer = effectivePlayers.find(p => p.id === r.s_player_id);
                            const rPlayer = effectivePlayers.find(p => p.id === r.r_player_id);
                            const aPlayer = effectivePlayers.find(p => p.id === r.a_player_id);
                            const setterPlayer = effectivePlayers.find(p => p.id === r.setter_player_id);
                            const b1 = effectivePlayers.find(p => p.id === r.b1_player_id);
                            const b2 = effectivePlayers.find(p => p.id === r.b2_player_id);
                            const b3 = effectivePlayers.find(p => p.id === r.b3_player_id);
                            const dPlayer = effectivePlayers.find(p => p.id === r.d_player_id);
                            const blockers = [b1, b2, b3].filter(Boolean);
                            
                            return (
                              <TableRow 
                                key={r.id} 
                                className={hasIssue ? 'bg-destructive/5' : ''}
                              >
                                <TableCell className="font-mono text-xs">S{r.set_no}</TableCell>
                                <TableCell className="font-mono text-xs">#{r.rally_no}</TableCell>
                                <TableCell className="text-xs">
                                  {sPlayer ? `#${sPlayer.jersey_number}` : '-'}
                                  {r.s_code !== null && (
                                    <Badge variant="outline" className="ml-1 text-[10px] px-1">
                                      {r.s_code}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {rPlayer ? `#${rPlayer.jersey_number}` : '-'}
                                  {r.r_code !== null && (
                                    <Badge variant="outline" className="ml-1 text-[10px] px-1">
                                      {r.r_code}
                                    </Badge>
                                  )}
                                </TableCell>
                                {/* Distribuição */}
                                <TableCell className="text-xs">
                                  {setterPlayer || r.pass_destination ? (
                                    <div className="flex flex-col gap-0.5">
                                      {setterPlayer && <span>#{setterPlayer.jersey_number}</span>}
                                      <div className="flex gap-1 flex-wrap">
                                        {r.pass_code !== null && (
                                          <Badge variant="outline" className="text-[10px] px-1">Q{r.pass_code}</Badge>
                                        )}
                                        {r.pass_destination && (
                                          <Badge variant="secondary" className="text-[10px] px-1">{r.pass_destination}</Badge>
                                        )}
                                      </div>
                                    </div>
                                  ) : '-'}
                                </TableCell>
                                {/* Ataque */}
                                <TableCell className="text-xs">
                                  {aPlayer ? (
                                    <div className="flex flex-col gap-0.5">
                                      <span>#{aPlayer.jersey_number}</span>
                                      <div className="flex gap-1 flex-wrap">
                                        {r.a_code !== null && (
                                          <Badge variant="outline" className="text-[10px] px-1">{r.a_code}</Badge>
                                        )}
                                        {r.a_pass_quality !== null && (
                                          <Badge variant="secondary" className="text-[10px] px-1">Q{r.a_pass_quality}</Badge>
                                        )}
                                      </div>
                                      {r.kill_type && (
                                        <Badge className="text-[10px] px-1 bg-primary/80">{r.kill_type}</Badge>
                                      )}
                                    </div>
                                  ) : (r.reason === 'KILL' && !r.a_player_id) ? (
                                    <Badge variant="destructive" className="text-[10px]">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      Falta
                                    </Badge>
                                  ) : '-'}
                                </TableCell>
                                {/* Bloco */}
                                <TableCell className="text-xs">
                                  {blockers.length > 0 || r.b_code !== null ? (
                                    <div className="flex flex-col gap-0.5">
                                      {blockers.length > 0 && (
                                        <span>{blockers.map(b => `#${b!.jersey_number}`).join(', ')}</span>
                                      )}
                                      {r.b_code !== null && (
                                        <Badge variant="outline" className="text-[10px] px-1">
                                          {r.b_code === 0 ? 'Falta' : r.b_code === 1 ? 'Ofens' : r.b_code === 2 ? 'Def' : 'Ponto'}
                                        </Badge>
                                      )}
                                    </div>
                                  ) : '-'}
                                </TableCell>
                                {/* Defesa */}
                                <TableCell className="text-xs">
                                  {dPlayer || r.d_code !== null ? (
                                    <div className="flex items-center gap-1">
                                      {dPlayer && <span>#{dPlayer.jersey_number}</span>}
                                      {r.d_code !== null && (
                                        <Badge variant="outline" className="text-[10px] px-1">{r.d_code}</Badge>
                                      )}
                                    </div>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {r.point_won_by && (
                                    <Badge 
                                      variant={r.point_won_by === 'CASA' ? 'default' : 'secondary'}
                                      className="text-[10px]"
                                    >
                                      {r.point_won_by === 'CASA' ? match.home_name.slice(0, 3) : match.away_name.slice(0, 3)} {r.reason}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setEditingRally(r)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attack">
            <AttackTab
              rallies={rallies}
              players={effectivePlayers}
              match={match}
              selectedSet={selectedSet}
              getRalliesForSet={getRalliesForSet}
            />
          </TabsContent>

          <TabsContent value="distribution">
            <DistributionTab
              rallies={rallies}
              players={effectivePlayers}
              match={match}
              selectedSet={selectedSet}
              getRalliesForSet={getRalliesForSet}
            />
          </TabsContent>
        </Tabs>

        <EditRallyModal
          open={!!editingRally}
          onOpenChange={(open) => !open && setEditingRally(null)}
          rally={editingRally}
          players={effectivePlayers}
          onSave={updateRally}
          homeName={match.home_name}
          awayName={match.away_name}
        />
      </div>
    </div>
  );
}
