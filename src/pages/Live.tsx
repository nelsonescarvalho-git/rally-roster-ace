import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, BarChart2, Undo2, Settings, Plus, ChevronRight } from 'lucide-react';
import { WizardStepHelp } from '@/components/WizardStepHelp';
import { Side, Reason, Player, MatchPlayer, Rally, PassDestination } from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';

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
  a_player_id: string | null;
  a_code: number | null;
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
  const { match, loading, loadMatch, getGameState, getServerPlayer, saveRally, deleteLastRally, getPlayersForSide, getEffectivePlayers } = useMatch(matchId || null);

  const [currentSet, setCurrentSet] = useState(1);
  const [currentStep, setCurrentStep] = useState<WizardStep>('serve');
  const [detailedMode, setDetailedMode] = useState(false);
  const [manualOutcome, setManualOutcome] = useState<{ winner: Side | null; reason: Reason | null }>({ winner: null, reason: null });
  const [attackSideOverride, setAttackSideOverride] = useState<Side | null>(null); // Only for phase > 1
  
  // Rally details state
  const [rallyDetails, setRallyDetails] = useState<RallyDetails>({
    s_player_id: null,
    s_code: null,
    r_player_id: null,
    r_code: null,
    setter_player_id: null,
    pass_destination: null,
    a_player_id: null,
    a_code: null,
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
      a_player_id: null,
      a_code: null,
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
  
  // Attack side: phase 1 = recv_side, phase > 1 = toggle override
  const isLaterPhase = gameState && gameState.currentPhase > 1;
  const attackSide: Side = isLaterPhase && attackSideOverride 
    ? attackSideOverride 
    : (gameState?.recvSide || 'CASA');
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
    // D=0 => KILL for attacker
    if (rallyDetails.d_code === 0) {
      return { point_won_by: attackSide, reason: 'KILL' };
    }
    
    return null;
  }, [gameState, getEffectivePlayers, rallyDetails, attackSide]);

  // Determine if we should skip to save or show outcome
  const finalOutcome = autoOutcome || (manualOutcome.winner && manualOutcome.reason ? { point_won_by: manualOutcome.winner, reason: manualOutcome.reason } : null);
  
  // Determine if current step blocks further progression (ACE/SE)
  const isServeTerminal = rallyDetails.s_code === 3 || rallyDetails.s_code === 0;

  const handlePrevStep = () => {
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
  };

  const handleNextStep = () => {
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
      setCurrentStep('attack');
    } else if (currentStep === 'attack') {
      if (autoOutcome) return; // Already have outcome
      setCurrentStep('block');
    } else if (currentStep === 'block') {
      if (autoOutcome) return;
      setCurrentStep('defense');
    } else if (currentStep === 'defense') {
      if (autoOutcome) return;
      setCurrentStep('outcome');
    }
  };

  const handleSkipStep = () => {
    if (currentStep === 'reception') {
      setCurrentStep('setter');
    } else if (currentStep === 'setter') {
      setCurrentStep('attack');
    } else if (currentStep === 'attack') {
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
          a_player_id: null,
          a_code: null,
          b1_player_id: null,
          b2_player_id: null,
          b3_player_id: null,
          b_code: null,
          d_player_id: null,
          d_code: null,
        });
        setCurrentStep('serve');
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

  // isLaterPhase is now computed above

  if (loading || !match || !gameState) {
    return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;
  }

  const getStepIndex = (step: WizardStep) => {
    const steps: WizardStep[] = ['serve', 'reception', 'attack', 'block', 'defense', 'outcome'];
    return steps.indexOf(step);
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

      <div className="p-4 space-y-4">
        {/* Set Selector */}
        <div className="flex gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((set) => (
            <Button
              key={set}
              variant={currentSet === set ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setCurrentSet(set); resetWizard(); }}
            >
              S{set}
            </Button>
          ))}
        </div>

        {/* Score Display */}
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center justify-around text-center">
              <div className="flex-1">
                <div className="text-sm font-medium text-home">{match.home_name}</div>
                <div className="text-4xl font-bold">{gameState.homeScore}</div>
              </div>
              <div className="text-muted-foreground">-</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-away">{match.away_name}</div>
                <div className="text-4xl font-bold">{gameState.awayScore}</div>
              </div>
            </div>
            <div className="mt-2 text-center text-xs text-muted-foreground">
              Rally #{gameState.currentRally} {gameState.currentPhase > 1 && `• Fase ${gameState.currentPhase}`} • Serve: {gameState.serveSide === 'CASA' ? match.home_name : match.away_name} (R{gameState.serveRot})
              {serverPlayer && ` • #${serverPlayer.jersey_number}`}
            </div>
          </CardContent>
        </Card>

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-1 text-xs">
          {(['serve', 'reception', 'setter', 'attack', 'block', 'defense'] as WizardStep[]).map((step, idx) => (
            <div key={step} className="flex items-center">
              <div 
                className={`px-2 py-1 rounded ${
                  isStepActive(step) 
                    ? 'bg-primary text-primary-foreground' 
                    : isStepCompleted(step) 
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step === 'serve' && 'S'}
                {step === 'reception' && 'R'}
                {step === 'setter' && 'Se'}
                {step === 'attack' && 'A'}
                {step === 'block' && 'B'}
                {step === 'defense' && 'D'}
              </div>
              {idx < 5 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Wizard Steps */}
        <Card>
          <CardContent className="py-4 space-y-4">
            {/* SERVE STEP */}
            {currentStep === 'serve' && (
              <WizardSection
                title="Serviço"
                players={uniquePlayers(servePlayers)}
                selectedPlayer={rallyDetails.s_player_id}
                selectedCode={rallyDetails.s_code}
                onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, s_player_id: id }))}
                onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, s_code: code }))}
                disabled={!!isLaterPhase}
              />
            )}

            {/* RECEPTION STEP */}
            {currentStep === 'reception' && (
              <WizardSection
                title="Receção"
                players={uniquePlayers(recvPlayers)}
                selectedPlayer={rallyDetails.r_player_id}
                selectedCode={rallyDetails.r_code}
                onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, r_player_id: id }))}
                onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, r_code: code }))}
                optional
                disabled={!!isLaterPhase}
              />
            )}

            {/* SETTER STEP */}
            {currentStep === 'setter' && (
              <SetterSection
                players={uniquePlayers(recvPlayers)}
                selectedSetter={rallyDetails.setter_player_id}
                selectedDestination={rallyDetails.pass_destination}
                onSetterChange={(id) => setRallyDetails(prev => ({ ...prev, setter_player_id: id }))}
                onDestinationChange={(dest) => setRallyDetails(prev => ({ ...prev, pass_destination: dest }))}
              />
            )}

            {/* ATTACK STEP */}
            {currentStep === 'attack' && (
              <div className="space-y-3">
                {/* Attack side toggle for phase > 1 */}
                {isLaterPhase && (
                  <div className="flex items-center justify-between p-2 border rounded-lg bg-muted/50">
                    <span className="text-sm">Ataque é de:</span>
                    <div className="flex gap-1">
                      <Button
                        variant={attackSide === 'CASA' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAttackSideOverride('CASA')}
                      >
                        {match.home_name}
                      </Button>
                      <Button
                        variant={attackSide === 'FORA' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAttackSideOverride('FORA')}
                      >
                        {match.away_name}
                      </Button>
                    </div>
                  </div>
                )}
                <WizardSection
                  title="Ataque"
                  players={uniquePlayers(attackPlayers)}
                  selectedPlayer={rallyDetails.a_player_id}
                  selectedCode={rallyDetails.a_code}
                  onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, a_player_id: id }))}
                  onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, a_code: code }))}
                  optional
                />
              </div>
            )}

            {/* BLOCK STEP */}
            {currentStep === 'block' && (
              <WizardSectionBlock
                title="Bloco"
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
            )}

            {/* DEFENSE STEP */}
            {currentStep === 'defense' && (
              <WizardSection
                title="Defesa"
                players={uniquePlayers(blockDefPlayers)}
                selectedPlayer={rallyDetails.d_player_id}
                selectedCode={rallyDetails.d_code}
                onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, d_player_id: id }))}
                onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, d_code: code }))}
                optional
              />
            )}

            {/* OUTCOME STEP (manual) */}
            {currentStep === 'outcome' && !autoOutcome && (
              <div className="space-y-3">
                <div className="text-sm font-medium">Resultado (manual)</div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={manualOutcome.winner === 'CASA' ? 'default' : 'outline'}
                    onClick={() => setManualOutcome(prev => ({ ...prev, winner: 'CASA' }))}
                    className="h-12"
                  >
                    {match.home_name}
                  </Button>
                  <Button
                    variant={manualOutcome.winner === 'FORA' ? 'default' : 'outline'}
                    onClick={() => setManualOutcome(prev => ({ ...prev, winner: 'FORA' }))}
                    className="h-12"
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
              </div>
            )}

            {/* Auto Outcome Display */}
            {autoOutcome && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <div className="text-sm font-medium text-center">
                  {autoOutcome.reason}: Ponto {autoOutcome.point_won_by === 'CASA' ? match.home_name : match.away_name}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex gap-2 pt-2">
              {currentStep !== 'serve' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevStep}
                >
                  ← Voltar
                </Button>
              )}
              {currentStep !== 'serve' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetWizard}
                >
                  Cancelar
                </Button>
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
                <Button onClick={handleNextStep}>
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
                <Button onClick={() => handleSavePoint(false)}>
                  Guardar Ponto
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Step Help */}
        <WizardStepHelp currentStep={currentStep} />

        {/* Undo Button */}
        {gameState.currentRally > 1 && currentStep === 'serve' && (
          <Button variant="outline" onClick={handleUndo} className="w-full gap-2">
            <Undo2 className="h-4 w-4" />
            Anular Último Ponto
          </Button>
        )}
      </div>
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
          <Button
            key={code}
            variant={selectedCode === code ? 'default' : 'outline'}
            className="h-12 text-lg"
            onClick={() => onCodeChange(selectedCode === code ? null : code)}
            disabled={disabled}
          >
            {code}
          </Button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground text-center">
        3=excelente • 2=positivo • 1=negativo • 0=erro
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
          <Button
            key={code}
            variant={selectedCode === code ? 'default' : 'outline'}
            className="h-12 text-lg"
            onClick={() => onCodeChange(selectedCode === code ? null : code)}
          >
            {code}
          </Button>
        ))}
      </div>
      <div className="text-xs text-muted-foreground text-center">
        3=ponto • 2=positivo • 1=toque • 0=erro
      </div>
    </div>
  );
}

// Setter Section for distribution tracking
interface SetterSectionProps {
  players: Player[];
  selectedSetter: string | null;
  selectedDestination: PassDestination | null;
  onSetterChange: (id: string | null) => void;
  onDestinationChange: (dest: PassDestination | null) => void;
}

function SetterSection({
  players,
  selectedSetter,
  selectedDestination,
  onSetterChange,
  onDestinationChange,
}: SetterSectionProps) {
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
      
      <div className="text-xs text-muted-foreground">Destino da distribuição:</div>
      <div className="grid grid-cols-4 gap-2">
        {DESTINATIONS.map((dest) => (
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
    </div>
  );
}
