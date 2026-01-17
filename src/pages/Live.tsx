import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart2, Undo2, Settings, Plus, ChevronRight, Trophy, Lock, Check, RefreshCw, Swords } from 'lucide-react';
import { WizardStepHelp } from '@/components/WizardStepHelp';
import { WizardLegend } from '@/components/WizardLegend';
import { RecentPlays } from '@/components/RecentPlays';
import { SubstitutionModal } from '@/components/SubstitutionModal';
import { ColoredRatingButton } from '@/components/live/ColoredRatingButton';
import { StepProgressBar } from '@/components/live/StepProgressBar';
import { WizardSectionCard } from '@/components/live/WizardSectionCard';
import { Side, Reason, Player, MatchPlayer, Rally, PassDestination, KillType, POSITIONS_BY_RECEPTION, RECEPTION_LABELS, ATTACK_DIFFICULTY_BY_DISTRIBUTION, DISTRIBUTION_LABELS } from '@/types/volleyball';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

const CODES = [0, 1, 2, 3];
const DESTINATIONS: PassDestination[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK', 'OUTROS'];

type WizardStep = 'serve' | 'reception' | 'setter' | 'attack' | 'block' | 'defense' | 'outcome';

interface RallyDetails {
  s_player_id: string | null;
  s_code: number | null;
  r_player_id: string | null;
  r_code: number | null;
  setter_player_id: string | null;
  pass_destination: PassDestination | null;
  pass_code: number | null;
  a_player_id: string | null;
  a_code: number | null;
  kill_type: KillType | null;
  b1_player_id: string | null;
  b2_player_id: string | null;
  b3_player_id: string | null;
  b_code: number | null;
  d_player_id: string | null;
  d_code: number | null;
}

interface AutoOutcome {
  point_won_by: Side;
  reason: Reason;
}

export default function Live() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    match, rallies, lineups, loading, loadMatch, getGameState, getServerPlayer, 
    saveRally, deleteLastRally, getPlayersForSide, getEffectivePlayers, 
    isSetComplete, getMatchStatus,
    // Substitution functions
    getSubstitutionsForSet, getSubstitutionsUsed, getPlayersOnCourt, getPlayersOnBench, makeSubstitution, undoSubstitution,
    // 5th set serve choice
    setFifthSetServe, needsFifthSetServeChoice
  } = useMatch(matchId || null);

  const [currentSet, setCurrentSet] = useState(1);
  const [currentStep, setCurrentStep] = useState<WizardStep>('serve');
  const [detailedMode, setDetailedMode] = useState(false);
  const [manualOutcome, setManualOutcome] = useState<{ winner: Side | null; reason: Reason | null }>({ winner: null, reason: null });
  const [attackSideOverride, setAttackSideOverride] = useState<Side | null>(null); // Only for phase > 1
  const [suspendPhaseSync, setSuspendPhaseSync] = useState(false); // Temporarily disable phase sync after hard reset
  const [subModalSide, setSubModalSide] = useState<Side | null>(null); // Which side's substitution modal is open
  const [showSet5ServeModal, setShowSet5ServeModal] = useState(false); // 5th set serve choice modal
  
  // Rally details state
  const [rallyDetails, setRallyDetails] = useState<RallyDetails>({
    s_player_id: null,
    s_code: null,
    r_player_id: null,
    r_code: null,
    setter_player_id: null,
    pass_destination: null,
    pass_code: null,
    a_player_id: null,
    a_code: null,
    kill_type: null,
    b1_player_id: null,
    b2_player_id: null,
    b3_player_id: null,
    b_code: null,
    d_player_id: null,
    d_code: null,
  });

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId, loadMatch]);

  // Show 5th set serve choice modal when entering set 5 without a choice made
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
    if (serverPlayer && currentStep === 'serve' && !rallyDetails.s_player_id) {
      setRallyDetails(prev => ({
        ...prev,
        s_player_id: serverPlayer.id,
      }));
    }
  }, [serverPlayer, currentStep, rallyDetails.s_player_id]);

  // Sincronizar currentStep com a fase atual - quando phase > 1, não há serve/reception
  // Skip this sync if suspendPhaseSync is true (after hard reset)
  useEffect(() => {
    if (suspendPhaseSync) {
      // Re-enable sync once we're back to phase 1
      if (gameState && gameState.currentPhase === 1) {
        setSuspendPhaseSync(false);
      }
      return;
    }
    if (gameState && gameState.currentPhase > 1) {
      if (currentStep === 'serve' || currentStep === 'reception') {
        setCurrentStep('setter');
      }
    }
  }, [gameState?.currentPhase, currentStep, suspendPhaseSync]);

  const resetWizard = () => {
    setCurrentStep('serve');
    setManualOutcome({ winner: null, reason: null });
    setAttackSideOverride(null);
    setRallyDetails({
      s_player_id: serverPlayer?.id || null,
      s_code: null,
      r_player_id: null,
      r_code: null,
      setter_player_id: null,
      pass_destination: null,
      pass_code: null,
      a_player_id: null,
      a_code: null,
      kill_type: null,
      b1_player_id: null,
      b2_player_id: null,
      b3_player_id: null,
      b_code: null,
      d_player_id: null,
      d_code: null,
    });
  };

  // Compute sides for each action
  const servePlayers = gameState ? getPlayersForSide(gameState.serveSide) : [];
  const recvPlayers = gameState ? getPlayersForSide(gameState.recvSide) : [];
  
  // Attack side alternates by phase:
  // - Odd phases (1, 3, 5...): recvSide attacks
  // - Even phases (2, 4, 6...): serveSide counter-attacks
  const isLaterPhase = gameState && gameState.currentPhase > 1;
  
  const computeDefaultAttackSide = (): Side => {
    if (!gameState) return 'CASA';
    const phase = gameState.currentPhase;
    // Odd phase = recv attacks, Even phase = serve attacks
    if (phase % 2 === 1) {
      return gameState.recvSide;
    } else {
      return gameState.serveSide;
    }
  };
  
  const defaultAttackSide = computeDefaultAttackSide();
  const attackSide: Side = isLaterPhase && attackSideOverride 
    ? attackSideOverride 
    : defaultAttackSide;
  const defSide: Side = attackSide === 'CASA' ? 'FORA' : 'CASA';
  
  // Compute filtered players - use unique by id
  const attackPlayers = gameState ? getPlayersForSide(attackSide) : [];
  const blockDefPlayers = gameState ? getPlayersForSide(defSide) : [];
  
  // Helper to remove duplicate players by id
  const uniquePlayers = (players: Player[]): Player[] => {
    const seen = new Set<string>();
    return players.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  };

  // Compute auto outcome based on current rally details
  const autoOutcome = useMemo((): AutoOutcome | null => {
    if (!gameState) return null;
    const effectivePlayers = getEffectivePlayers();
    
    // S=3 => ACE
    if (rallyDetails.s_code === 3) {
      return { point_won_by: gameState.serveSide, reason: 'ACE' };
    }
    // S=0 => SE
    if (rallyDetails.s_code === 0) {
      return { point_won_by: gameState.recvSide, reason: 'SE' };
    }
    // R=0 => ACE (reception error = server wins)
    if (rallyDetails.r_code === 0) {
      return { point_won_by: gameState.serveSide, reason: 'ACE' };
    }
    // A=3 => KILL (attacker wins)
    if (rallyDetails.a_code === 3 && rallyDetails.a_player_id) {
      const attacker = effectivePlayers.find(p => p.id === rallyDetails.a_player_id);
      if (attacker) {
        return { point_won_by: attacker.side as Side, reason: 'KILL' };
      }
    }
    // A=0 => AE (opponent wins)
    if (rallyDetails.a_code === 0 && rallyDetails.a_player_id) {
      const attacker = effectivePlayers.find(p => p.id === rallyDetails.a_player_id);
      if (attacker) {
        const oppSide: Side = attacker.side === 'CASA' ? 'FORA' : 'CASA';
        return { point_won_by: oppSide, reason: 'AE' };
      }
    }
    // B=3 => BLK
    if (rallyDetails.b_code === 3 && rallyDetails.b1_player_id) {
      const blocker = effectivePlayers.find(p => p.id === rallyDetails.b1_player_id);
      if (blocker) {
        return { point_won_by: blocker.side as Side, reason: 'BLK' };
      }
    }
    // B=0 => OP (block error = attacker wins)
    if (rallyDetails.b_code === 0) {
      return { point_won_by: attackSide, reason: 'OP' };
    }
    // D=3 => DEF (great defense, but doesn't give point - skip for now)
    // D=0 => KILL for attacker (only if attacker is selected)
    if (rallyDetails.d_code === 0 && rallyDetails.a_player_id) {
      const attacker = getEffectivePlayers().find(p => p.id === rallyDetails.a_player_id);
      if (attacker) {
        return { point_won_by: attacker.side as Side, reason: 'KILL' };
      }
    }
    
    return null;
  }, [gameState, getEffectivePlayers, rallyDetails, attackSide]);

  // Determine if we should skip to save or show outcome
  const finalOutcome = autoOutcome || (manualOutcome.winner && manualOutcome.reason ? { point_won_by: manualOutcome.winner, reason: manualOutcome.reason } : null);
  
  // Determine if current step blocks further progression (ACE/SE)
  const isServeTerminal = rallyDetails.s_code === 3 || rallyDetails.s_code === 0;

  const handlePrevStep = () => {
    if (isLaterPhase) {
      // For phase > 1, skip serve and reception
      if (currentStep === 'setter') {
        // Can't go back from setter in later phases
        return;
      } else if (currentStep === 'attack') {
        setCurrentStep('setter');
      } else if (currentStep === 'block') {
        setCurrentStep('attack');
      } else if (currentStep === 'defense') {
        setCurrentStep('block');
      } else if (currentStep === 'outcome') {
        setCurrentStep('defense');
      }
    } else {
      // Phase 1 - full flow
      if (currentStep === 'reception') {
        setCurrentStep('serve');
      } else if (currentStep === 'setter') {
        setCurrentStep('reception');
      } else if (currentStep === 'attack') {
        setCurrentStep('setter');
      } else if (currentStep === 'block') {
        setCurrentStep('attack');
      } else if (currentStep === 'defense') {
        setCurrentStep('block');
      } else if (currentStep === 'outcome') {
        setCurrentStep('defense');
      }
    }
  };

  const handleNextStep = () => {
    if (isLaterPhase) {
      // For phase > 1, skip serve and reception
      if (currentStep === 'setter') {
        // Validate destination against d_code in later phases
        if (rallyDetails.pass_destination) {
          const effectiveReceptionCode = rallyDetails.d_code;
          const availablePositions = effectiveReceptionCode !== null && effectiveReceptionCode !== undefined
            ? POSITIONS_BY_RECEPTION[effectiveReceptionCode] || []
            : [];
          
          if (availablePositions.length > 0 && !availablePositions.includes(rallyDetails.pass_destination)) {
            toast({ 
              title: 'Destino inválido', 
              description: 'O destino selecionado não está disponível para esta qualidade.',
              variant: 'destructive' 
            });
            return;
          }
        }
        setCurrentStep('attack');
      } else if (currentStep === 'attack') {
        // Validate attacker selection if code is selected
        if (rallyDetails.a_code !== null && !rallyDetails.a_player_id) {
          toast({ title: 'Selecione o atacante', variant: 'destructive' });
          return;
        }
        if (autoOutcome) return;
        setCurrentStep('block');
      } else if (currentStep === 'block') {
        if (autoOutcome) return;
        setCurrentStep('defense');
      } else if (currentStep === 'defense') {
        if (autoOutcome) return;
        setCurrentStep('outcome');
      }
    } else {
      // Phase 1 - full flow
      if (currentStep === 'serve') {
        if (rallyDetails.s_code === null) {
          toast({ title: 'Selecione o código do serviço', variant: 'destructive' });
          return;
        }
        if (!rallyDetails.s_player_id) {
          toast({ title: 'Selecione o servidor', variant: 'destructive' });
          return;
        }
        // If ACE or SE, go directly to save
        if (isServeTerminal) {
          return; // Auto outcome will show save button
        }
        setCurrentStep('reception');
      } else if (currentStep === 'reception') {
        setCurrentStep('setter');
      } else if (currentStep === 'setter') {
        // Validate destination if selected
        if (rallyDetails.pass_destination) {
          const availablePositions = rallyDetails.r_code !== null && rallyDetails.r_code !== undefined
            ? POSITIONS_BY_RECEPTION[rallyDetails.r_code] || []
            : [];
          
          if (availablePositions.length > 0 && !availablePositions.includes(rallyDetails.pass_destination)) {
            toast({ 
              title: 'Destino inválido', 
              description: 'O destino selecionado não está disponível para esta qualidade de receção.',
              variant: 'destructive' 
            });
            return;
          }
        }
        setCurrentStep('attack');
      } else if (currentStep === 'attack') {
        // Validate attacker selection if code is selected
        if (rallyDetails.a_code !== null && !rallyDetails.a_player_id) {
          toast({ title: 'Selecione o atacante', variant: 'destructive' });
          return;
        }
        if (autoOutcome) return;
        setCurrentStep('block');
      } else if (currentStep === 'block') {
        if (autoOutcome) return;
        setCurrentStep('defense');
      } else if (currentStep === 'defense') {
        if (autoOutcome) return;
        setCurrentStep('outcome');
      }
    }
  };

  const handleSkipStep = () => {
    // Skip works the same for both phases (only for steps that exist)
    if (currentStep === 'reception') {
      setCurrentStep('setter');
    } else if (currentStep === 'setter') {
      // Validate destination if selected
      if (rallyDetails.pass_destination) {
        const availablePositions = rallyDetails.r_code !== null && rallyDetails.r_code !== undefined
          ? POSITIONS_BY_RECEPTION[rallyDetails.r_code] || []
          : [];
        
        if (availablePositions.length > 0 && !availablePositions.includes(rallyDetails.pass_destination)) {
          toast({ 
            title: 'Destino inválido', 
            description: 'O destino selecionado não está disponível para esta qualidade de receção.',
            variant: 'destructive' 
          });
          return;
        }
      }
      setCurrentStep('attack');
    } else if (currentStep === 'attack') {
      // Validate attacker selection if code is selected before skipping
      if (rallyDetails.a_code !== null && !rallyDetails.a_player_id) {
        toast({ title: 'Selecione o atacante antes de avançar', variant: 'destructive' });
        return;
      }
      setCurrentStep('block');
    } else if (currentStep === 'block') {
      setCurrentStep('defense');
    } else if (currentStep === 'defense') {
      setCurrentStep('outcome');
    }
  };

  const handleSavePoint = async (saveAsPhase: boolean = false) => {
    if (!gameState) return;

    const outcome = finalOutcome;
    if (!outcome && !saveAsPhase) {
      toast({ title: 'Resultado não determinado', variant: 'destructive' });
      return;
    }

    // Validate attacker is selected when outcome is KILL
    if (outcome?.reason === 'KILL' && !rallyDetails.a_player_id) {
      toast({ title: 'Selecione o atacante para registar o KILL', variant: 'destructive' });
      return;
    }

    // Validate kill_type is selected when a_code = 3 (KILL)
    if (rallyDetails.a_code === 3 && rallyDetails.kill_type === null) {
      toast({ title: 'Selecione o tipo de Kill (Chão ou Block-out)', variant: 'destructive' });
      return;
    }

    const effectivePlayers = getEffectivePlayers();
    const sPlayer = effectivePlayers.find(p => p.id === rallyDetails.s_player_id);
    const rPlayer = effectivePlayers.find(p => p.id === rallyDetails.r_player_id);
    const aPlayer = effectivePlayers.find(p => p.id === rallyDetails.a_player_id);
    const b1Player = effectivePlayers.find(p => p.id === rallyDetails.b1_player_id);
    const b2Player = effectivePlayers.find(p => p.id === rallyDetails.b2_player_id);
    const b3Player = effectivePlayers.find(p => p.id === rallyDetails.b3_player_id);
    const dPlayer = effectivePlayers.find(p => p.id === rallyDetails.d_player_id);
    
    const rallyData: Partial<Rally> = {
      match_id: matchId,
      set_no: currentSet,
      rally_no: gameState.currentRally,
      phase: gameState.currentPhase,
      serve_side: gameState.serveSide,
      serve_rot: gameState.serveRot,
      recv_side: gameState.recvSide,
      recv_rot: gameState.recvRot,
      point_won_by: saveAsPhase ? null : outcome?.point_won_by,
      reason: saveAsPhase ? null : outcome?.reason,
      s_player_id: rallyDetails.s_player_id,
      s_no: sPlayer?.jersey_number ?? null,
      s_code: rallyDetails.s_code,
      r_player_id: rallyDetails.r_player_id,
      r_no: rPlayer?.jersey_number ?? null,
      r_code: rallyDetails.r_code,
      a_player_id: rallyDetails.a_player_id,
      a_no: aPlayer?.jersey_number ?? null,
      a_code: rallyDetails.a_code,
      b1_player_id: rallyDetails.b1_player_id,
      b1_no: b1Player?.jersey_number ?? null,
      b2_player_id: rallyDetails.b2_player_id,
      b2_no: b2Player?.jersey_number ?? null,
      b3_player_id: rallyDetails.b3_player_id,
      b3_no: b3Player?.jersey_number ?? null,
      b_code: rallyDetails.b_code,
      d_player_id: rallyDetails.d_player_id,
      d_no: dPlayer?.jersey_number ?? null,
      d_code: rallyDetails.d_code,
      setter_player_id: rallyDetails.setter_player_id,
      pass_destination: rallyDetails.pass_destination,
      pass_code: rallyDetails.pass_code,
      kill_type: rallyDetails.a_code === 3 ? rallyDetails.kill_type : null,
    };

    const success = await saveRally(rallyData);
    if (success) {
      if (saveAsPhase) {
        toast({ title: 'Fase guardada' });
        setRallyDetails({
          s_player_id: serverPlayer?.id || null,
          s_code: null,
          r_player_id: null,
          r_code: null,
          setter_player_id: null,
          pass_destination: null,
          pass_code: null,
          a_player_id: null,
          a_code: null,
          kill_type: null,
          b1_player_id: null,
          b2_player_id: null,
          b3_player_id: null,
          b_code: null,
          d_player_id: null,
          d_code: null,
        });
        // For new phase, start at setter (not serve/reception)
        setCurrentStep('setter');
        setManualOutcome({ winner: null, reason: null });
      } else {
        toast({ title: 'Ponto registado' });
        resetWizard();
      }
    }
  };

  const handleAddPhase = async () => {
    await handleSavePoint(true);
  };

  const handleUndo = async () => {
    await deleteLastRally(currentSet);
    resetWizard();
  };

  // Hard reset to a new rally - used when stuck in phase > 1
  const hardResetToNewRally = async () => {
    setSuspendPhaseSync(true);
    await deleteLastRally(currentSet);
    resetWizard();
  };

  // isLaterPhase is now computed above

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;
  }

  if (!match) {
    return <div className="flex min-h-screen items-center justify-center">Jogo não encontrado</div>;
  }

  // Check if gameState is null - could mean no lineup for this set
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
          {/* Set Selector - allow navigation back to previous sets */}
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

  // Steps differ based on phase
  const phaseSteps: WizardStep[] = isLaterPhase 
    ? ['setter', 'attack', 'block', 'defense', 'outcome']
    : ['serve', 'reception', 'setter', 'attack', 'block', 'defense', 'outcome'];

  const getStepIndex = (step: WizardStep) => {
    return phaseSteps.indexOf(step);
  };

  const isStepCompleted = (step: WizardStep) => getStepIndex(step) < getStepIndex(currentStep);
  const isStepActive = (step: WizardStep) => step === currentStep;

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
        {/* Set Selector with status indicators */}
        <div className="flex gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((set) => {
            const result = isSetComplete(set);
            const matchStatus = getMatchStatus();
            // Set is playable if it's set 1, or previous set is complete
            const isPlayable = set === 1 || isSetComplete(set - 1).complete;
            // Don't show sets beyond what's needed (if match is complete)
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

        {/* Score Display - Enhanced with gradients */}
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
              
              {/* Divider with rally info */}
              <div className="flex flex-col items-center justify-center px-3 py-2 bg-muted/50">
                <div className="text-lg font-bold text-muted-foreground">—</div>
                <div className="text-[10px] text-muted-foreground text-center leading-tight mt-1">
                  <div>R{gameState.currentRally}</div>
                  {gameState.currentPhase > 1 && <div>F{gameState.currentPhase}</div>}
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
            <RefreshCw className="h-4 w-4" />
            <span className="text-home">{match.home_name}</span>
            <Badge variant="secondary" className="ml-auto">
              {getSubstitutionsUsed(currentSet, 'CASA')}/6
            </Badge>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setSubModalSide('FORA')}
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-away">{match.away_name}</span>
            <Badge variant="secondary" className="ml-auto">
              {getSubstitutionsUsed(currentSet, 'FORA')}/6
            </Badge>
          </Button>
        </div>

        {/* Step Progress - Enhanced with icons */}
        <StepProgressBar
          steps={phaseSteps}
          currentStep={currentStep}
          getStepIndex={getStepIndex}
        />

        {/* Attack Indicator - Enhanced visual design */}
        <Card className={`overflow-hidden ${
          attackSide === 'CASA' 
            ? 'border-home/30 bg-home/5' 
            : 'border-away/30 bg-away/5'
        }`}>
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                attackSide === 'CASA' ? 'bg-home text-home-foreground' : 'bg-away text-away-foreground'
              }`}>
                <Swords className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Fase {gameState.currentPhase}</div>
                <div className={`font-semibold ${
                  attackSide === 'CASA' ? 'text-home' : 'text-away'
                }`}>
                  {attackSide === 'CASA' ? match.home_name : match.away_name} ataca
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Defende</div>
              <div className={`text-sm font-medium ${
                defSide === 'CASA' ? 'text-home' : 'text-away'
              }`}>
                {defSide === 'CASA' ? match.home_name : match.away_name}
              </div>
            </div>
          </div>
        </Card>

        {/* Recent plays summary */}
        <RecentPlays 
          rallies={rallies} 
          players={getEffectivePlayers()} 
          homeName={match.home_name} 
          awayName={match.away_name}
          currentSet={currentSet}
        />

        {/* Wizard Steps */}
        <div className="space-y-3">
          {/* SERVE STEP */}
          {currentStep === 'serve' && (
            <WizardSectionCard
              actionType="serve"
              teamName={gameState.serveSide === 'CASA' ? match.home_name : match.away_name}
              teamSide={gameState.serveSide === 'CASA' ? 'home' : 'away'}
            >
              <WizardSection
                title=""
                players={uniquePlayers(servePlayers)}
                selectedPlayer={rallyDetails.s_player_id}
                selectedCode={rallyDetails.s_code}
                onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, s_player_id: id }))}
                onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, s_code: code }))}
                disabled={!!isLaterPhase}
              />
            </WizardSectionCard>
          )}

          {/* RECEPTION STEP */}
          {currentStep === 'reception' && (
            <WizardSectionCard
              actionType="reception"
              teamName={gameState.recvSide === 'CASA' ? match.home_name : match.away_name}
              teamSide={gameState.recvSide === 'CASA' ? 'home' : 'away'}
              optional
            >
              <WizardSection
                title=""
                players={uniquePlayers(recvPlayers)}
                selectedPlayer={rallyDetails.r_player_id}
                selectedCode={rallyDetails.r_code}
                onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, r_player_id: id }))}
                onCodeChange={(code) => setRallyDetails(prev => {
                  const newDetails = { ...prev, r_code: code };
                  // Clear destination if it's no longer available with the new r_code
                  if (prev.pass_destination && code !== null) {
                    const availablePositions = POSITIONS_BY_RECEPTION[code] || [];
                    if (!availablePositions.includes(prev.pass_destination)) {
                      newDetails.pass_destination = null;
                    }
                  }
                  return newDetails;
                })}
                optional
                disabled={!!isLaterPhase}
              />
            </WizardSectionCard>
          )}

          {/* SETTER STEP */}
          {currentStep === 'setter' && (
            <WizardSectionCard
              actionType="setter"
              teamName={attackSide === 'CASA' ? match.home_name : match.away_name}
              teamSide={attackSide === 'CASA' ? 'home' : 'away'}
              optional
            >
              {/* In later phases, show quality selection for incoming ball (replaces reception quality) */}
              {isLaterPhase && (
                <div className="space-y-2 mb-4">
                  <div className="text-xs font-medium text-muted-foreground">
                    Qualidade da Bola (da defesa anterior)
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((code) => (
                      <ColoredRatingButton
                        key={code}
                        code={code}
                        selected={rallyDetails.d_code === code}
                        onClick={() => {
                          setRallyDetails(prev => {
                            const newCode = prev.d_code === code ? null : code;
                            const newDetails = { ...prev, d_code: newCode };
                            // Clear destination if no longer valid for new code
                            if (prev.pass_destination && newCode !== null) {
                              const availablePositions = POSITIONS_BY_RECEPTION[newCode] || [];
                              if (!availablePositions.includes(prev.pass_destination)) {
                                newDetails.pass_destination = null;
                              }
                            }
                            return newDetails;
                          });
                        }}
                        size="md"
                      />
                    ))}
                  </div>
                </div>
              )}
              <SetterSection
                players={uniquePlayers(attackPlayers)}
                selectedSetter={rallyDetails.setter_player_id}
                selectedDestination={rallyDetails.pass_destination}
                selectedPassCode={rallyDetails.pass_code}
                receptionCode={isLaterPhase ? rallyDetails.d_code : rallyDetails.r_code}
                onSetterChange={(id) => setRallyDetails(prev => ({ ...prev, setter_player_id: id }))}
                onDestinationChange={(dest) => setRallyDetails(prev => ({ ...prev, pass_destination: dest }))}
                onPassCodeChange={(code) => setRallyDetails(prev => ({ ...prev, pass_code: code }))}
              />
            </WizardSectionCard>
          )}

          {/* ATTACK STEP */}
          {currentStep === 'attack' && (
            <WizardSectionCard
              actionType="attack"
              teamName={attackSide === 'CASA' ? match.home_name : match.away_name}
              teamSide={attackSide === 'CASA' ? 'home' : 'away'}
              optional
            >
              <div className="space-y-3">
                {/* Attack side toggle for phase > 1 */}
                {isLaterPhase && (
                  <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/50">
                    <span className="text-sm">Quem ataca:</span>
                    <div className="flex gap-1">
                      <Button
                        variant={attackSide === 'CASA' ? 'default' : 'outline'}
                        size="sm"
                        className={attackSide === 'CASA' ? 'bg-home hover:bg-home/90' : ''}
                        onClick={() => setAttackSideOverride('CASA')}
                      >
                        {match.home_name}
                      </Button>
                      <Button
                        variant={attackSide === 'FORA' ? 'default' : 'outline'}
                        size="sm"
                        className={attackSide === 'FORA' ? 'bg-away hover:bg-away/90' : ''}
                        onClick={() => setAttackSideOverride('FORA')}
                      >
                        {match.away_name}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Attack distribution quality selection */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Qualidade da Distribuição
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((code) => (
                      <ColoredRatingButton
                        key={code}
                        code={code}
                        selected={rallyDetails.pass_code === code}
                        onClick={() => setRallyDetails(prev => ({ 
                          ...prev, 
                          pass_code: prev.pass_code === code ? null : code 
                        }))}
                        size="md"
                      />
                    ))}
                  </div>
                </div>

                <WizardSection
                  title=""
                  players={uniquePlayers(attackPlayers)}
                  selectedPlayer={rallyDetails.a_player_id}
                  selectedCode={rallyDetails.a_code}
                  onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, a_player_id: id }))}
                  onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, a_code: code, kill_type: code === 3 ? null : null }))}
                  optional
                />
                {/* Kill Type Selection - Only show when a_code = 3 (KILL) - REQUIRED */}
                {rallyDetails.a_code === 3 && (
                  <div className={`flex items-center justify-between p-3 border-2 rounded-lg ${
                    rallyDetails.kill_type === null ? 'bg-success/10 border-success animate-pulse' : 'bg-success/5 border-success/30'
                  }`}>
                    <span className="text-sm font-medium">
                      Tipo de Kill <span className="text-destructive">*</span>
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant={rallyDetails.kill_type === 'FLOOR' ? 'default' : 'outline'}
                        size="sm"
                        className={rallyDetails.kill_type === 'FLOOR' ? 'bg-success hover:bg-success/90' : ''}
                        onClick={() => setRallyDetails(prev => ({ ...prev, kill_type: 'FLOOR' }))}
                      >
                        🏐 Chão
                      </Button>
                      <Button
                        variant={rallyDetails.kill_type === 'BLOCKOUT' ? 'default' : 'outline'}
                        size="sm"
                        className={rallyDetails.kill_type === 'BLOCKOUT' ? 'bg-success hover:bg-success/90' : ''}
                        onClick={() => setRallyDetails(prev => ({ ...prev, kill_type: 'BLOCKOUT' }))}
                      >
                        🚫 Block-out
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </WizardSectionCard>
          )}

          {/* BLOCK STEP */}
          {currentStep === 'block' && (
            <WizardSectionCard
              actionType="block"
              teamName={defSide === 'CASA' ? match.home_name : match.away_name}
              teamSide={defSide === 'CASA' ? 'home' : 'away'}
              optional
            >
              <WizardSectionBlock
                title=""
                players={uniquePlayers(blockDefPlayers)}
                selectedPlayer1={rallyDetails.b1_player_id}
                selectedPlayer2={rallyDetails.b2_player_id}
                selectedPlayer3={rallyDetails.b3_player_id}
                selectedCode={rallyDetails.b_code}
                onPlayer1Change={(id) => setRallyDetails(prev => ({ ...prev, b1_player_id: id }))}
                onPlayer2Change={(id) => setRallyDetails(prev => ({ ...prev, b2_player_id: id }))}
                onPlayer3Change={(id) => setRallyDetails(prev => ({ ...prev, b3_player_id: id }))}
                onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, b_code: code }))}
                optional
              />
            </WizardSectionCard>
          )}

          {/* DEFENSE STEP */}
          {currentStep === 'defense' && (
            <WizardSectionCard
              actionType="defense"
              teamName={defSide === 'CASA' ? match.home_name : match.away_name}
              teamSide={defSide === 'CASA' ? 'home' : 'away'}
              optional
            >
              <div className="space-y-3">
                {/* Defense quality dashboard */}
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">
                    Qualidade da Defesa
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((code) => (
                      <ColoredRatingButton
                        key={code}
                        code={code}
                        selected={rallyDetails.d_code === code}
                        onClick={() => setRallyDetails(prev => ({ 
                          ...prev, 
                          d_code: prev.d_code === code ? null : code 
                        }))}
                        size="md"
                      />
                    ))}
                  </div>
                </div>

                {/* Player selection */}
                <WizardSection
                  title="Defensor"
                  players={uniquePlayers(blockDefPlayers)}
                  selectedPlayer={rallyDetails.d_player_id}
                  selectedCode={null}
                  onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, d_player_id: id }))}
                  onCodeChange={() => {}}
                  optional
                />
              </div>
            </WizardSectionCard>
          )}

          {/* OUTCOME STEP (manual) */}
          {currentStep === 'outcome' && !autoOutcome && (
            <Card className="border-l-4 border-l-muted">
              <CardContent className="p-4 space-y-3">
                <div className="text-sm font-medium">Resultado (manual)</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={manualOutcome.winner === 'CASA' ? 'default' : 'outline'}
                    onClick={() => setManualOutcome(prev => ({ ...prev, winner: 'CASA' }))}
                    className={`h-12 ${manualOutcome.winner === 'CASA' ? 'bg-home hover:bg-home/90' : ''}`}
                  >
                    {match.home_name}
                  </Button>
                  <Button
                    variant={manualOutcome.winner === 'FORA' ? 'default' : 'outline'}
                    onClick={() => setManualOutcome(prev => ({ ...prev, winner: 'FORA' }))}
                    className={`h-12 ${manualOutcome.winner === 'FORA' ? 'bg-away hover:bg-away/90' : ''}`}
                  >
                    {match.away_name}
                  </Button>
                </div>
                {manualOutcome.winner && (
                  <div className="flex gap-2">
                    <Button
                      variant={manualOutcome.reason === 'OP' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setManualOutcome(prev => ({ ...prev, reason: 'OP' }))}
                    >
                      Outro
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Auto Outcome Display */}
          {autoOutcome && (
            <Card className={`border-2 ${
              autoOutcome.point_won_by === 'CASA' 
                ? 'border-home bg-home/10' 
                : 'border-away bg-away/10'
            }`}>
              <CardContent className="p-4">
                <div className={`text-center font-semibold ${
                  autoOutcome.point_won_by === 'CASA' ? 'text-home' : 'text-away'
                }`}>
                  <span className="text-lg">{autoOutcome.reason}</span>
                  <span className="mx-2">•</span>
                  <span>Ponto {autoOutcome.point_won_by === 'CASA' ? match.home_name : match.away_name}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <Card>
            <CardContent className="py-3">
              <div className="flex gap-2">
                {/* Show back button unless at first step of current phase */}
                {!(isLaterPhase ? currentStep === 'setter' : currentStep === 'serve') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevStep}
                  >
                    ← Voltar
                  </Button>
                )}
                {currentStep !== 'serve' && (
                  isLaterPhase ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Anular rally
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Anular rally em curso?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação vai apagar todas as fases deste rally e voltar ao início de um novo rally.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Não</AlertDialogCancel>
                          <AlertDialogAction onClick={hardResetToNewRally}>Sim, anular</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetWizard}
                    >
                      Cancelar
                    </Button>
                  )
                )}
                
                <div className="flex-1" />

                {/* Skip button for optional steps */}
                {(currentStep === 'reception' || currentStep === 'setter' || currentStep === 'attack' || currentStep === 'block' || currentStep === 'defense') && !autoOutcome && (
                  <Button
                    variant="outline"
                    onClick={handleSkipStep}
                  >
                    Saltar
                  </Button>
                )}

                {/* Next button */}
                {!autoOutcome && !isServeTerminal && currentStep !== 'outcome' && (
                  <Button onClick={handleNextStep} className="bg-primary">
                    Próximo <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}

                {/* +Phase button in detailed mode */}
                {detailedMode && (currentStep !== 'serve' || rallyDetails.s_code !== null) && (
                  <Button
                    variant="outline"
                    onClick={handleAddPhase}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    +Fase
                  </Button>
                )}

                {/* Save button when we have an outcome */}
                {(autoOutcome || (currentStep === 'outcome' && finalOutcome)) && (
                  <Button 
                    onClick={() => handleSavePoint(false)}
                    className={`${
                      autoOutcome?.point_won_by === 'CASA' ? 'bg-home hover:bg-home/90' : 'bg-away hover:bg-away/90'
                    }`}
                  >
                    Guardar Ponto
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Step Help */}
        <WizardStepHelp currentStep={currentStep} />

        {/* Undo Button - accessible from any step */}
        {(gameState.currentRally > 1 || gameState.currentPhase > 1) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full gap-2">
                <Undo2 className="h-4 w-4" />
                {gameState.currentPhase > 1 ? 'Anular rally em curso' : 'Anular Último Ponto'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {gameState.currentPhase > 1 ? 'Anular rally em curso?' : 'Anular último ponto?'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {gameState.currentPhase > 1 
                    ? 'Esta ação vai apagar todas as fases deste rally e voltar ao início.'
                    : 'Esta ação vai apagar o último ponto registado.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Não</AlertDialogCancel>
                <AlertDialogAction onClick={hardResetToNewRally}>Sim, anular</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Legend for new users - at the bottom */}
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

// Wizard Section Component for single player selection
interface WizardSectionProps {
  title: string;
  players: Player[];
  selectedPlayer: string | null;
  selectedCode: number | null;
  onPlayerChange: (id: string | null) => void;
  onCodeChange: (code: number | null) => void;
  optional?: boolean;
  disabled?: boolean;
}

function WizardSection({
  title,
  players,
  selectedPlayer,
  selectedCode,
  onPlayerChange,
  onCodeChange,
  optional = false,
  disabled = false,
}: WizardSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {title}
          {optional && <span className="text-muted-foreground ml-1">(opcional)</span>}
        </span>
      </div>
      <Select
        value={selectedPlayer || '__none__'}
        onValueChange={(val) => onPlayerChange(val === '__none__' ? null : val)}
        disabled={disabled}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecionar jogador" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Nenhum</SelectItem>
          {players.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              #{p.jersey_number} {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-4 gap-2">
        {CODES.map((code) => (
          <ColoredRatingButton
            key={code}
            code={code}
            selected={selectedCode === code}
            onClick={() => onCodeChange(selectedCode === code ? null : code)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

// Wizard Section for Block (up to 3 players)
interface WizardSectionBlockProps {
  title: string;
  players: Player[];
  selectedPlayer1: string | null;
  selectedPlayer2: string | null;
  selectedPlayer3: string | null;
  selectedCode: number | null;
  onPlayer1Change: (id: string | null) => void;
  onPlayer2Change: (id: string | null) => void;
  onPlayer3Change: (id: string | null) => void;
  onCodeChange: (code: number | null) => void;
  optional?: boolean;
}

function WizardSectionBlock({
  title,
  players,
  selectedPlayer1,
  selectedPlayer2,
  selectedPlayer3,
  selectedCode,
  onPlayer1Change,
  onPlayer2Change,
  onPlayer3Change,
  onCodeChange,
  optional = false,
}: WizardSectionBlockProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {title}
          {optional && <span className="text-muted-foreground ml-1">(opcional)</span>}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Select
          value={selectedPlayer1 || '__none__'}
          onValueChange={(val) => onPlayer1Change(val === '__none__' ? null : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Bloq 1" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Nenhum</SelectItem>
            {players.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                #{p.jersey_number} {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedPlayer2 || '__none__'}
          onValueChange={(val) => onPlayer2Change(val === '__none__' ? null : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Bloq 2" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Nenhum</SelectItem>
            {players.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                #{p.jersey_number} {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedPlayer3 || '__none__'}
          onValueChange={(val) => onPlayer3Change(val === '__none__' ? null : val)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Bloq 3" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Nenhum</SelectItem>
            {players.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                #{p.jersey_number} {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {CODES.map((code) => (
          <ColoredRatingButton
            key={code}
            code={code}
            selected={selectedCode === code}
            onClick={() => onCodeChange(selectedCode === code ? null : code)}
          />
        ))}
      </div>
    </div>
  );
}

// Setter Section for distribution tracking
interface SetterSectionProps {
  players: Player[];
  selectedSetter: string | null;
  selectedDestination: PassDestination | null;
  selectedPassCode: number | null;
  receptionCode?: number | null;
  onSetterChange: (id: string | null) => void;
  onDestinationChange: (dest: PassDestination | null) => void;
  onPassCodeChange: (code: number | null) => void;
}

function SetterSection({
  players,
  selectedSetter,
  selectedDestination,
  selectedPassCode,
  receptionCode,
  onSetterChange,
  onDestinationChange,
  onPassCodeChange,
}: SetterSectionProps) {
  // Get available positions based on reception quality
  const availablePositions = receptionCode !== null && receptionCode !== undefined
    ? POSITIONS_BY_RECEPTION[receptionCode] || []
    : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Distribuição
          <span className="text-muted-foreground ml-1">(opcional)</span>
        </span>
      </div>
      <Select
        value={selectedSetter || '__none__'}
        onValueChange={(val) => onSetterChange(val === '__none__' ? null : val)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecionar setter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">Nenhum</SelectItem>
          {players.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              #{p.jersey_number} {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="text-xs text-muted-foreground">Qualidade do passe:</div>
      <div className="grid grid-cols-4 gap-2">
        {CODES.map((code) => (
          <ColoredRatingButton
            key={code}
            code={code}
            selected={selectedPassCode === code}
            onClick={() => onPassCodeChange(selectedPassCode === code ? null : code)}
            size="sm"
          />
        ))}
      </div>
      
      <div className="text-xs text-muted-foreground">Destino da distribuição:</div>
      <div className="grid grid-cols-4 gap-2">
        {DESTINATIONS.filter((dest) => {
          // If no r_code defined, show all destinations
          if (receptionCode === null || receptionCode === undefined) return true;
          // Otherwise, show only available destinations
          return availablePositions.includes(dest);
        }).map((dest) => (
          <Button
            key={dest}
            variant={selectedDestination === dest ? 'default' : 'outline'}
            className="h-10 text-xs"
            onClick={() => onDestinationChange(selectedDestination === dest ? null : dest)}
          >
            {dest}
          </Button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground text-center">
        P2/P3/P4=Pontas • OP=Oposto • PIPE/BACK=2ª linha
      </div>

      {/* Reference table for positions by reception quality */}
      <div className="mt-4 border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="text-xs py-2 px-2">r_code</TableHead>
              <TableHead className="text-xs py-2 px-2">Qualidade</TableHead>
              <TableHead className="text-xs py-2 px-2">Posições Disponíveis</TableHead>
              <TableHead className="text-xs py-2 px-2 text-center">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[3, 2, 1, 0].map((code) => {
              const info = RECEPTION_LABELS[code];
              const positions = POSITIONS_BY_RECEPTION[code];
              const isHighlighted = receptionCode === code;
              return (
                <TableRow 
                  key={code} 
                  className={isHighlighted ? 'bg-primary/10 font-medium' : ''}
                >
                  <TableCell className="text-xs py-1.5 px-2">
                    {code} {info.emoji}
                  </TableCell>
                  <TableCell className="text-xs py-1.5 px-2">
                    {info.label}
                  </TableCell>
                  <TableCell className="text-xs py-1.5 px-2">
                    {positions.join(', ')}
                  </TableCell>
                  <TableCell className="text-xs py-1.5 px-2 text-center">
                    {positions.length}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
