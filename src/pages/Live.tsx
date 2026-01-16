import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BarChart2, Undo2, Settings } from 'lucide-react';
import { Side, Reason, Player } from '@/types/volleyball';
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

export default function Live() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { match, players, loading, loadMatch, getGameState, getServerPlayer, saveRally, deleteLastRally, getPlayersForSide } = useMatch(matchId || null);

  const [currentSet, setCurrentSet] = useState(1);
  const [selectedWinner, setSelectedWinner] = useState<Side | null>(null);
  const [selectedReason, setSelectedReason] = useState<Reason | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [selectedCode, setSelectedCode] = useState<number | null>(null);

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId, loadMatch]);

  const gameState = getGameState(currentSet);
  const serverPlayer = gameState ? getServerPlayer(currentSet, gameState.serveSide, gameState.serveRot) : null;

  const resetSelection = () => {
    setSelectedWinner(null);
    setSelectedReason(null);
    setSelectedPlayer('');
    setSelectedCode(null);
  };

  const getRelevantPlayers = (): Player[] => {
    if (!selectedReason || !selectedWinner) return [];
    
    // For ACE/SE - server's team
    if (selectedReason === 'ACE' || selectedReason === 'SE') {
      return getPlayersForSide(gameState?.serveSide || 'CASA');
    }
    // For KILL/AE - winner's team for attack
    if (selectedReason === 'KILL' || selectedReason === 'AE') {
      return getPlayersForSide(selectedWinner);
    }
    // For BLK - blocking team (winner)
    if (selectedReason === 'BLK') {
      return getPlayersForSide(selectedWinner);
    }
    // For DEF - defending team (winner)
    if (selectedReason === 'DEF') {
      return getPlayersForSide(selectedWinner);
    }
    return [];
  };

  const handleSavePoint = async () => {
    if (!gameState || !selectedWinner || !selectedReason) return;

    const player = players.find(p => p.id === selectedPlayer);
    
    const rallyData: any = {
      match_id: matchId,
      set_no: currentSet,
      rally_no: gameState.currentRally,
      phase: gameState.currentPhase,
      serve_side: gameState.serveSide,
      serve_rot: gameState.serveRot,
      recv_side: gameState.recvSide,
      recv_rot: gameState.recvRot,
      point_won_by: selectedWinner,
      reason: selectedReason,
    };

    // Set player data based on reason
    if (selectedReason === 'ACE' && serverPlayer) {
      rallyData.s_player_id = serverPlayer.id;
      rallyData.s_no = serverPlayer.jersey_number;
      rallyData.s_code = 3;
    } else if (selectedReason === 'SE' && serverPlayer) {
      rallyData.s_player_id = serverPlayer.id;
      rallyData.s_no = serverPlayer.jersey_number;
      rallyData.s_code = 0;
    } else if ((selectedReason === 'KILL' || selectedReason === 'AE') && player) {
      rallyData.a_player_id = player.id;
      rallyData.a_no = player.jersey_number;
      rallyData.a_code = selectedReason === 'KILL' ? 3 : 0;
    } else if (selectedReason === 'BLK' && player) {
      rallyData.b1_player_id = player.id;
      rallyData.b1_no = player.jersey_number;
      rallyData.b_code = 3;
    } else if (selectedReason === 'DEF' && player) {
      rallyData.d_player_id = player.id;
      rallyData.d_no = player.jersey_number;
      rallyData.d_code = 3;
    }

    const success = await saveRally(rallyData);
    if (success) {
      resetSelection();
      toast({ title: 'Ponto registado' });
    }
  };

  const handleUndo = async () => {
    await deleteLastRally(currentSet);
    resetSelection();
  };

  if (loading || !match || !gameState) {
    return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;
  }

  const relevantPlayers = getRelevantPlayers();
  const needsPlayer = selectedReason && !['ACE', 'SE', 'OP'].includes(selectedReason);

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
              Rally #{gameState.currentRally} • Serve: {gameState.serveSide === 'CASA' ? match.home_name : match.away_name} (R{gameState.serveRot})
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

        {/* Player & Code Selection */}
        {selectedWinner && selectedReason && (
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="text-center text-sm font-medium">
                {selectedWinner === 'CASA' ? match.home_name : match.away_name} - {selectedReason}
              </div>
              
              {needsPlayer && (
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar jogador" />
                  </SelectTrigger>
                  <SelectContent>
                    {relevantPlayers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        #{p.jersey_number} {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <div className="flex gap-2">
                <Button variant="ghost" onClick={resetSelection} className="flex-1">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSavePoint}
                  className="flex-1"
                  disabled={needsPlayer && !selectedPlayer}
                >
                  Guardar
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
