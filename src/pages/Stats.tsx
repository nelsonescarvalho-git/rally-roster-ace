import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useMatch } from '@/hooks/useMatch';
import { useStats } from '@/hooks/useStats';
import { useServeTypeStats } from '@/hooks/useServeTypeStats';
import { useRallyActionsForMatch, useAutoFixRallyActions, useComprehensiveAutoFix, useAutoFixServeByRotation, useSyncMissingActions } from '@/hooks/useRallyActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, AlertTriangle, Pencil, HelpCircle, ChevronDown, RefreshCw, Wand2, Loader2 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Side, Rally, Reason } from '@/types/volleyball';
import { DistributionTab } from '@/components/DistributionTab';
import { AttackTab } from '@/components/AttackTab';
import { EditRallyModal } from '@/components/EditRallyModal';
import { EditRallyActionsModal, ActionEditState } from '@/components/EditRallyActionsModal';
import { useBatchUpdateRallyActions } from '@/hooks/useRallyActions';
import type { RallyActionWithPlayer, RallyActionUpdate } from '@/types/rallyActions';
import { StatCell, STAT_THRESHOLDS } from '@/components/ui/StatCell';
import { ServeTypeStatsCard } from '@/components/ServeTypeStatsCard';
import { toast } from 'sonner';

export default function Stats() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { match, rallies, loading, loadMatch, getRalliesForSet, getEffectivePlayers, updateRally } = useMatch(matchId || null);
  const { data: rallyActionsMap } = useRallyActionsForMatch(matchId || null);
  const effectivePlayers = getEffectivePlayers();
  const [selectedSet, setSelectedSet] = useState(0); // 0 = all
  const [selectedSide, setSelectedSide] = useState<Side>('CASA');
  const [editingRally, setEditingRally] = useState<Rally | null>(null);
  const [editingRallyActions, setEditingRallyActions] = useState<{
    rallyId: string;
    meta: { set_no: number; rally_no: number; serve_side: Side; recv_side: Side; point_won_by: Side | null; reason: Reason | null };
    actions: RallyActionWithPlayer[];
  } | null>(null);
  const [isComprehensiveFix, setIsComprehensiveFix] = useState(false);
  
  const autoFixRallyActions = useAutoFixRallyActions();
  const comprehensiveAutoFix = useComprehensiveAutoFix();
  const autoFixServeByRotation = useAutoFixServeByRotation();
  const syncMissingActions = useSyncMissingActions();
  const batchUpdateActions = useBatchUpdateRallyActions();

  const handleRecalculate = async () => {
    // Invalidate all queries related to this match
    await queryClient.invalidateQueries({ queryKey: ['rallies', matchId] });
    await queryClient.invalidateQueries({ queryKey: ['match', matchId] });
    await queryClient.invalidateQueries({ queryKey: ['attackStats', matchId] });
    await queryClient.invalidateQueries({ queryKey: ['distributionStats', matchId] });
    // Also refetch match data directly (useMatch uses local state, not React Query)
    await loadMatch();
    toast.success('Estatísticas recalculadas');
  };

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId, loadMatch]);

  // Keyboard shortcuts for set/side selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      if (['1','2','3','4','5'].includes(key)) { e.preventDefault(); setSelectedSet(parseInt(key)); return; }
      if (key === '0' || key === 't') { e.preventDefault(); setSelectedSet(0); return; }
      if (key === 'h') { e.preventDefault(); setSelectedSide('CASA'); return; }
      if (key === 'a') { e.preventDefault(); setSelectedSide('FORA'); return; }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredRallies = selectedSet === 0 ? rallies : getRalliesForSet(selectedSet);
  const { playerStats, rotationStats } = useStats(filteredRallies, effectivePlayers);
  const serveTypeStats = useServeTypeStats(filteredRallies);
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            disabled={isComprehensiveFix}
            onClick={async () => {
              setIsComprehensiveFix(true);
              try {
                // Step 0: Sync missing actions from rallies table
                const syncResult = await syncMissingActions.mutateAsync({
                  matchId: matchId!
                });
                
                // Step 1: Fix player IDs (existing logic)
                const playerResult = await autoFixRallyActions.mutateAsync({
                  matchId: matchId!,
                  players: effectivePlayers
                });
                
                // Step 2: Fix serve by rotation
                const serveResult = await autoFixServeByRotation.mutateAsync({
                  matchId: matchId!,
                  players: effectivePlayers
                });
                
                // Step 3: Infer codes from attacks (new logic)
                const codeResult = await comprehensiveAutoFix.mutateAsync({
                  matchId: matchId!
                });
                
                const totalFixed = playerResult.fixed + codeResult.setterCodesFixed + serveResult.fixed + syncResult.synced;
                
                if (totalFixed > 0) {
                  const parts = [];
                  if (syncResult.synced > 0) parts.push(`${syncResult.synced} ações sincronizadas`);
                  if (playerResult.fixed > 0) parts.push(`${playerResult.fixed} jogadores`);
                  if (serveResult.fixed > 0) parts.push(`${serveResult.fixed} serviços`);
                  if (codeResult.setterCodesFixed > 0) parts.push(`${codeResult.setterCodesFixed} códigos`);
                  toast.success(`Corrigido: ${parts.join(', ')}`);
                  await handleRecalculate();
                } else {
                  toast.info('Sem dados para corrigir automaticamente');
                }
                
                if (codeResult.settersSkipped > 0) {
                  toast.warning(`${codeResult.settersSkipped} setters sem attack subsequente`);
                }
              } catch (error) {
                console.error('Comprehensive auto-fix error:', error);
                toast.error('Erro ao corrigir dados');
              } finally {
                setIsComprehensiveFix(false);
              }
            }}
          >
            {isComprehensiveFix ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Fix Tudo
          </Button>
          <Button variant="outline" size="sm" onClick={handleRecalculate} className="gap-1">
            <RefreshCw className="h-4 w-4" />
            Recalcular
          </Button>
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
            title="Tecla: 0 ou T"
          >
            Total
          </Button>
          {[1, 2, 3, 4, 5].map((set) => (
            <Button
              key={set}
              variant={selectedSet === set ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSet(set)}
              title={`Tecla: ${set}`}
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
            title="Tecla: H"
          >
            {match.home_name}
          </Button>
          <Button
            variant={selectedSide === 'FORA' ? 'default' : 'outline'}
            onClick={() => setSelectedSide('FORA')}
            className="flex-1"
            title="Tecla: A"
          >
            {match.away_name}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">Atalhos: 0-5 sets · H casa · A fora</p>

        <Tabs defaultValue="players">
          <TabsList className="w-full grid grid-cols-6">
            <TabsTrigger value="players">Jogadores</TabsTrigger>
            <TabsTrigger value="rotations">Rotações</TabsTrigger>
            <TabsTrigger value="serve">Serviço</TabsTrigger>
            <TabsTrigger value="rallies">Rallies</TabsTrigger>
            <TabsTrigger value="attack">Ataque</TabsTrigger>
            <TabsTrigger value="distribution">Dist.</TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead className="min-w-[80px]">Nome</TableHead>
                      <TableHead className="text-center">Serviço</TableHead>
                      <TableHead className="text-center">Receção</TableHead>
                      <TableHead className="text-center">Ataque</TableHead>
                      <TableHead className="text-center">Bloco</TableHead>
                      <TableHead className="text-center">Defesa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlayerStats.map((p) => (
                      <TableRow key={p.playerId}>
                        <TableCell className="font-medium">{p.jerseyNumber}</TableCell>
                        <TableCell className="text-sm truncate max-w-[100px]">{p.playerName}</TableCell>
                        <TableCell className="text-center">
                          <StatCell
                            success={p.servePoints}
                            total={p.serveAttempts}
                            errors={p.serveErrors}
                            efficiency={p.serveEfficiency * 100}
                            thresholds={STAT_THRESHOLDS.serve}
                            tooltipContent={
                              <div>
                                <div>Aces: {p.servePoints}</div>
                                <div>Erros: {p.serveErrors}</div>
                                <div>Neutros: {p.serveAttempts - p.servePoints - p.serveErrors}</div>
                              </div>
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <StatCell
                            success={p.recAttempts - p.recErrors}
                            total={p.recAttempts}
                            errors={p.recErrors}
                            efficiency={p.recEfficiency * 100}
                            thresholds={STAT_THRESHOLDS.reception}
                            tooltipContent={
                              <div>
                                <div>Positivas: {p.recAttempts - p.recErrors}</div>
                                <div>Erros: {p.recErrors}</div>
                              </div>
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <StatCell
                            success={p.attPoints}
                            total={p.attAttempts}
                            errors={p.attErrors}
                            efficiency={p.attEfficiency * 100}
                            thresholds={STAT_THRESHOLDS.attack}
                            tooltipContent={
                              <div>
                                <div>Kills: {p.attPoints}</div>
                                <div>Erros: {p.attErrors}</div>
                                <div>Bloqueados: {p.attBlocked || 0}</div>
                              </div>
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <StatCell
                            success={p.blkPoints}
                            total={p.blkAttempts}
                            efficiency={p.blkEfficiency * 100}
                            thresholds={STAT_THRESHOLDS.block}
                            tooltipContent={
                              <div>
                                <div>Pontos: {p.blkPoints}</div>
                                <div>Participações: {p.blkAttempts}</div>
                              </div>
                            }
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <StatCell
                            success={p.defAttempts - p.defErrors}
                            total={p.defAttempts}
                            errors={p.defErrors}
                            efficiency={p.defEfficiency * 100}
                            thresholds={STAT_THRESHOLDS.defense}
                            tooltipContent={
                              <div>
                                <div>Boas: {p.defAttempts - p.defErrors}</div>
                                <div>Erros: {p.defErrors}</div>
                              </div>
                            }
                          />
                        </TableCell>
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

          <TabsContent value="serve">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground text-center">
                Eficácia por tipo de serviço: ACE% = aces/total, Erro% = erros/total, Efic. = (aces-erros)/total
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ServeTypeStatsCard 
                  stats={serveTypeStats.home} 
                  teamName={match.home_name}
                  teamSide="home"
                />
                <ServeTypeStatsCard 
                  stats={serveTypeStats.away} 
                  teamName={match.away_name}
                  teamSide="away"
                />
              </div>
            </div>
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
                      {/* Legenda Compacta */}
                      <Collapsible className="mb-4">
                        <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                          <HelpCircle className="h-4 w-4" />
                          Legenda dos códigos
                          <ChevronDown className="h-4 w-4" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Qualidade */}
                            <div>
                              <h4 className="font-semibold mb-1.5">Qualidade (Q)</h4>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">Q0</Badge> Fraco - ataque muito difícil</div>
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">Q1</Badge> Razoável - opções limitadas</div>
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">Q2</Badge> Bom - várias opções</div>
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">Q3</Badge> Perfeito - todas as opções</div>
                              </div>
                            </div>

                            {/* Ataque */}
                            <div>
                              <h4 className="font-semibold mb-1.5">Ataque</h4>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">0</Badge> Erro</div>
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">1</Badge> Tocou bloco (ver b_code)</div>
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">2</Badge> Defendido</div>
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">3</Badge> Kill (ponto direto)</div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                <div className="flex items-center gap-1.5"><Badge className="text-[10px] px-1 bg-primary/80">FLOOR</Badge> Chão direto</div>
                                <div className="flex items-center gap-1.5"><Badge className="text-[10px] px-1 bg-primary/80">BLOCKOUT</Badge> Mão-fora</div>
                              </div>
                            </div>

                            {/* Bloco */}
                            <div>
                              <h4 className="font-semibold mb-1.5">Bloco</h4>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">Falta</Badge> Falta do bloco (0)</div>
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">Ofens</Badge> Ofensivo - bola jogável adversário (1)</div>
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">Def</Badge> Defensivo - bola nossa (2)</div>
                                <div className="flex items-center gap-1.5"><Badge variant="outline" className="text-[10px] px-1">Ponto</Badge> Stuff block (3)</div>
                              </div>
                            </div>
                          </div>

                          {/* Zonas */}
                          <div className="pt-3 border-t border-border/50">
                            <h4 className="font-semibold mb-1.5">Zonas de Destino</h4>
                            <div className="flex flex-wrap gap-3">
                              <span className="flex items-center gap-1"><Badge variant="secondary" className="text-[10px] px-1">Z1</Badge> Ponta direita</span>
                              <span className="flex items-center gap-1"><Badge variant="secondary" className="text-[10px] px-1">Z2</Badge> Central direita</span>
                              <span className="flex items-center gap-1"><Badge variant="secondary" className="text-[10px] px-1">Z3</Badge> Ponta esquerda</span>
                              <span className="flex items-center gap-1"><Badge variant="secondary" className="text-[10px] px-1">Z4</Badge> Oposto</span>
                              <span className="flex items-center gap-1"><Badge variant="secondary" className="text-[10px] px-1">Z5</Badge> Pipe</span>
                              <span className="flex items-center gap-1"><Badge variant="secondary" className="text-[10px] px-1">Z6</Badge> Back-row</span>
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {(() => {
                        // Get rallies with issues (KILL without attacker, setter without destination, block touched without result)
                        const killsWithoutAttacker = filteredRallies.filter(r => r.reason === 'KILL' && !r.a_player_id).length;
                        const setterWithoutDest = filteredRallies.filter(r => r.setter_player_id && !r.pass_destination).length;
                        const blockWithoutResult = filteredRallies.filter(r => r.a_code === 1 && r.b_code === null).length;
                        
                        // NEW: Partial data counters
                        const defenseWithoutCode = filteredRallies.filter(r => 
                          r.d_player_id && r.d_code === null
                        ).length;
                        const blockWithoutPlayer = filteredRallies.filter(r => 
                          r.b_code !== null && !r.b1_player_id
                        ).length;
                        
                        const totalIssues = killsWithoutAttacker + setterWithoutDest + blockWithoutResult + defenseWithoutCode + blockWithoutPlayer;
                        
                        if (totalIssues === 0) return null;
                        
                        const messages: string[] = [];
                        if (killsWithoutAttacker > 0) messages.push(`${killsWithoutAttacker} kill(s) sem atacante`);
                        if (setterWithoutDest > 0) messages.push(`${setterWithoutDest} passe(s) sem destino`);
                        if (blockWithoutResult > 0) messages.push(`${blockWithoutResult} bloco(s) sem resultado (b_code)`);
                        if (defenseWithoutCode > 0) messages.push(`${defenseWithoutCode} defesa(s) sem código`);
                        if (blockWithoutPlayer > 0) messages.push(`${blockWithoutPlayer} bloco(s) sem jogador`);
                        
                        return (
                          <div className="p-3 bg-destructive/10 border-b border-destructive/20 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                            <span className="text-sm text-destructive">
                              {messages.join(' • ')}
                            </span>
                          </div>
                        );
                      })()}
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
                            const hasPartialData = (r.d_player_id && r.d_code === null) ||
                              (r.b_code !== null && !r.b1_player_id);
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
                                className={hasIssue ? 'bg-destructive/5' : hasPartialData ? 'bg-warning/5' : ''}
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
                                    onClick={() => {
                                      const actions = rallyActionsMap?.get(r.id) || [];
                                      if (actions.length > 0) {
                                        setEditingRallyActions({
                                          rallyId: r.id,
                                          meta: { 
                                            set_no: r.set_no, 
                                            rally_no: r.rally_no, 
                                            serve_side: r.serve_side, 
                                            recv_side: r.recv_side, 
                                            point_won_by: r.point_won_by, 
                                            reason: r.reason 
                                          },
                                          actions,
                                        });
                                      } else {
                                        setEditingRally(r);
                                      }
                                    }}
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
              rallyActionsMap={rallyActionsMap}
              players={effectivePlayers}
              match={match}
              selectedSet={selectedSet}
              getRalliesForSet={getRalliesForSet}
            />
          </TabsContent>
        </Tabs>

        {/* Modal for detailed rally actions (new format) */}
        <EditRallyActionsModal
          open={!!editingRallyActions}
          onOpenChange={(open) => !open && setEditingRallyActions(null)}
          rallyId={editingRallyActions?.rallyId || ''}
          rallyMeta={editingRallyActions?.meta || { set_no: 1, rally_no: 1, serve_side: 'CASA', recv_side: 'FORA', point_won_by: null, reason: null }}
          actions={editingRallyActions?.actions || []}
          players={effectivePlayers}
          homeName={match.home_name}
          awayName={match.away_name}
          onSave={async (rallyId, actions, metaUpdates) => {
            try {
              const updates = actions.map(a => ({
                id: a.id,
                updates: {
                  player_id: a.player_id,
                  player_no: a.player_no,
                  code: a.code,
                  pass_destination: a.pass_destination,
                  pass_code: a.pass_code,
                  kill_type: a.kill_type,
                  serve_type: a.serve_type,
                  b2_player_id: a.b2_player_id,
                  b2_no: a.b2_no,
                  b3_player_id: a.b3_player_id,
                  b3_no: a.b3_no,
                } as RallyActionUpdate
              }));
              
              await batchUpdateActions.mutateAsync({ 
                rallyId, 
                actions: updates, 
                metaUpdates: {
                  point_won_by: metaUpdates.point_won_by,
                  reason: metaUpdates.reason,
                }
              });
              
              toast.success('Rally atualizado');
              await handleRecalculate();
              return true;
            } catch (error) {
              console.error('Error saving rally actions:', error);
              toast.error('Erro ao guardar');
              return false;
            }
          }}
        />

        {/* Legacy modal for rallies without detailed actions */}
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
