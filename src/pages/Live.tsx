import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart2, Undo2, Settings, Trophy, Lock, Check, Swords } from 'lucide-react';
import { WizardStepHelp } from '@/components/WizardStepHelp';
import { WizardLegend } from '@/components/WizardLegend';
import { RecentPlays } from '@/components/RecentPlays';
import { SubstitutionModal } from '@/components/SubstitutionModal';
import { RallyTimeline } from '@/components/live/RallyTimeline';
import { ActionSelector } from '@/components/live/ActionSelector';
import { ActionEditor } from '@/components/live/ActionEditor';
import { PointFinisher } from '@/components/live/PointFinisher';
import { 
  Side, 
  Reason, 
  Player, 
  Rally, 
  PassDestination, 
  KillType,
  RallyAction,
  RallyActionType 
} from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Wizard mode: 'fixed' uses S->R flow, 'modular' allows flexible action selection
type WizardMode = 'fixed' | 'modular';

interface PendingAction {
  type: RallyActionType;
  side: Side;
  // Temporary values while editing
  playerId: string | null;
  code: number | null;
  killType: KillType | null;
  setterId: string | null;
  passDestination: PassDestination | null;
  passCode: number | null;
  b1PlayerId: string | null;
  b2PlayerId: string | null;
  b3PlayerId: string | null;
}

export default function Live() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    match, rallies, lineups, loading, loadMatch, getGameState, getServerPlayer, 
    saveRally, deleteLastRally, getPlayersForSide, getEffectivePlayers, 
    isSetComplete, getMatchStatus,
    getSubstitutionsForSet, getSubstitutionsUsed, getPlayersOnCourt, getPlayersOnBench, makeSubstitution, undoSubstitution,
    setFifthSetServe, needsFifthSetServeChoice
  } = useMatch(matchId || null);

  const [currentSet, setCurrentSet] = useState(1);
  const [detailedMode, setDetailedMode] = useState(false);
  const [subModalSide, setSubModalSide] = useState<Side | null>(null);
  const [showSet5ServeModal, setShowSet5ServeModal] = useState(false);
  
  // Modular wizard state
  const [registeredActions, setRegisteredActions] = useState<RallyAction[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [currentPhase, setCurrentPhase] = useState(1);
  
  // Fixed mode state for serve/reception
  const [serveCompleted, setServeCompleted] = useState(false);
  const [receptionCompleted, setReceptionCompleted] = useState(false);
  const [serveData, setServeData] = useState<{ playerId: string | null; code: number | null }>({ playerId: null, code: null });
  const [receptionData, setReceptionData] = useState<{ playerId: string | null; code: number | null }>({ playerId: null, code: null });

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId, loadMatch]);

  useEffect(() => {
    if (currentSet === 5 && needsFifthSetServeChoice(5)) {
      setShowSet5ServeModal(true);
    }
  }, [currentSet, needsFifthSetServeChoice]);

  const handleSet5ServeChoice = async (side: Side) => {
    await setFifthSetServe(side);
    setShowSet5ServeModal(false);
    toast({
      title: 'Serviço definido',
      description: `${side === 'CASA' ? match?.home_name : match?.away_name} serve primeiro no 5º set`
    });
  };

  const gameState = getGameState(currentSet);
  const serverPlayer = gameState ? getServerPlayer(currentSet, gameState.serveSide, gameState.serveRot) : null;

  // Pre-fill server when wizard starts
  useEffect(() => {
    if (serverPlayer && !serveData.playerId && !serveCompleted) {
      setServeData(prev => ({ ...prev, playerId: serverPlayer.id }));
    }
  }, [serverPlayer, serveData.playerId, serveCompleted]);

  const resetWizard = useCallback(() => {
    setRegisteredActions([]);
    setPendingAction(null);
    setCurrentPhase(1);
    setServeCompleted(false);
    setReceptionCompleted(false);
    setServeData({ playerId: serverPlayer?.id || null, code: null });
    setReceptionData({ playerId: null, code: null });
  }, [serverPlayer?.id]);

  // Compute players for each side
  const servePlayers = gameState ? getPlayersForSide(gameState.serveSide) : [];
  const recvPlayers = gameState ? getPlayersForSide(gameState.recvSide) : [];

  // Helper to get unique players
  const uniquePlayers = (players: Player[]): Player[] => {
    const seen = new Set<string>();
    return players.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  };

  // Get players for a specific side
  const getPlayersForActionSide = (side: Side): Player[] => {
    return uniquePlayers(getPlayersForSide(side));
  };

  // Get the effective reception code for setter destination filtering
  const getEffectiveReceptionCode = (): number | null => {
    // First check reception data
    if (receptionData.code !== null) return receptionData.code;
    
    // Then check last defense action in current phase for quality
    const lastDefense = [...registeredActions]
      .filter(a => a.phase === currentPhase && a.type === 'defense')
      .pop();
    if (lastDefense?.code !== null && lastDefense?.code !== undefined) {
      return lastDefense.code;
    }
    
    return null;
  };

  // Compute auto outcome based on registered actions and serve/reception
  const autoOutcome = useMemo((): { winner: Side; reason: Reason } | null => {
    if (!gameState) return null;
    const effectivePlayers = getEffectivePlayers();
    
    // Check serve outcomes
    if (serveData.code === 3) {
      return { winner: gameState.serveSide, reason: 'ACE' };
    }
    if (serveData.code === 0) {
      return { winner: gameState.recvSide, reason: 'SE' };
    }
    if (receptionData.code === 0) {
      return { winner: gameState.serveSide, reason: 'ACE' };
    }

    // Check registered actions for outcomes
    for (const action of registeredActions) {
      if (action.type === 'attack') {
        if (action.code === 3) {
          return { winner: action.side, reason: 'KILL' };
        }
        if (action.code === 0) {
          const oppSide: Side = action.side === 'CASA' ? 'FORA' : 'CASA';
          return { winner: oppSide, reason: 'AE' };
        }
      }
      if (action.type === 'block') {
        if (action.code === 3) {
          return { winner: action.side, reason: 'BLK' };
        }
        if (action.code === 0) {
          const oppSide: Side = action.side === 'CASA' ? 'FORA' : 'CASA';
          return { winner: oppSide, reason: 'OP' };
        }
      }
      if (action.type === 'defense' && action.code === 0) {
        // Defense failed - find the last attacker
        const lastAttack = [...registeredActions]
          .filter(a => a.type === 'attack')
          .pop();
        if (lastAttack) {
          return { winner: lastAttack.side, reason: 'KILL' };
        }
      }
    }
    
    return null;
  }, [gameState, serveData, receptionData, registeredActions, getEffectivePlayers]);

  // Handle serve completion
  const handleServeComplete = () => {
    if (serveData.code === null) {
      toast({ title: 'Selecione o código do serviço', variant: 'destructive' });
      return;
    }
    if (!serveData.playerId) {
      toast({ title: 'Selecione o servidor', variant: 'destructive' });
      return;
    }
    
    // Add serve action
    const serveAction: RallyAction = {
      type: 'serve',
      side: gameState!.serveSide,
      phase: 1,
      playerId: serveData.playerId,
      code: serveData.code,
    };
    setRegisteredActions([serveAction]);
    setServeCompleted(true);
    
    // If ACE or SE, don't need reception
    if (serveData.code === 3 || serveData.code === 0) {
      // Auto outcome will handle saving
    }
  };

  // Handle reception completion
  const handleReceptionComplete = () => {
    // Add reception action
    const recAction: RallyAction = {
      type: 'reception',
      side: gameState!.recvSide,
      phase: 1,
      playerId: receptionData.playerId,
      code: receptionData.code,
    };
    setRegisteredActions(prev => [...prev, recAction]);
    setReceptionCompleted(true);
  };

  // Handle action selection from ActionSelector
  const handleSelectAction = (type: RallyActionType, side: Side) => {
    setPendingAction({
      type,
      side,
      playerId: null,
      code: null,
      killType: null,
      setterId: null,
      passDestination: null,
      passCode: null,
      b1PlayerId: null,
      b2PlayerId: null,
      b3PlayerId: null,
    });
  };

  // Handle new phase
  const handleNewPhase = () => {
    setCurrentPhase(prev => prev + 1);
  };

  // Confirm pending action
  const handleConfirmAction = () => {
    if (!pendingAction) return;
    
    const effectivePlayers = getEffectivePlayers();
    const player = effectivePlayers.find(p => p.id === pendingAction.playerId);
    
    const newAction: RallyAction = {
      type: pendingAction.type,
      side: pendingAction.side,
      phase: currentPhase,
      playerId: pendingAction.playerId,
      playerNo: player?.jersey_number || null,
      code: pendingAction.code,
      killType: pendingAction.killType,
      setterId: pendingAction.setterId,
      passDestination: pendingAction.passDestination,
      passCode: pendingAction.passCode,
      b1PlayerId: pendingAction.b1PlayerId,
      b2PlayerId: pendingAction.b2PlayerId,
      b3PlayerId: pendingAction.b3PlayerId,
    };
    
    setRegisteredActions(prev => [...prev, newAction]);
    setPendingAction(null);
  };

  // Cancel pending action
  const handleCancelAction = () => {
    setPendingAction(null);
  };

  // Remove action from timeline
  const handleRemoveAction = (index: number) => {
    // Don't allow removing serve if reception is done
    const action = registeredActions[index];
    if (action.type === 'serve' && receptionCompleted) {
      toast({ title: 'Não pode remover o serviço após receção', variant: 'destructive' });
      return;
    }
    if (action.type === 'reception') {
      setReceptionCompleted(false);
      setReceptionData({ playerId: null, code: null });
    }
    if (action.type === 'serve') {
      setServeCompleted(false);
      setReceptionCompleted(false);
      setServeData({ playerId: serverPlayer?.id || null, code: null });
      setReceptionData({ playerId: null, code: null });
    }
    setRegisteredActions(prev => prev.filter((_, i) => i !== index));
  };

  // Finish point
  const handleFinishPoint = async (winner: Side, reason: Reason) => {
    if (!gameState) return;
    
    const effectivePlayers = getEffectivePlayers();
    
    // Find relevant players from actions
    const serveAction = registeredActions.find(a => a.type === 'serve');
    const recAction = registeredActions.find(a => a.type === 'reception');
    const setterAction = registeredActions.find(a => a.type === 'setter');
    const attackAction = registeredActions.find(a => a.type === 'attack');
    const blockAction = registeredActions.find(a => a.type === 'block');
    const defenseAction = registeredActions.find(a => a.type === 'defense');
    
    // Get player numbers
    const getPlayerNo = (id: string | null | undefined) => {
      if (!id) return null;
      const player = effectivePlayers.find(p => p.id === id);
      return player?.jersey_number || null;
    };
    
    const rallyData: Partial<Rally> = {
      match_id: matchId,
      set_no: currentSet,
      rally_no: gameState.currentRally,
      phase: currentPhase,
      serve_side: gameState.serveSide,
      serve_rot: gameState.serveRot,
      recv_side: gameState.recvSide,
      recv_rot: gameState.recvRot,
      point_won_by: winner,
      reason: reason,
      // Serve
      s_player_id: serveAction?.playerId || serveData.playerId,
      s_no: getPlayerNo(serveAction?.playerId || serveData.playerId),
      s_code: serveAction?.code ?? serveData.code,
      // Reception
      r_player_id: recAction?.playerId || receptionData.playerId,
      r_no: getPlayerNo(recAction?.playerId || receptionData.playerId),
      r_code: recAction?.code ?? receptionData.code,
      // Setter
      setter_player_id: setterAction?.setterId || setterAction?.playerId || null,
      pass_destination: setterAction?.passDestination || null,
      pass_code: setterAction?.passCode || null,
      // Attack
      a_player_id: attackAction?.playerId || null,
      a_no: getPlayerNo(attackAction?.playerId),
      a_code: attackAction?.code ?? null,
      kill_type: attackAction?.code === 3 ? attackAction?.killType : null,
      // Block
      b1_player_id: blockAction?.b1PlayerId || blockAction?.playerId || null,
      b1_no: getPlayerNo(blockAction?.b1PlayerId || blockAction?.playerId),
      b2_player_id: blockAction?.b2PlayerId || null,
      b2_no: getPlayerNo(blockAction?.b2PlayerId),
      b3_player_id: blockAction?.b3PlayerId || null,
      b3_no: getPlayerNo(blockAction?.b3PlayerId),
      b_code: blockAction?.code ?? null,
      // Defense
      d_player_id: defenseAction?.playerId || null,
      d_no: getPlayerNo(defenseAction?.playerId),
      d_code: defenseAction?.code ?? null,
    };
    
    const success = await saveRally(rallyData);
    if (success) {
      toast({ title: 'Ponto registado' });
      resetWizard();
    }
  };

  const handleUndo = async () => {
    await deleteLastRally(currentSet);
    resetWizard();
  };

  // Determine current wizard stage
  const isServePhase = !serveCompleted;
  const isReceptionPhase = serveCompleted && !receptionCompleted && !autoOutcome;
  const isModularPhase = serveCompleted && receptionCompleted && !autoOutcome;
  const isTerminalServe = serveData.code === 3 || serveData.code === 0;
  const isTerminalReception = receptionData.code === 0;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;
  }

  if (!match) {
    return <div className="flex min-h-screen items-center justify-center">Jogo não encontrado</div>;
  }

  if (!gameState) {
    const homeLineup = lineups.find(l => l.set_no === currentSet && l.side === 'CASA');
    const awayLineup = lineups.find(l => l.set_no === currentSet && l.side === 'FORA');
    const missingLineups = !homeLineup || !awayLineup;
    
    return (
      <div className="min-h-screen bg-background safe-bottom">
        <header className="sticky top-0 z-10 border-b bg-card px-4 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-sm font-semibold">{match.title}</h1>
            </div>
          </div>
        </header>
        
        <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[60vh]">
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map((set) => {
              const result = isSetComplete(set);
              const isPlayable = set === 1 || isSetComplete(set - 1).complete;
              const isCurrent = currentSet === set;
              
              return (
                <Button
                  key={set}
                  variant={isCurrent ? 'default' : result.complete ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={!isPlayable && !result.complete}
                  onClick={() => { setCurrentSet(set); resetWizard(); }}
                  className="relative min-w-[48px]"
                >
                  {!isPlayable && !result.complete && <Lock className="h-3 w-3 mr-1" />}
                  S{set}
                  {result.complete && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {missingLineups ? (
            <>
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Set {currentSet}</h2>
                <p className="text-muted-foreground">
                  É necessário configurar o lineup para este set.
                </p>
              </div>
              <Button onClick={() => navigate(`/setup/${matchId}?set=${currentSet}`)}>
                <Settings className="h-4 w-4 mr-2" />
                Configurar Lineup do Set {currentSet}
              </Button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground">A carregar dados do set...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold">{match.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Detalhado</span>
            <Switch checked={detailedMode} onCheckedChange={setDetailedMode} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/setup/${matchId}`)}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/stats/${matchId}`)}>
            <BarChart2 className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Set End Overlay */}
      {(() => {
        const setStatus = isSetComplete(currentSet);
        const matchStatus = getMatchStatus();
        
        if (setStatus.complete) {
          return (
            <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4">
              <div className="text-center space-y-6 max-w-md">
                <div className="flex justify-center">
                  <div className="p-4 rounded-full bg-primary/10">
                    <Trophy className="h-12 w-12 text-primary" />
                  </div>
                </div>
                
                <h2 className="text-2xl font-bold">Set {currentSet} Terminado!</h2>
                
                <div className="text-5xl font-bold flex items-center justify-center gap-4">
                  <span className={setStatus.winner === 'CASA' ? 'text-home' : 'text-muted-foreground'}>
                    {setStatus.homeScore}
                  </span>
                  <span className="text-muted-foreground text-3xl">-</span>
                  <span className={setStatus.winner === 'FORA' ? 'text-away' : 'text-muted-foreground'}>
                    {setStatus.awayScore}
                  </span>
                </div>
                
                <p className="text-lg">
                  <span className={setStatus.winner === 'CASA' ? 'text-home font-semibold' : 'text-away font-semibold'}>
                    {setStatus.winner === 'CASA' ? match.home_name : match.away_name}
                  </span>
                  {' '}ganhou o set!
                </p>
                
                <div className="py-4 px-6 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground mb-2">Resultado por Sets</div>
                  <div className="text-3xl font-bold">
                    <span className={matchStatus.setsHome > matchStatus.setsAway ? 'text-home' : ''}>
                      {matchStatus.setsHome}
                    </span>
                    <span className="text-muted-foreground mx-2">-</span>
                    <span className={matchStatus.setsAway > matchStatus.setsHome ? 'text-away' : ''}>
                      {matchStatus.setsAway}
                    </span>
                  </div>
                </div>
                
                {matchStatus.matchComplete ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-xl font-semibold text-primary">
                      <Trophy className="h-6 w-6" />
                      <span>
                        {matchStatus.matchWinner === 'CASA' ? match.home_name : match.away_name} vence o jogo!
                      </span>
                    </div>
                    <Button size="lg" onClick={() => navigate(`/stats/${matchId}`)}>
                      Ver Estatísticas
                    </Button>
                  </div>
                ) : (
                  <Button size="lg" onClick={() => { setCurrentSet(currentSet + 1); resetWizard(); toast({ title: `Set ${currentSet + 1} iniciado` }); }}>
                    Iniciar Set {currentSet + 1}
                  </Button>
                )}
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="p-4 space-y-4">
        {/* Set Selector */}
        <div className="flex gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((set) => {
            const result = isSetComplete(set);
            const matchStatus = getMatchStatus();
            const isPlayable = set === 1 || isSetComplete(set - 1).complete;
            const isNeeded = !matchStatus.matchComplete || set <= matchStatus.setResults.filter(s => s.complete).length;
            const isCurrent = currentSet === set;
            
            if (!isNeeded && !result.complete) return null;
            
            return (
              <Button
                key={set}
                variant={isCurrent ? 'default' : result.complete ? 'secondary' : 'outline'}
                size="sm"
                disabled={!isPlayable}
                onClick={() => { setCurrentSet(set); resetWizard(); }}
                className="relative min-w-[48px]"
              >
                {!isPlayable && !result.complete && <Lock className="h-3 w-3 mr-1" />}
                S{set}
                {result.complete && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        {/* Match Sets Score */}
        {(() => {
          const matchStatus = getMatchStatus();
          return (
            <div className="text-center text-sm text-muted-foreground">
              Sets: <span className={matchStatus.setsHome > matchStatus.setsAway ? 'text-home font-semibold' : ''}>{matchStatus.setsHome}</span>
              {' - '}
              <span className={matchStatus.setsAway > matchStatus.setsHome ? 'text-away font-semibold' : ''}>{matchStatus.setsAway}</span>
            </div>
          );
        })()}

        {/* Score Display */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-stretch">
              {/* Home Team */}
              <div className="flex-1 bg-home/10 border-r border-home/20 p-4 text-center">
                <div className="text-sm font-semibold text-home">{match.home_name}</div>
                <div className="text-5xl font-bold text-home mt-1">{gameState.homeScore}</div>
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {(() => {
                    const homePlayers = getPlayersOnCourt(currentSet, 'CASA', gameState.currentRally);
                    const homeSubsForSet = getSubstitutionsForSet(currentSet, 'CASA');
                    
                    return homePlayers.map(player => {
                      const isLiberoIn = homeSubsForSet.some(
                        s => s.is_libero && s.player_in_id === player.id && s.rally_no <= gameState.currentRally
                      );
                      const isLibero = player.position === 'L' || isLiberoIn;
                      
                      return (
                        <Badge
                          key={player.id}
                          variant="secondary"
                          className={`text-xs ${isLibero ? 'bg-warning text-warning-foreground' : 'bg-home/20 text-home'}`}
                        >
                          #{player.jersey_number}
                          {isLibero && ' L'}
                        </Badge>
                      );
                    });
                  })()}
                </div>
              </div>
              
              {/* Divider */}
              <div className="flex flex-col items-center justify-center px-3 py-2 bg-muted/50">
                <div className="text-lg font-bold text-muted-foreground">—</div>
                <div className="text-[10px] text-muted-foreground text-center leading-tight mt-1">
                  <div>R{gameState.currentRally}</div>
                  {currentPhase > 1 && <div>F{currentPhase}</div>}
                </div>
              </div>
              
              {/* Away Team */}
              <div className="flex-1 bg-away/10 border-l border-away/20 p-4 text-center">
                <div className="text-sm font-semibold text-away">{match.away_name}</div>
                <div className="text-5xl font-bold text-away mt-1">{gameState.awayScore}</div>
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {(() => {
                    const awayPlayers = getPlayersOnCourt(currentSet, 'FORA', gameState.currentRally);
                    const awaySubsForSet = getSubstitutionsForSet(currentSet, 'FORA');
                    
                    return awayPlayers.map(player => {
                      const isLiberoIn = awaySubsForSet.some(
                        s => s.is_libero && s.player_in_id === player.id && s.rally_no <= gameState.currentRally
                      );
                      const isLibero = player.position === 'L' || isLiberoIn;
                      
                      return (
                        <Badge
                          key={player.id}
                          variant="secondary"
                          className={`text-xs ${isLibero ? 'bg-warning text-warning-foreground' : 'bg-away/20 text-away'}`}
                        >
                          #{player.jersey_number}
                          {isLibero && ' L'}
                        </Badge>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            
            {/* Server info bar */}
            <div className="px-4 py-2 bg-muted/30 text-center text-xs text-muted-foreground border-t">
              Serve: <span className={gameState.serveSide === 'CASA' ? 'text-home font-medium' : 'text-away font-medium'}>
                {gameState.serveSide === 'CASA' ? match.home_name : match.away_name}
              </span>
              {' '}(R{gameState.serveRot})
              {serverPlayer && <span className="font-medium"> • #{serverPlayer.jersey_number}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Substitution Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setSubModalSide('CASA')}
          >
            <Badge variant="secondary" className="bg-home/20 text-home">CASA</Badge>
            Substituições ({getSubstitutionsUsed(currentSet, 'CASA')}/6)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setSubModalSide('FORA')}
          >
            <Badge variant="secondary" className="bg-away/20 text-away">FORA</Badge>
            Substituições ({getSubstitutionsUsed(currentSet, 'FORA')}/6)
          </Button>
        </div>

        {/* Recent plays summary */}
        <RecentPlays 
          rallies={rallies} 
          players={getEffectivePlayers()} 
          homeName={match.home_name} 
          awayName={match.away_name}
          currentSet={currentSet}
        />

        {/* Rally Timeline */}
        {registeredActions.length > 0 && (
          <RallyTimeline
            actions={registeredActions}
            players={getEffectivePlayers()}
            onRemoveAction={handleRemoveAction}
            homeName={match.home_name}
            awayName={match.away_name}
          />
        )}

        {/* Wizard Content */}
        <div className="space-y-3">
          {/* SERVE PHASE */}
          {isServePhase && (
            <Card className="border-l-4 border-l-primary overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-primary text-white">
                <span className="font-semibold">Serviço</span>
                <div className="flex-1" />
                <span className="text-xs opacity-80">
                  {gameState.serveSide === 'CASA' ? match.home_name : match.away_name}
                </span>
              </div>
              <CardContent className="p-4 space-y-3">
                <Select
                  value={serveData.playerId || '__none__'}
                  onValueChange={(val) => setServeData(prev => ({ ...prev, playerId: val === '__none__' ? null : val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecionar servidor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {uniquePlayers(servePlayers).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        #{p.jersey_number} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((code) => (
                    <Button
                      key={code}
                      variant={serveData.code === code ? 'default' : 'outline'}
                      className={`h-12 ${serveData.code === code ? (code === 0 ? 'bg-destructive' : code === 3 ? 'bg-success' : 'bg-primary') : ''}`}
                      onClick={() => setServeData(prev => ({ ...prev, code: prev.code === code ? null : code }))}
                    >
                      {code === 0 ? '✕' : code === 1 ? '−' : code === 2 ? '+' : '★'}
                    </Button>
                  ))}
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleServeComplete}
                  disabled={serveData.code === null}
                >
                  {isTerminalServe ? 'Guardar Ponto' : 'Continuar para Receção'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* RECEPTION PHASE */}
          {isReceptionPhase && (
            <Card className="border-l-4 border-l-success overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-success text-white">
                <span className="font-semibold">Receção</span>
                <span className="text-xs opacity-80">(opcional)</span>
                <div className="flex-1" />
                <span className="text-xs opacity-80">
                  {gameState.recvSide === 'CASA' ? match.home_name : match.away_name}
                </span>
              </div>
              <CardContent className="p-4 space-y-3">
                <Select
                  value={receptionData.playerId || '__none__'}
                  onValueChange={(val) => setReceptionData(prev => ({ ...prev, playerId: val === '__none__' ? null : val }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecionar recetor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum</SelectItem>
                    {uniquePlayers(recvPlayers).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        #{p.jersey_number} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((code) => (
                    <Button
                      key={code}
                      variant={receptionData.code === code ? 'default' : 'outline'}
                      className={`h-12 ${receptionData.code === code ? (code === 0 ? 'bg-destructive' : code === 3 ? 'bg-success' : 'bg-primary') : ''}`}
                      onClick={() => setReceptionData(prev => ({ ...prev, code: prev.code === code ? null : code }))}
                    >
                      {code === 0 ? '✕' : code === 1 ? '−' : code === 2 ? '+' : '★'}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={handleReceptionComplete}>
                    Saltar
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleReceptionComplete}
                  >
                    {isTerminalReception ? 'Guardar Ponto (ACE)' : 'Continuar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* MODULAR PHASE - Action Selector */}
          {isModularPhase && !pendingAction && (
            <ActionSelector
              actions={registeredActions}
              currentPhase={currentPhase}
              serveSide={gameState.serveSide}
              recvSide={gameState.recvSide}
              homeName={match.home_name}
              awayName={match.away_name}
              onSelectAction={handleSelectAction}
              onNewPhase={handleNewPhase}
            />
          )}

          {/* MODULAR PHASE - Action Editor */}
          {isModularPhase && pendingAction && (
            <ActionEditor
              actionType={pendingAction.type}
              side={pendingAction.side}
              players={getPlayersForActionSide(pendingAction.side)}
              homeName={match.home_name}
              awayName={match.away_name}
              selectedPlayer={pendingAction.playerId}
              selectedCode={pendingAction.code}
              selectedKillType={pendingAction.killType}
              selectedSetter={pendingAction.setterId}
              selectedDestination={pendingAction.passDestination}
              selectedPassCode={pendingAction.passCode}
              selectedBlocker1={pendingAction.b1PlayerId}
              selectedBlocker2={pendingAction.b2PlayerId}
              selectedBlocker3={pendingAction.b3PlayerId}
              receptionCode={getEffectiveReceptionCode()}
              onPlayerChange={(id) => setPendingAction(prev => prev ? { ...prev, playerId: id } : null)}
              onCodeChange={(code) => setPendingAction(prev => prev ? { ...prev, code } : null)}
              onKillTypeChange={(type) => setPendingAction(prev => prev ? { ...prev, killType: type } : null)}
              onSetterChange={(id) => setPendingAction(prev => prev ? { ...prev, setterId: id } : null)}
              onDestinationChange={(dest) => setPendingAction(prev => prev ? { ...prev, passDestination: dest } : null)}
              onPassCodeChange={(code) => setPendingAction(prev => prev ? { ...prev, passCode: code } : null)}
              onBlocker1Change={(id) => setPendingAction(prev => prev ? { ...prev, b1PlayerId: id } : null)}
              onBlocker2Change={(id) => setPendingAction(prev => prev ? { ...prev, b2PlayerId: id } : null)}
              onBlocker3Change={(id) => setPendingAction(prev => prev ? { ...prev, b3PlayerId: id } : null)}
              onConfirm={handleConfirmAction}
              onCancel={handleCancelAction}
            />
          )}

          {/* Point Finisher - Show when we have an outcome or in modular phase */}
          {(autoOutcome || (isModularPhase && !pendingAction && registeredActions.length > 0)) && (
            <PointFinisher
              actions={registeredActions}
              homeName={match.home_name}
              awayName={match.away_name}
              onFinishPoint={handleFinishPoint}
              suggestedOutcome={autoOutcome}
            />
          )}
        </div>

        {/* Undo Button */}
        {(gameState.currentRally > 1 || registeredActions.length > 0) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Undo2 className="h-4 w-4" />
                {registeredActions.length > 0 ? 'Cancelar Rally' : 'Anular Último Ponto'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {registeredActions.length > 0 ? 'Cancelar rally em curso?' : 'Anular último ponto?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {registeredActions.length > 0 
                    ? 'Esta ação vai apagar todas as ações deste rally e voltar ao início.'
                    : 'Esta ação vai apagar o último ponto registado.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Não</AlertDialogCancel>
                <AlertDialogAction onClick={registeredActions.length > 0 ? resetWizard : handleUndo}>
                  Sim, {registeredActions.length > 0 ? 'cancelar' : 'anular'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Legend for new users */}
        <WizardLegend homeName={match.home_name} awayName={match.away_name} />
      </div>

      {/* Substitution Modal */}
      {subModalSide && gameState && (
        <SubstitutionModal
          open={!!subModalSide}
          onClose={() => setSubModalSide(null)}
          side={subModalSide}
          sideName={subModalSide === 'CASA' ? match.home_name : match.away_name}
          playersOnCourt={getPlayersOnCourt(currentSet, subModalSide, gameState.currentRally)}
          playersOnBench={getPlayersOnBench(currentSet, subModalSide, gameState.currentRally)}
          substitutionsUsed={getSubstitutionsUsed(currentSet, subModalSide)}
          maxSubstitutions={6}
          onSubstitute={async (playerOutId, playerInId, isLibero) => {
            await makeSubstitution(currentSet, subModalSide, gameState.currentRally, playerOutId, playerInId, isLibero);
          }}
          recentSubstitutions={getSubstitutionsForSet(currentSet, subModalSide)}
          onUndoSubstitution={undoSubstitution}
        />
      )}

      {/* 5th Set Serve Choice Modal */}
      <AlertDialog open={showSet5ServeModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl">🏐 Sorteio do 5º Set</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Qual equipa ganhou o sorteio e vai servir primeiro no tie-break?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4 justify-center py-4">
            <Button 
              className="flex-1 h-16 text-lg bg-blue-600 hover:bg-blue-700"
              onClick={() => handleSet5ServeChoice('CASA')}
            >
              {match?.home_name}
            </Button>
            <Button 
              className="flex-1 h-16 text-lg bg-orange-600 hover:bg-orange-700"
              onClick={() => handleSet5ServeChoice('FORA')}
            >
              {match?.away_name}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
