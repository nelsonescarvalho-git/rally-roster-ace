import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { useRallyActionsForMatch, useBatchUpdateRallyActions, useAutoFixRallyActions, useComprehensiveAutoFix, useAutoFixServeByRotation, useSyncMissingActions } from '@/hooks/useRallyActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ArrowLeft, 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  Pencil,
  CircleDot,
  Shield,
  Target,
  Swords,
  Square,
  ShieldCheck,
  LayoutList,
  LayoutGrid,
  FileSpreadsheet,
  ChevronDown as DropdownChevron,
  Wand2,
  Loader2,
  Layers
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Rally, Player, MatchPlayer, Side, Reason } from '@/types/volleyball';
import type { RallyActionWithPlayer, RallyActionUpdate } from '@/types/rallyActions';
import { EditRallyModal } from '@/components/EditRallyModal';
import { EditRallyActionsModal, ActionEditState } from '@/components/EditRallyActionsModal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RallySummary } from '@/components/rally/RallySummary';
import { TimelineItem } from '@/components/rally/TimelineItem';
import { RallyActionsTimeline } from '@/components/rally/RallyActionsTimeline';
import { cn } from '@/lib/utils';

type ViewMode = 'compact' | 'timeline' | 'actions';

interface RallyGroupProps {
  rallyNo: number;
  phases: Rally[];
  players: (Player | MatchPlayer)[];
  homeName: string;
  awayName: string;
  onEdit: (rally: Rally) => void;
  scoreBefore?: { home: number; away: number };
  scoreAfter?: { home: number; away: number };
  viewMode: ViewMode;
  /** Actions from rally_actions table (new multi-action format) */
  rallyActions?: Map<string, RallyActionWithPlayer[]>;
}

function RallyGroup({ 
  rallyNo, 
  phases, 
  players, 
  homeName, 
  awayName, 
  onEdit,
  scoreBefore,
  scoreAfter,
  viewMode,
  rallyActions
}: RallyGroupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const sortedPhases = [...phases].sort((a, b) => a.phase - b.phase);
  // Expanded issue detection
  const hasIssue = phases.some(p => 
    // Ataque sem atacante (quando há kill ou código de ataque)
    (p.reason === 'KILL' && !p.a_player_id) ||
    (p.a_code !== null && !p.a_player_id) ||
    // Passe sem distribuidor (quando há destino)
    (p.pass_destination && !p.setter_player_id) ||
    // Receção sem recetor (quando há código)
    (p.r_code !== null && !p.r_player_id)
  );
  
  // Block code consistency check: a_code=1 should have b_code
  const hasBlockInconsistency = phases.some(p => 
    p.a_code === 1 && p.b_code === null
  );
  
  // Partial data detection (player without code or code without player)
  const hasPartialData = phases.some(p =>
    // Defesa com jogador mas sem código
    (p.d_player_id && p.d_code === null) ||
    // Bloco com código mas sem jogadores
    (p.b_code !== null && !p.b1_player_id)
  );
  
  const getPlayer = (id: string | null) => players.find(p => p.id === id);
  
  const renderTimelinePhase = (rally: Rally, isLastPhase: boolean) => {
    const items: JSX.Element[] = [];
    const serveSideName = rally.serve_side === 'CASA' ? homeName : awayName;
    const recvSideName = rally.recv_side === 'CASA' ? homeName : awayName;
    const attackSide = rally.phase % 2 === 1 ? rally.recv_side : rally.serve_side;
    const attackSideName = attackSide === 'CASA' ? homeName : awayName;
    const defSideName = attackSide === 'CASA' ? awayName : homeName;
    
    // Serve
    if (rally.s_player_id || rally.s_code !== null) {
      const sPlayer = getPlayer(rally.s_player_id);
      items.push(
        <TimelineItem
          key={`${rally.id}-serve`}
          icon={CircleDot}
          action="Serviço"
          team={serveSideName.slice(0, 3)}
          teamColor={rally.serve_side === 'CASA' ? 'home' : 'away'}
          playerNumber={sPlayer?.jersey_number}
          playerName={sPlayer?.name}
          code={rally.s_code}
        />
      );
    }
    
    // Reception
    if (rally.r_player_id || rally.r_code !== null) {
      const rPlayer = getPlayer(rally.r_player_id);
      items.push(
        <TimelineItem
          key={`${rally.id}-recv`}
          icon={Shield}
          action="Receção"
          team={recvSideName.slice(0, 3)}
          teamColor={rally.recv_side === 'CASA' ? 'home' : 'away'}
          playerNumber={rPlayer?.jersey_number}
          playerName={rPlayer?.name}
          code={rally.r_code}
        />
      );
    }
    
    // Setter/Pass
    if (rally.setter_player_id || rally.pass_destination) {
      const setterPlayer = getPlayer(rally.setter_player_id);
      const missingDestination = rally.setter_player_id && !rally.pass_destination;
      items.push(
        <TimelineItem
          key={`${rally.id}-set`}
          icon={Target}
          action="Passe"
          team={recvSideName.slice(0, 3)}
          teamColor={rally.recv_side === 'CASA' ? 'home' : 'away'}
          playerNumber={setterPlayer?.jersey_number}
          playerName={setterPlayer?.name}
          code={rally.pass_code}
          extra={missingDestination ? undefined : (rally.pass_destination || undefined)}
          warning={missingDestination ? 'Destino em falta' : undefined}
        />
      );
    }
    
    // Attack
    if (rally.a_player_id || rally.a_code !== null) {
      const aPlayer = getPlayer(rally.a_player_id);
      const isKill = rally.reason === 'KILL';
      items.push(
        <TimelineItem
          key={`${rally.id}-attack`}
          icon={Swords}
          action="Ataque"
          team={attackSideName.slice(0, 3)}
          teamColor={attackSide === 'CASA' ? 'home' : 'away'}
          playerNumber={aPlayer?.jersey_number}
          playerName={aPlayer?.name}
          code={rally.a_code}
          extra={rally.kill_type || undefined}
          highlight={isKill}
        />
      );
    }
    
    // Block
    if (rally.b1_player_id || rally.b_code !== null) {
      const b1Player = getPlayer(rally.b1_player_id);
      const b2Player = getPlayer(rally.b2_player_id);
      const isBlockPartial = rally.b_code !== null && !rally.b1_player_id;
      items.push(
        <TimelineItem
          key={`${rally.id}-block`}
          icon={Square}
          action="Bloco"
          team={defSideName.slice(0, 3)}
          teamColor={attackSide === 'CASA' ? 'away' : 'home'}
          playerNumber={b1Player?.jersey_number}
          playerName={b2Player ? `+#${b2Player.jersey_number}` : undefined}
          code={rally.b_code}
          isPartial={isBlockPartial}
          partialMessage="Jogador(es) em falta"
        />
      );
    }
    
    // Defense
    if (rally.d_player_id || rally.d_code !== null) {
      const dPlayer = getPlayer(rally.d_player_id);
      const isDefensePartial = rally.d_player_id && rally.d_code === null;
      items.push(
        <TimelineItem
          key={`${rally.id}-def`}
          icon={ShieldCheck}
          action="Defesa"
          team={defSideName.slice(0, 3)}
          teamColor={attackSide === 'CASA' ? 'away' : 'home'}
          playerNumber={dPlayer?.jersey_number}
          playerName={dPlayer?.name}
          code={rally.d_code}
          isLast={isLastPhase && !rally.point_won_by}
          isPartial={isDefensePartial}
          partialMessage="Código em falta"
        />
      );
    }
    
    // Mark last item
    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      items[items.length - 1] = { ...lastItem, props: { ...lastItem.props, isLast: isLastPhase } };
    }
    
    return items;
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="cursor-pointer">
          <div className="flex items-center gap-2">
            <div className={cn(
              'flex-shrink-0 transition-transform duration-200',
              isOpen && 'rotate-90'
            )}>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <RallySummary
                rallyNo={rallyNo}
                phases={sortedPhases}
                homeName={homeName}
                awayName={awayName}
                scoreBefore={scoreBefore}
                scoreAfter={scoreAfter}
                hasIssue={hasIssue}
                hasBlockInconsistency={hasBlockInconsistency}
                hasPartialData={hasPartialData}
                isExpanded={isOpen}
              />
            </div>
          </div>
        </div>
      </CollapsibleTrigger>
      
      <CollapsibleContent>
        <div className="ml-6 mt-2 space-y-4">
          {/* Actions View - from rally_actions table */}
          {viewMode === 'actions' && (
            <div className="border rounded-lg bg-card/50 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1">
                    <Layers className="h-3 w-3" />
                    Sequência Detalhada
                  </Badge>
                  {/* Count actions from all phases */}
                  {(() => {
                    const allActions = sortedPhases.flatMap(phase => 
                      rallyActions?.get(phase.id) || []
                    );
                    return allActions.length > 0 ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {allActions.length} ações
                      </Badge>
                    ) : null;
                  })()}
                </div>
              </div>
              <div className="p-4">
                {sortedPhases.map((phase, phaseIdx) => {
                  const actions = rallyActions?.get(phase.id) || [];
                  if (actions.length === 0 && sortedPhases.length > 1) {
                    return (
                      <div key={phase.id} className="mb-4 last:mb-0">
                        <Badge variant="outline" className="text-[10px] mb-2">Fase {phase.phase}</Badge>
                        <div className="text-xs text-muted-foreground italic pl-2">
                          Sem ações detalhadas (dados legados)
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={phase.id} className="mb-4 last:mb-0">
                      {sortedPhases.length > 1 && (
                        <Badge variant="outline" className="text-[10px] mb-2">Fase {phase.phase}</Badge>
                      )}
                      <RallyActionsTimeline
                        actions={actions}
                        homeName={homeName}
                        awayName={awayName}
                      />
                    </div>
                  );
                })}
              </div>
              {/* Outcome for actions view */}
              {sortedPhases[sortedPhases.length - 1]?.point_won_by && (
                <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/20">
                  <span className="text-xs text-muted-foreground">Ponto:</span>
                  <Badge className={cn(
                    'text-xs',
                    sortedPhases[sortedPhases.length - 1].point_won_by === 'CASA' 
                      ? 'bg-home text-home-foreground' 
                      : 'bg-away text-away-foreground'
                  )}>
                    {sortedPhases[sortedPhases.length - 1].point_won_by === 'CASA' ? homeName : awayName}
                  </Badge>
                  {sortedPhases[sortedPhases.length - 1].reason && (
                    <Badge variant="outline" className="text-[10px]">
                      {sortedPhases[sortedPhases.length - 1].reason}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Phase-based views (timeline and compact) */}
          {(viewMode === 'timeline' || viewMode === 'compact') && sortedPhases.map((phase, phaseIdx) => (
            <div key={phase.id} className="border rounded-lg bg-card/50 overflow-hidden">
              {/* Phase Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    Fase {phase.phase}
                  </Badge>
                  {phase.reason === 'KILL' && !phase.a_player_id && (
                    <Badge variant="destructive" className="text-[10px]">
                      Atacante em falta
                    </Badge>
                  )}
                  {phase.a_code !== null && !phase.a_player_id && phase.reason !== 'KILL' && (
                    <Badge variant="destructive" className="text-[10px]">
                      Atacante em falta
                    </Badge>
                  )}
                  {phase.pass_destination && !phase.setter_player_id && (
                    <Badge variant="outline" className="text-[10px] border-warning text-warning">
                      Distribuidor em falta
                    </Badge>
                  )}
                  {phase.r_code !== null && !phase.r_player_id && (
                    <Badge variant="outline" className="text-[10px] border-muted-foreground">
                      Recetor em falta
                    </Badge>
                  )}
                  {phase.a_code === 3 && !phase.kill_type && (
                    <Badge variant="outline" className="text-[10px] border-warning text-warning">
                      Kill type em falta
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(phase);
                  }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
              </div>
              
              {/* Timeline View */}
              {viewMode === 'timeline' && (
                <div className="p-4">
                  {renderTimelinePhase(phase, phaseIdx === sortedPhases.length - 1)}
                </div>
              )}
              
              {/* Compact View */}
              {viewMode === 'compact' && (
                <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {(phase.s_player_id || phase.s_code !== null) && (
                    <div className="flex items-center gap-1.5 bg-muted/30 rounded px-2 py-1">
                      <CircleDot className="h-3 w-3 text-muted-foreground" />
                      <span>S</span>
                      {getPlayer(phase.s_player_id)?.jersey_number && (
                        <span className="font-mono">#{getPlayer(phase.s_player_id)?.jersey_number}</span>
                      )}
                      {phase.s_code !== null && (
                        <Badge className={cn(
                          'text-[10px] px-1 h-4',
                          phase.s_code === 3 && 'bg-success',
                          phase.s_code === 2 && 'bg-primary',
                          phase.s_code === 1 && 'bg-warning',
                          phase.s_code === 0 && 'bg-destructive'
                        )}>{phase.s_code}</Badge>
                      )}
                    </div>
                  )}
                  {(phase.r_player_id || phase.r_code !== null) && (
                    <div className="flex items-center gap-1.5 bg-muted/30 rounded px-2 py-1">
                      <Shield className="h-3 w-3 text-muted-foreground" />
                      <span>R</span>
                      {getPlayer(phase.r_player_id)?.jersey_number && (
                        <span className="font-mono">#{getPlayer(phase.r_player_id)?.jersey_number}</span>
                      )}
                      {phase.r_code !== null && (
                        <Badge className={cn(
                          'text-[10px] px-1 h-4',
                          phase.r_code === 3 && 'bg-success',
                          phase.r_code === 2 && 'bg-primary',
                          phase.r_code === 1 && 'bg-warning',
                          phase.r_code === 0 && 'bg-destructive'
                        )}>{phase.r_code}</Badge>
                      )}
                    </div>
                  )}
                  {(phase.a_player_id || phase.a_code !== null) && (
                    <div className={cn(
                      'flex items-center gap-1.5 rounded px-2 py-1',
                      phase.reason === 'KILL' && !phase.a_player_id ? 'bg-destructive/10' : 'bg-muted/30'
                    )}>
                      <Swords className="h-3 w-3 text-muted-foreground" />
                      <span>A</span>
                      {getPlayer(phase.a_player_id)?.jersey_number && (
                        <span className="font-mono">#{getPlayer(phase.a_player_id)?.jersey_number}</span>
                      )}
                      {phase.a_code !== null && (
                        <Badge className={cn(
                          'text-[10px] px-1 h-4',
                          phase.a_code === 3 && 'bg-success',
                          phase.a_code === 2 && 'bg-primary',
                          phase.a_code === 1 && 'bg-warning',
                          phase.a_code === 0 && 'bg-destructive'
                        )}>{phase.a_code}</Badge>
                      )}
                    </div>
                  )}
                </div>
              )}
              
              {/* Outcome */}
              {phase.point_won_by && (
                <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/20">
                  <span className="text-xs text-muted-foreground">Ponto:</span>
                  <Badge className={cn(
                    'text-xs',
                    phase.point_won_by === 'CASA' ? 'bg-home text-home-foreground' : 'bg-away text-away-foreground'
                  )}>
                    {phase.point_won_by === 'CASA' ? homeName : awayName}
                  </Badge>
                  {phase.reason && (
                    <Badge variant="outline" className="text-[10px]">{phase.reason}</Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function RallyHistory() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { match, rallies, loading, loadMatch, getEffectivePlayers, updateRally, getRalliesForSet, autoFixMissingPlayerIds, autoFixMissingKillTypes } = useMatch(matchId || null);
  const { data: rallyActionsMap, isLoading: actionsLoading } = useRallyActionsForMatch(matchId || null);
  const batchUpdateActions = useBatchUpdateRallyActions();
  const autoFixRallyActionsMutation = useAutoFixRallyActions();
  const players = getEffectivePlayers();
  const [selectedSet, setSelectedSet] = useState(0);
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const [editingRally, setEditingRally] = useState<Rally | null>(null);
  const [editingRallyActions, setEditingRallyActions] = useState<{
    rallyId: string;
    meta: { set_no: number; rally_no: number; serve_side: Side; recv_side: Side; point_won_by: Side | null; reason: Reason | null };
    actions: RallyActionWithPlayer[];
  } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('actions');
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [isAutoFixingKillTypes, setIsAutoFixingKillTypes] = useState(false);
  const [isAutoFixingActions, setIsAutoFixingActions] = useState(false);
  const [isComprehensiveFix, setIsComprehensiveFix] = useState(false);
  
  const comprehensiveAutoFix = useComprehensiveAutoFix();
  const autoFixServeByRotation = useAutoFixServeByRotation();
  const syncMissingActions = useSyncMissingActions();

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId, loadMatch]);

  // Calculate score progression for each rally
  const scoreProgression = useMemo(() => {
    const scores = new Map<string, { before: { home: number; away: number }; after: { home: number; away: number } }>();
    
    // Get all rallies with outcomes, sorted by set and rally number
    const ralliesWithOutcomes = rallies
      .filter(r => r.point_won_by)
      .sort((a, b) => a.set_no - b.set_no || a.rally_no - b.rally_no);
    
    // Track scores per set
    const setScores = new Map<number, { home: number; away: number }>();
    
    ralliesWithOutcomes.forEach(rally => {
      if (!setScores.has(rally.set_no)) {
        setScores.set(rally.set_no, { home: 0, away: 0 });
      }
      
      const current = setScores.get(rally.set_no)!;
      const before = { ...current };
      
      if (rally.point_won_by === 'CASA') {
        current.home++;
      } else if (rally.point_won_by === 'FORA') {
        current.away++;
      }
      
      const key = `${rally.set_no}-${rally.rally_no}`;
      scores.set(key, { before, after: { ...current } });
    });
    
    return scores;
  }, [rallies]);

  const getPlayerName = (id: string | null) => {
    if (!id) return '';
    const player = players.find(p => p.id === id);
    return player ? `#${player.jersey_number} ${player.name}` : '';
  };

  const exportToExcel = (exportAll: boolean = true) => {
    const dataToExport = exportAll ? rallies : filteredRallies;
    
    if (dataToExport.length === 0) {
      toast.error('Sem dados para exportar');
      return;
    }

    // CSV header
    const headers = [
      'Set', 'Rally', 'Fase', 'Serve Side', 'Serve Rot', 'Recv Side', 'Recv Rot',
      'Servidor', 'S Code', 'Recetor', 'R Code', 
      'Passador', 'Pass Code', 'Pass Dest',
      'Atacante', 'A Code', 'Kill Type',
      'Bloco 1', 'Bloco 2', 'B Code',
      'Defesa', 'D Code',
      'Ponto', 'Razão'
    ];

    const rows = dataToExport.map(r => [
      r.set_no,
      r.rally_no,
      r.phase,
      r.serve_side,
      r.serve_rot,
      r.recv_side,
      r.recv_rot,
      getPlayerName(r.s_player_id),
      r.s_code ?? '',
      getPlayerName(r.r_player_id),
      r.r_code ?? '',
      getPlayerName(r.setter_player_id),
      r.pass_code ?? '',
      r.pass_destination ?? '',
      getPlayerName(r.a_player_id),
      r.a_code ?? '',
      r.kill_type ?? '',
      getPlayerName(r.b1_player_id),
      getPlayerName(r.b2_player_id),
      r.b_code ?? '',
      getPlayerName(r.d_player_id),
      r.d_code ?? '',
      r.point_won_by ?? '',
      r.reason ?? ''
    ]);

    // Build CSV content
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
    ].join('\n');

    // Create filename with set info if filtered
    const setInfo = !exportAll && selectedSet > 0 ? `_set${selectedSet}` : '';
    const filename = `rallies_${match?.title.replace(/\s+/g, '_') || 'match'}${setInfo}.csv`;

    // Create and download file
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Ficheiro exportado com sucesso${!exportAll && selectedSet > 0 ? ` (Set ${selectedSet})` : ''}`);
  };

  if (loading || !match) {
    return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;
  }

  const filteredRallies = selectedSet === 0 ? rallies : getRalliesForSet(selectedSet);

  // Group rallies by set and rally number
  const rallyGroups = new Map<string, Rally[]>();
  filteredRallies.forEach(r => {
    const key = `${r.set_no}-${r.rally_no}`;
    if (!rallyGroups.has(key)) {
      rallyGroups.set(key, []);
    }
    rallyGroups.get(key)!.push(r);
  });

  // Group by set for display
  const setGroups = new Map<number, { rallyNo: number; phases: Rally[] }[]>();
  rallyGroups.forEach((phases) => {
    const setNo = phases[0].set_no;
    const rallyNo = phases[0].rally_no;
    
    if (showOnlyIssues) {
      const hasIssue = phases.some(p => 
        (p.reason === 'KILL' && !p.a_player_id) ||
        (p.a_code !== null && !p.a_player_id) ||
        (p.pass_destination && !p.setter_player_id) ||
        (p.r_code !== null && !p.r_player_id) ||
        (p.a_code === 3 && !p.kill_type)
      );
      if (!hasIssue) return;
    }
    
    if (!setGroups.has(setNo)) {
      setGroups.set(setNo, []);
    }
    setGroups.get(setNo)!.push({ rallyNo, phases });
  });

  // Sort each set's rallies by rally number (descending)
  setGroups.forEach((rallies) => {
    rallies.sort((a, b) => b.rallyNo - a.rallyNo);
  });

  const issueCount = Array.from(rallyGroups.values()).filter(phases => 
    phases.some(p => 
      (p.reason === 'KILL' && !p.a_player_id) ||
      (p.a_code !== null && !p.a_player_id) ||
      (p.pass_destination && !p.setter_player_id) ||
      (p.r_code !== null && !p.r_player_id) ||
      (p.a_code === 3 && !p.kill_type)
    )
  ).length;

  const killTypeIssueCount = rallies.filter(r => r.a_code === 3 && !r.kill_type).length;

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/stats/${matchId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Histórico de Rallies</h1>
            <p className="text-xs text-muted-foreground">{match.title}</p>
          </div>
          
          {/* Auto-fix Buttons */}
          
          {/* Comprehensive Fix (rally_actions table) */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              if (!matchId) return;
              setIsComprehensiveFix(true);
              try {
                // Step 0: Sync missing actions from rallies table
                const syncResult = await syncMissingActions.mutateAsync({ matchId });
                
                // First fix player_id for setters
                const playerFixResult = await autoFixRallyActionsMutation.mutateAsync({
                  matchId,
                  players: players.map(p => ({
                    id: p.id,
                    side: p.side,
                    position: p.position,
                    jersey_number: p.jersey_number
                  }))
                });
                
                // Step 2: Fix serve by rotation
                const serveFixResult = await autoFixServeByRotation.mutateAsync({
                  matchId,
                  players: players.map(p => ({
                    id: p.id,
                    side: p.side,
                    jersey_number: p.jersey_number
                  }))
                });
                
                // Then fix setter codes from attack results
                const codeFixResult = await comprehensiveAutoFix.mutateAsync({ matchId });
                
                const totalFixed = playerFixResult.fixed + codeFixResult.setterCodesFixed + serveFixResult.fixed + syncResult.synced;
                
                if (totalFixed > 0) {
                  const parts = [];
                  if (syncResult.synced > 0) parts.push(`${syncResult.synced} sincronizadas`);
                  if (playerFixResult.fixed > 0) parts.push(`${playerFixResult.fixed} jogadores`);
                  if (serveFixResult.fixed > 0) parts.push(`${serveFixResult.fixed} serviços`);
                  if (codeFixResult.setterCodesFixed > 0) parts.push(`${codeFixResult.setterCodesFixed} códigos`);
                  toast.success(`${totalFixed} correções (${parts.join(', ')})`);
                } else {
                  toast.info('Nenhuma correção necessária');
                }
                
                if (playerFixResult.skipped > 0 || codeFixResult.settersSkipped > 0 || serveFixResult.skipped > 0) {
                  toast.warning(`${playerFixResult.skipped + codeFixResult.settersSkipped + serveFixResult.skipped} ações não inferíveis`);
                }
                
                if (playerFixResult.errors > 0 || codeFixResult.errors > 0 || serveFixResult.errors > 0 || syncResult.errors > 0) {
                  toast.error(`${playerFixResult.errors + codeFixResult.errors + serveFixResult.errors + syncResult.errors} erros durante a correção`);
                }

                // Reload match data
                loadMatch();
              } finally {
                setIsComprehensiveFix(false);
              }
            }}
            disabled={isComprehensiveFix || isAutoFixingActions}
            title="Corrigir automaticamente todas as ações incompletas"
          >
            {isComprehensiveFix ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Fix Tudo</span>
          </Button>
          
          {killTypeIssueCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                setIsAutoFixingKillTypes(true);
                try {
                  const result = await autoFixMissingKillTypes();
                  if (result.fixed > 0) {
                    toast.success(`${result.fixed} kill types corrigidos (→ Chão)`);
                  } else {
                    toast.info('Nenhum kill type pôde ser corrigido');
                  }
                  if (result.errors > 0) {
                    toast.error(`${result.errors} erros durante a correção`);
                  }
                } finally {
                  setIsAutoFixingKillTypes(false);
                }
              }}
              disabled={isAutoFixingKillTypes}
              title={`${killTypeIssueCount} kills sem tipo definido`}
            >
              {isAutoFixingKillTypes ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Target className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Fix Kills</span>
            </Button>
          )}
          
          {issueCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={async () => {
                setIsAutoFixing(true);
                try {
                  const result = await autoFixMissingPlayerIds();
                  if (result.fixed > 0) {
                    toast.success(`${result.fixed} rallies corrigidos automaticamente`);
                  } else {
                    toast.info('Nenhum rally pôde ser corrigido automaticamente');
                  }
                  if (result.errors > 0) {
                    toast.error(`${result.errors} erros durante a correção`);
                  }
                } finally {
                  setIsAutoFixing(false);
                }
              }}
              disabled={isAutoFixing}
            >
              {isAutoFixing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Corrigir Auto</span>
            </Button>
          )}
          
          {/* Export Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                title="Exportar para Excel"
              >
                <FileSpreadsheet className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => exportToExcel(true)}>
                Exportar Tudo
              </DropdownMenuItem>
              {selectedSet > 0 && (
                <DropdownMenuItem onClick={() => exportToExcel(false)}>
                  Exportar Set {selectedSet}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-0.5">
            <Button
              variant={viewMode === 'actions' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('actions')}
              title="Sequência de Ações"
            >
              <Layers className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'timeline' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('timeline')}
              title="Timeline por Fase"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewMode('compact')}
              title="Vista Compacta"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Set Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedSet === 0 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSet(0)}
          >
            Todos
          </Button>
          {[1, 2, 3, 4, 5].map((set) => (
            <Button
              key={set}
              variant={selectedSet === set ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSet(set)}
            >
              Set {set}
            </Button>
          ))}
        </div>

        {/* Issues Filter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="issues-filter"
              checked={showOnlyIssues}
              onCheckedChange={setShowOnlyIssues}
            />
            <Label htmlFor="issues-filter" className="text-sm cursor-pointer flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Apenas com problemas
            </Label>
          </div>
          {issueCount > 0 && (
            <Badge variant="destructive">{issueCount}</Badge>
          )}
        </div>

        {/* Rally Groups by Set */}
        <div className="space-y-4">
          {Array.from(setGroups.entries())
            .sort(([a], [b]) => a - b)
            .map(([setNo, rallyList]) => (
              <Card key={setNo} className="overflow-hidden">
                <CardHeader className="py-3 bg-muted/30">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge className="bg-primary">Set {setNo}</Badge>
                    <span className="text-muted-foreground font-normal text-xs">
                      {rallyList.length} rallies
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {rallyList.map(({ rallyNo, phases }) => {
                    const scoreKey = `${setNo}-${rallyNo}`;
                    const scores = scoreProgression.get(scoreKey);
                    
                    return (
                      <RallyGroup
                        key={`${setNo}-${rallyNo}`}
                        rallyNo={rallyNo}
                        phases={phases}
                        players={players}
                        homeName={match.home_name}
                        awayName={match.away_name}
                        onEdit={(rally) => {
                          // Check if this rally has detailed actions
                          const actions = rallyActionsMap?.get(rally.id) || [];
                          if (actions.length > 0) {
                            // Use new actions-based modal
                            setEditingRallyActions({
                              rallyId: rally.id,
                              meta: {
                                set_no: rally.set_no,
                                rally_no: rally.rally_no,
                                serve_side: rally.serve_side,
                                recv_side: rally.recv_side,
                                point_won_by: rally.point_won_by,
                                reason: rally.reason,
                              },
                              actions,
                            });
                          } else {
                            // Fallback to legacy modal
                            setEditingRally(rally);
                          }
                        }}
                        scoreBefore={scores?.before}
                        scoreAfter={scores?.after}
                        viewMode={viewMode}
                        rallyActions={rallyActionsMap}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            ))}

          {setGroups.size === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {showOnlyIssues ? 'Nenhum rally com problemas.' : 'Nenhum rally registado.'}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Legacy Modal for rallies without detailed actions */}
      <EditRallyModal
        open={!!editingRally}
        onOpenChange={(open) => !open && setEditingRally(null)}
        rally={editingRally}
        players={players}
        onSave={updateRally}
        homeName={match.home_name}
        awayName={match.away_name}
      />

      {/* New Modal for rallies with detailed actions */}
      <EditRallyActionsModal
        open={!!editingRallyActions}
        onOpenChange={(open) => !open && setEditingRallyActions(null)}
        rallyId={editingRallyActions?.rallyId || ''}
        rallyMeta={editingRallyActions?.meta || { set_no: 0, rally_no: 0, serve_side: 'CASA', recv_side: 'FORA', point_won_by: null, reason: null }}
        actions={editingRallyActions?.actions || []}
        players={players}
        homeName={match.home_name}
        awayName={match.away_name}
        onSave={async (rallyId, actions, metaUpdates) => {
          try {
            // Build action updates
            const actionUpdates = actions.map(a => ({
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
              } as RallyActionUpdate,
            }));

            await batchUpdateActions.mutateAsync({
              rallyId,
              actions: actionUpdates,
              metaUpdates,
            });

            toast.success('Rally atualizado com sucesso');
            loadMatch(); // Refresh data
            return true;
          } catch (error) {
            console.error('Error saving rally actions:', error);
            toast.error('Erro ao guardar alterações');
            return false;
          }
        }}
      />
    </div>
  );
}
