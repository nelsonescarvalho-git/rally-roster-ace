import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, UserRoundCheck, ArrowRightLeft } from 'lucide-react';
import { Player, MatchPlayer, Side } from '@/types/volleyball';
import { cn } from '@/lib/utils';

interface LiberoPromptProps {
  type: 'entry' | 'exit';
  side: Side;
  libero: Player | MatchPlayer;
  eligiblePlayers?: (Player | MatchPlayer)[]; // For entry
  playerToReturn?: Player | MatchPlayer | null; // For exit
  getZoneLabel?: (playerId: string) => string;
  onConfirm: (playerId?: string) => void;
  onSkip?: () => void; // Only for entry (can skip)
  isLoading?: boolean;
  teamColor?: string;
}

export function LiberoPrompt({
  type,
  side,
  libero,
  eligiblePlayers = [],
  playerToReturn,
  getZoneLabel,
  onConfirm,
  onSkip,
  isLoading = false,
  teamColor,
}: LiberoPromptProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  
  const handleConfirmEntry = () => {
    if (selectedPlayer) {
      onConfirm(selectedPlayer);
    }
  };
  
  const handleConfirmExit = () => {
    onConfirm();
  };
  
  const teamLabel = side === 'CASA' ? 'Casa' : 'Fora';
  
  if (type === 'entry') {
    return (
      <div className="fixed inset-x-0 top-16 z-50 px-4 animate-in slide-in-from-top-4 duration-300">
        <Card className="border-2 border-primary/50 shadow-lg max-w-md mx-auto bg-card/95 backdrop-blur-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserRoundCheck className="h-5 w-5 text-primary" />
                <span className="font-semibold">Entrada do Libero</span>
                <Badge variant="outline" className="text-xs">{teamLabel}</Badge>
              </div>
              {onSkip && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSkip}
                  disabled={isLoading}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">#{libero.jersey_number} {libero.name}</span>
              {' '}entra por:
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {eligiblePlayers.map(player => {
                const zone = getZoneLabel?.(player.id) || '';
                const isSelected = selectedPlayer === player.id;
                
                return (
                  <Button
                    key={player.id}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'h-auto py-3 flex flex-col gap-1',
                      isSelected && 'ring-2 ring-primary ring-offset-2'
                    )}
                    onClick={() => setSelectedPlayer(player.id)}
                    disabled={isLoading}
                    style={{
                      borderColor: !isSelected && teamColor ? teamColor : undefined,
                    }}
                  >
                    <span className="text-lg font-bold">#{player.jersey_number}</span>
                    <span className="text-xs truncate max-w-full">{player.name}</span>
                    {zone && <Badge variant="secondary" className="text-[10px]">{zone}</Badge>}
                  </Button>
                );
              })}
            </div>
            
            <div className="flex gap-2">
              {onSkip && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onSkip}
                  disabled={isLoading}
                >
                  Não usar libero
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={handleConfirmEntry}
                disabled={!selectedPlayer || isLoading}
              >
                {isLoading ? 'A registar...' : 'Confirmar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Exit prompt
  return (
    <div className="fixed inset-x-0 top-16 z-50 px-4 animate-in slide-in-from-top-4 duration-300">
      <Card className="border-2 border-warning/50 shadow-lg max-w-md mx-auto bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-warning" />
            <span className="font-semibold text-warning">Saída do Libero</span>
            <Badge variant="outline" className="text-xs">{teamLabel}</Badge>
          </div>
          
          <div className="text-sm">
            <p className="text-muted-foreground mb-2">
              Rotação chegou a Z4. O libero tem de sair.
            </p>
            <div className="flex items-center gap-2 text-foreground">
              <span className="font-medium">#{libero.jersey_number} {libero.name}</span>
              <span className="text-muted-foreground">sai, entra:</span>
              {playerToReturn && (
                <span className="font-medium">#{playerToReturn.jersey_number} {playerToReturn.name}</span>
              )}
            </div>
          </div>
          
          <Button
            className="w-full"
            onClick={handleConfirmExit}
            disabled={isLoading}
          >
            {isLoading ? 'A registar...' : 'Confirmar Saída'}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            (Obrigatório - não pode recusar)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
