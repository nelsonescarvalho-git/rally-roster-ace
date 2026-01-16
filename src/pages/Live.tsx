import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, BarChart2, Undo2, Settings, ChevronDown, Plus } from 'lucide-react';
import { Side, Reason, Player, Rally } from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';

const REASONS: { value: Reason; label: string }[] = [
  { value: 'ACE', label: 'ACE' },
  { value: 'SE', label: 'Erro Serviço' },
  { value: 'KILL', label: 'KILL' },
  { value: 'AE', label: 'Erro Ataque' },
  { value: 'BLK', label: 'Bloco' },
  { value: 'DEF', label: 'Defesa' },
  { value: 'OP', label: 'Outro' },
];

const CODES = [0, 1, 2, 3];

interface RallyDetails {
  s_player_id: string | null;
  s_code: number | null;
  r_player_id: string | null;
  r_code: number | null;
  a_player_id: string | null;
  a_code: number | null;
  b1_player_id: string | null;
  b2_player_id: string | null;
  b3_player_id: string | null;
  b_code: number | null;
  d_player_id: string | null;
  d_code: number | null;
}

export default function Live() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { match, players, loading, loadMatch, getGameState, getServerPlayer, saveRally, deleteLastRally, getPlayersForSide } = useMatch(matchId || null);

  const [currentSet, setCurrentSet] = useState(1);
  const [selectedWinner, setSelectedWinner] = useState<Side | null>(null);
  const [selectedReason, setSelectedReason] = useState<Reason | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [detailedMode, setDetailedMode] = useState(false);
  
  // Rally details state
  const [rallyDetails, setRallyDetails] = useState<RallyDetails>({
    s_player_id: null,
    s_code: null,
    r_player_id: null,
    r_code: null,
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
  
  // Pre-fill server when reason is selected
  useEffect(() => {
    if (serverPlayer && selectedReason) {
      setRallyDetails(prev => ({
        ...prev,
        s_player_id: serverPlayer.id,
        s_code: selectedReason === 'ACE' ? 3 : (selectedReason === 'SE' ? 0 : prev.s_code),
      }));
    }
  }, [serverPlayer, selectedReason]);

  const resetSelection = () => {
    setSelectedWinner(null);
    setSelectedReason(null);
    setRallyDetails({
      s_player_id: null,
      s_code: null,
      r_player_id: null,
      r_code: null,
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

  const servePlayers = gameState ? getPlayersForSide(gameState.serveSide) : [];
  const recvPlayers = gameState ? getPlayersForSide(gameState.recvSide) : [];
  const winnerPlayers = selectedWinner ? getPlayersForSide(selectedWinner) : [];
  const loserPlayers = selectedWinner ? getPlayersForSide(selectedWinner === 'CASA' ? 'FORA' : 'CASA') : [];

  // Determine which sections are visible/required based on reason
  const isServeVisible = true; // Always visible
  const isRecVisible = selectedReason !== 'SE'; // Hidden for Serve Error
  const isAttRequired = selectedReason === 'KILL' || selectedReason === 'AE';
  const isBlkRequired = selectedReason === 'BLK';
  const isDefRequired = selectedReason === 'DEF';

  const validateRally = (): boolean => {
    if (!selectedWinner || !selectedReason) return false;

    // ACE: requires s_player and s_code=3
    if (selectedReason === 'ACE') {
      if (!rallyDetails.s_player_id || rallyDetails.s_code !== 3) {
        toast({ title: 'ACE requer servidor e código 3', variant: 'destructive' });
        return false;
      }
    }
    // SE: requires s_player and s_code=0
    if (selectedReason === 'SE') {
      if (!rallyDetails.s_player_id || rallyDetails.s_code !== 0) {
        toast({ title: 'Erro Serviço requer servidor e código 0', variant: 'destructive' });
        return false;
      }
    }
    // KILL: requires a_player and a_code=3
    if (selectedReason === 'KILL') {
      if (!rallyDetails.a_player_id || rallyDetails.a_code !== 3) {
        toast({ title: 'KILL requer atacante e código 3', variant: 'destructive' });
        return false;
      }
    }
    // AE: requires a_player and a_code=0
    if (selectedReason === 'AE') {
      if (!rallyDetails.a_player_id || rallyDetails.a_code !== 0) {
        toast({ title: 'Erro Ataque requer atacante e código 0', variant: 'destructive' });
        return false;
      }
    }
    // BLK: requires b_code=3 and at least 1 blocker
    if (selectedReason === 'BLK') {
      if (rallyDetails.b_code !== 3 || !rallyDetails.b1_player_id) {
        toast({ title: 'Bloco requer pelo menos 1 bloqueador e código 3', variant: 'destructive' });
        return false;
      }
    }
    // DEF: requires d_player and d_code=3
    if (selectedReason === 'DEF') {
      if (!rallyDetails.d_player_id || rallyDetails.d_code !== 3) {
        toast({ title: 'Defesa requer defensor e código 3', variant: 'destructive' });
        return false;
      }
    }

    return true;
  };

  const handleSavePoint = async (saveAsPhase: boolean = false) => {
    if (!gameState || !validateRally()) return;

    const sPlayer = players.find(p => p.id === rallyDetails.s_player_id);
    const rPlayer = players.find(p => p.id === rallyDetails.r_player_id);
    const aPlayer = players.find(p => p.id === rallyDetails.a_player_id);
    const b1Player = players.find(p => p.id === rallyDetails.b1_player_id);
    const b2Player = players.find(p => p.id === rallyDetails.b2_player_id);
    const b3Player = players.find(p => p.id === rallyDetails.b3_player_id);
    const dPlayer = players.find(p => p.id === rallyDetails.d_player_id);
    
    const rallyData: Partial<Rally> = {
      match_id: matchId,
      set_no: currentSet,
      rally_no: gameState.currentRally,
      phase: gameState.currentPhase,
      serve_side: gameState.serveSide,
      serve_rot: gameState.serveRot,
      recv_side: gameState.recvSide,
      recv_rot: gameState.recvRot,
      // Only set point_won_by and reason if not saving as intermediate phase
      point_won_by: saveAsPhase ? null : selectedWinner,
      reason: saveAsPhase ? null : selectedReason,
      // Server
      s_player_id: rallyDetails.s_player_id,
      s_no: sPlayer?.jersey_number ?? null,
      s_code: rallyDetails.s_code,
      // Reception
      r_player_id: rallyDetails.r_player_id,
      r_no: rPlayer?.jersey_number ?? null,
      r_code: rallyDetails.r_code,
      // Attack
      a_player_id: rallyDetails.a_player_id,
      a_no: aPlayer?.jersey_number ?? null,
      a_code: rallyDetails.a_code,
      // Block
      b1_player_id: rallyDetails.b1_player_id,
      b1_no: b1Player?.jersey_number ?? null,
      b2_player_id: rallyDetails.b2_player_id,
      b2_no: b2Player?.jersey_number ?? null,
      b3_player_id: rallyDetails.b3_player_id,
      b3_no: b3Player?.jersey_number ?? null,
      b_code: rallyDetails.b_code,
      // Defense
      d_player_id: rallyDetails.d_player_id,
      d_no: dPlayer?.jersey_number ?? null,
      d_code: rallyDetails.d_code,
    };

    const success = await saveRally(rallyData);
    if (success) {
      if (saveAsPhase) {
        toast({ title: 'Fase guardada', description: 'Adicione mais detalhes na próxima fase' });
        // Reset details but keep winner/reason for context
        setRallyDetails({
          s_player_id: serverPlayer?.id || null,
          s_code: null,
          r_player_id: null,
          r_code: null,
          a_player_id: null,
          a_code: null,
          b1_player_id: null,
          b2_player_id: null,
          b3_player_id: null,
          b_code: null,
          d_player_id: null,
          d_code: null,
        });
      } else {
        resetSelection();
        toast({ title: 'Ponto registado' });
      }
    }
  };

  const handleAddPhase = async () => {
    // Save current details as a phase (without point_won_by)
    await handleSavePoint(true);
  };

  const handleUndo = async () => {
    await deleteLastRally(currentSet);
    resetSelection();
  };

  if (loading || !match || !gameState) {
    return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;
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

      <div className="p-4 space-y-4">
        {/* Set Selector */}
        <div className="flex gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((set) => (
            <Button
              key={set}
              variant={currentSet === set ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setCurrentSet(set); resetSelection(); }}
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

        {/* Point Buttons */}
        {!selectedWinner && (
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => setSelectedWinner('CASA')}
              className="h-20 text-xl font-bold bg-home hover:bg-home/90"
            >
              Ponto {match.home_name}
            </Button>
            <Button
              onClick={() => setSelectedWinner('FORA')}
              className="h-20 text-xl font-bold bg-away hover:bg-away/90"
            >
              Ponto {match.away_name}
            </Button>
          </div>
        )}

        {/* Reason Selection */}
        {selectedWinner && !selectedReason && (
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="text-center text-sm font-medium">
                Ponto: {selectedWinner === 'CASA' ? match.home_name : match.away_name}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {REASONS.map((r) => (
                  <Button
                    key={r.value}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedReason(r.value)}
                    className="text-xs"
                  >
                    {r.label}
                  </Button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={resetSelection} className="w-full">
                Cancelar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rally Details Panel */}
        {selectedWinner && selectedReason && (
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">
                  {selectedWinner === 'CASA' ? match.home_name : match.away_name} - {REASONS.find(r => r.value === selectedReason)?.label}
                </div>
                <Button variant="ghost" size="sm" onClick={resetSelection}>
                  Cancelar
                </Button>
              </div>

              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-between">
                    Detalhes do Rally
                    <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Serviço - Always visible */}
                  <RallySection
                    title="Serviço"
                    players={servePlayers}
                    selectedPlayer={rallyDetails.s_player_id}
                    selectedCode={rallyDetails.s_code}
                    onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, s_player_id: id }))}
                    onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, s_code: code }))}
                    required={selectedReason === 'ACE' || selectedReason === 'SE'}
                    lockedCode={selectedReason === 'ACE' ? 3 : (selectedReason === 'SE' ? 0 : undefined)}
                  />

                  {/* Receção - Hidden for SE */}
                  {isRecVisible && (
                    <RallySection
                      title="Receção"
                      players={recvPlayers}
                      selectedPlayer={rallyDetails.r_player_id}
                      selectedCode={rallyDetails.r_code}
                      onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, r_player_id: id }))}
                      onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, r_code: code }))}
                    />
                  )}

                  {/* Ataque */}
                  <RallySection
                    title="Ataque"
                    players={selectedReason === 'AE' ? loserPlayers : winnerPlayers}
                    selectedPlayer={rallyDetails.a_player_id}
                    selectedCode={rallyDetails.a_code}
                    onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, a_player_id: id }))}
                    onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, a_code: code }))}
                    required={isAttRequired}
                    lockedCode={selectedReason === 'KILL' ? 3 : (selectedReason === 'AE' ? 0 : undefined)}
                  />

                  {/* Bloco */}
                  <RallySectionBlock
                    title="Bloco"
                    players={winnerPlayers}
                    selectedPlayer1={rallyDetails.b1_player_id}
                    selectedPlayer2={rallyDetails.b2_player_id}
                    selectedPlayer3={rallyDetails.b3_player_id}
                    selectedCode={rallyDetails.b_code}
                    onPlayer1Change={(id) => setRallyDetails(prev => ({ ...prev, b1_player_id: id }))}
                    onPlayer2Change={(id) => setRallyDetails(prev => ({ ...prev, b2_player_id: id }))}
                    onPlayer3Change={(id) => setRallyDetails(prev => ({ ...prev, b3_player_id: id }))}
                    onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, b_code: code }))}
                    required={isBlkRequired}
                    lockedCode={selectedReason === 'BLK' ? 3 : undefined}
                  />

                  {/* Defesa */}
                  <RallySection
                    title="Defesa"
                    players={winnerPlayers}
                    selectedPlayer={rallyDetails.d_player_id}
                    selectedCode={rallyDetails.d_code}
                    onPlayerChange={(id) => setRallyDetails(prev => ({ ...prev, d_player_id: id }))}
                    onCodeChange={(code) => setRallyDetails(prev => ({ ...prev, d_code: code }))}
                    required={isDefRequired}
                    lockedCode={selectedReason === 'DEF' ? 3 : undefined}
                  />
                </CollapsibleContent>
              </Collapsible>

              <div className="flex gap-2 pt-2">
                {detailedMode && (
                  <Button
                    variant="outline"
                    onClick={handleAddPhase}
                    className="flex-1 gap-1"
                  >
                    <Plus className="h-4 w-4" />
                    +Fase
                  </Button>
                )}
                <Button
                  onClick={() => handleSavePoint(false)}
                  className="flex-1"
                >
                  Guardar Ponto
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Undo Button */}
        {gameState.currentRally > 1 && !selectedWinner && (
          <Button variant="outline" onClick={handleUndo} className="w-full gap-2">
            <Undo2 className="h-4 w-4" />
            Anular Último Ponto
          </Button>
        )}
      </div>
    </div>
  );
}

// Rally Section Component for single player selection
interface RallySectionProps {
  title: string;
  players: Player[];
  selectedPlayer: string | null;
  selectedCode: number | null;
  onPlayerChange: (id: string | null) => void;
  onCodeChange: (code: number | null) => void;
  required?: boolean;
  lockedCode?: number;
}

function RallySection({
  title,
  players,
  selectedPlayer,
  selectedCode,
  onPlayerChange,
  onCodeChange,
  required = false,
  lockedCode,
}: RallySectionProps) {
  useEffect(() => {
    if (lockedCode !== undefined) {
      onCodeChange(lockedCode);
    }
  }, [lockedCode, onCodeChange]);

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {title}
          {required && <span className="text-destructive ml-1">*</span>}
        </span>
      </div>
      <div className="flex gap-2 items-center">
        <Select
          value={selectedPlayer || '__none__'}
          onValueChange={(val) => onPlayerChange(val === '__none__' ? null : val)}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Jogador" />
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
        <div className="flex gap-1">
          {CODES.map((code) => (
            <Button
              key={code}
              variant={selectedCode === code ? 'default' : 'outline'}
              size="sm"
              className="w-9 h-9"
              onClick={() => lockedCode === undefined && onCodeChange(selectedCode === code ? null : code)}
              disabled={lockedCode !== undefined && lockedCode !== code}
            >
              {code}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Rally Section for Block (up to 3 players)
interface RallySectionBlockProps {
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
  required?: boolean;
  lockedCode?: number;
}

function RallySectionBlock({
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
  required = false,
  lockedCode,
}: RallySectionBlockProps) {
  useEffect(() => {
    if (lockedCode !== undefined) {
      onCodeChange(lockedCode);
    }
  }, [lockedCode, onCodeChange]);

  return (
    <div className="space-y-2 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          {title}
          {required && <span className="text-destructive ml-1">*</span>}
        </span>
        <div className="flex gap-1">
          {CODES.map((code) => (
            <Button
              key={code}
              variant={selectedCode === code ? 'default' : 'outline'}
              size="sm"
              className="w-9 h-9"
              onClick={() => lockedCode === undefined && onCodeChange(selectedCode === code ? null : code)}
              disabled={lockedCode !== undefined && lockedCode !== code}
            >
              {code}
            </Button>
          ))}
        </div>
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
                #{p.jersey_number}
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
                #{p.jersey_number}
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
                #{p.jersey_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
