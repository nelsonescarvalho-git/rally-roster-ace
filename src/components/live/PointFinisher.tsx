import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Side, Reason, RallyAction, Player, MatchPlayer } from '@/types/volleyball';
import { PlayerSelectorPopup } from './PlayerSelectorPopup';

interface PointFinisherProps {
  actions: RallyAction[];
  homeName: string;
  awayName: string;
  onFinishPoint: (winner: Side, reason: Reason, faultPlayerId?: string | null) => void;
  suggestedOutcome?: { winner: Side; reason: Reason } | null;
  playersOnCourt?: { casa: (Player | MatchPlayer)[]; fora: (Player | MatchPlayer)[] };
  playersOnBench?: { casa: (Player | MatchPlayer)[]; fora: (Player | MatchPlayer)[] };
}

const REASON_OPTIONS: { value: Reason; label: string; emoji: string }[] = [
  { value: 'KILL', label: 'Kill', emoji: '🏐' },
  { value: 'ACE', label: 'ACE', emoji: '🎯' },
  { value: 'SE', label: 'Erro Serviço', emoji: '❌' },
  { value: 'AE', label: 'Erro Ataque', emoji: '💥' },
  { value: 'BLK', label: 'Bloco', emoji: '🚫' },
  { value: 'OP', label: 'Out/Falta', emoji: '📍' },
];

export function PointFinisher({
  actions,
  homeName,
  awayName,
  onFinishPoint,
  suggestedOutcome,
  playersOnCourt,
  playersOnBench,
}: PointFinisherProps) {
  // State for net fault player selection
  const [netFaultPending, setNetFaultPending] = useState<{ winner: Side; faultSide: Side } | null>(null);

  const handleNetFaultClick = (faultSide: Side) => {
    // The team that committed the fault loses, so the opponent wins
    const winner: Side = faultSide === 'CASA' ? 'FORA' : 'CASA';
    setNetFaultPending({ winner, faultSide });
  };

  const handlePlayerSelected = (player: Player | MatchPlayer) => {
    if (netFaultPending) {
      onFinishPoint(netFaultPending.winner, 'NET', player.id);
      setNetFaultPending(null);
    }
  };

  const handleClosePopup = () => {
    setNetFaultPending(null);
  };

  // Get players for the fault side
  const getFaultSidePlayers = () => {
    if (!netFaultPending) return { court: [], bench: [] };
    const side = netFaultPending.faultSide;
    return {
      court: side === 'CASA' ? (playersOnCourt?.casa || []) : (playersOnCourt?.fora || []),
      bench: side === 'CASA' ? (playersOnBench?.casa || []) : (playersOnBench?.fora || []),
    };
  };

  // If we have a suggested outcome, show it prominently
  if (suggestedOutcome) {
    return (
      <Card className={cn(
        'border-2',
        suggestedOutcome.winner === 'CASA' 
          ? 'border-home bg-home/10' 
          : 'border-away bg-away/10'
      )}>
        <CardContent className="p-4">
          <div className={cn(
            'text-center font-semibold',
            suggestedOutcome.winner === 'CASA' ? 'text-home' : 'text-away'
          )}>
            <span className="text-lg">{suggestedOutcome.reason}</span>
            <span className="mx-2">•</span>
            <span>
              Ponto {suggestedOutcome.winner === 'CASA' ? homeName : awayName}
            </span>
          </div>
          <Button
            className={cn(
              'w-full mt-3',
              suggestedOutcome.winner === 'CASA' 
                ? 'bg-home hover:bg-home/90' 
                : 'bg-away hover:bg-away/90'
            )}
            onClick={() => onFinishPoint(suggestedOutcome.winner, suggestedOutcome.reason)}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Confirmar Ponto
          </Button>
        </CardContent>
      </Card>
    );
  }

  const faultPlayers = getFaultSidePlayers();

  // Manual point finish UI
  return (
    <>
      <Card className="border-2 border-dashed">
        <CardContent className="p-4 space-y-3">
          <div className="text-center">
            <Trophy className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
            <span className="font-semibold">Terminar Ponto</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {(['CASA', 'FORA'] as Side[]).map((side) => (
              <div key={side} className="space-y-2">
                <div className={cn(
                  'text-sm font-medium text-center py-1 rounded',
                  side === 'CASA' ? 'bg-home/20 text-home' : 'bg-away/20 text-away'
                )}>
                  {side === 'CASA' ? homeName : awayName}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {REASON_OPTIONS.map((reason) => {
                    // For errors (SE, AE, OP), the opponent wins; for positive actions, the team wins
                    const isError = ['SE', 'AE', 'OP'].includes(reason.value);
                    const winner: Side = isError 
                      ? (side === 'CASA' ? 'FORA' : 'CASA')
                      : side;
                    
                    return (
                      <Button
                        key={`${side}-${reason.value}`}
                        variant="outline"
                        size="sm"
                        className={cn(
                          'text-xs h-9',
                          side === 'CASA' 
                            ? 'hover:bg-home/20 hover:border-home' 
                            : 'hover:bg-away/20 hover:border-away'
                        )}
                        onClick={() => onFinishPoint(winner, reason.value)}
                      >
                        <span className="mr-1">{reason.emoji}</span>
                        {reason.label}
                      </Button>
                    );
                  })}
                </div>
                {/* Net Fault button - full width below the grid */}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-full text-xs h-9',
                    side === 'CASA' 
                      ? 'hover:bg-home/20 hover:border-home border-home/50' 
                      : 'hover:bg-away/20 hover:border-away border-away/50'
                  )}
                  onClick={() => handleNetFaultClick(side)}
                >
                  <span className="mr-1">🕸️</span>
                  Falta Rede
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Player selector popup for net fault */}
      <PlayerSelectorPopup
        open={netFaultPending !== null}
        onClose={handleClosePopup}
        onSelectPlayer={handlePlayerSelected}
        playersOnCourt={faultPlayers.court}
        playersOnBench={faultPlayers.bench}
        title={`Falta Rede - ${netFaultPending?.faultSide === 'CASA' ? homeName : awayName}`}
      />
    </>
  );
}
