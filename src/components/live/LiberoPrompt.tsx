import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { X, UserRoundCheck, ArrowRightLeft, ChevronDown, ChevronUp, Star, RefreshCw } from 'lucide-react';
import { Player, MatchPlayer, Side } from '@/types/volleyball';
import { cn } from '@/lib/utils';

interface LiberoPromptProps {
  type: 'entry' | 'exit' | 'swap';
  side: Side;
  // For single libero mode or swap (current libero)
  libero?: Player | MatchPlayer;
  // For multiple libero selection
  availableLiberos?: (Player | MatchPlayer)[];
  // For swap: the libero currently on court
  liberoOnCourt?: Player | MatchPlayer | null;
  eligiblePlayers?: (Player | MatchPlayer)[]; // For entry
  playerToReturn?: Player | MatchPlayer | null; // For exit
  recommendedPlayer?: Player | MatchPlayer | null; // Pre-selected MB
  getZoneLabel?: (playerId: string) => string;
  onConfirm: (playerId?: string, selectedLiberoId?: string) => void;
  onSkip?: () => void; // Only for entry (can skip)
  isLoading?: boolean;
  teamColor?: string;
}

export function LiberoPrompt({
  type,
  side,
  libero,
  availableLiberos = [],
  liberoOnCourt,
  eligiblePlayers = [],
  playerToReturn,
  recommendedPlayer,
  getZoneLabel,
  onConfirm,
  onSkip,
  isLoading = false,
  teamColor,
}: LiberoPromptProps) {
  // Compute effective liberos list
  const effectiveLiberos = availableLiberos.length > 0 
    ? availableLiberos 
    : (libero ? [libero] : []);
  
  // For swap, get the other libero (not the one on court)
  const swapTargetLibero = type === 'swap' && liberoOnCourt
    ? effectiveLiberos.find(l => l.id !== liberoOnCourt.id)
    : null;
  
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedLiberoId, setSelectedLiberoId] = useState<string | null>(
    effectiveLiberos.length === 1 ? effectiveLiberos[0].id : null
  );
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  
  // Pre-select recommended player when available, reset when eligiblePlayers change
  useEffect(() => {
    // Reset selection when eligible players change (e.g., rally changed)
    if (selectedPlayer && !eligiblePlayers.some(p => p.id === selectedPlayer)) {
      setSelectedPlayer(null);
    }
    // Pre-select recommended if no selection or selection was reset
    if (recommendedPlayer && (!selectedPlayer || !eligiblePlayers.some(p => p.id === selectedPlayer))) {
      setSelectedPlayer(recommendedPlayer.id);
    }
  }, [recommendedPlayer?.id, eligiblePlayers.map(p => p.id).join(',')]);
  
  // Reset libero selection when liberos change
  useEffect(() => {
    if (effectiveLiberos.length === 1) {
      setSelectedLiberoId(effectiveLiberos[0].id);
    } else if (selectedLiberoId && !effectiveLiberos.some(l => l.id === selectedLiberoId)) {
      setSelectedLiberoId(null);
    }
  }, [effectiveLiberos.map(l => l.id).join(',')]);
  
  const handleConfirmEntry = () => {
    if (selectedPlayer && selectedLiberoId) {
      onConfirm(selectedPlayer, selectedLiberoId);
    }
  };
  
  const handleConfirmExit = () => {
    onConfirm();
  };
  
  const handleConfirmSwap = () => {
    if (swapTargetLibero) {
      onConfirm(undefined, swapTargetLibero.id);
    }
  };
  
  const teamLabel = side === 'CASA' ? 'Casa' : 'Fora';
  
  // Other eligible players (excluding recommended)
  const otherPlayers = eligiblePlayers.filter(p => p.id !== recommendedPlayer?.id);
  
  // Get selected libero object
  const selectedLibero = effectiveLiberos.find(l => l.id === selectedLiberoId);
  
  // SWAP type - Simple confirmation for L-L swap
  if (type === 'swap' && liberoOnCourt && swapTargetLibero) {
    return (
      <div className="fixed inset-x-0 top-16 z-50 px-4 animate-in slide-in-from-top-4 duration-300">
        <Card className="border-2 border-accent/50 shadow-lg max-w-md mx-auto bg-card/95 backdrop-blur-sm">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-accent" />
                <span className="font-semibold">Trocar Líbero</span>
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
            
            <div className="flex items-center justify-center gap-4 py-2">
              <div className="text-center">
                <Badge variant="secondary" className="text-lg py-1 px-3">
                  #{liberoOnCourt.jersey_number}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-[100px]">
                  {liberoOnCourt.name}
                </p>
                <p className="text-[10px] text-muted-foreground">Sai</p>
              </div>
              
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
              
              <div className="text-center">
                <Badge variant="default" className="text-lg py-1 px-3">
                  #{swapTargetLibero.jersey_number}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-[100px]">
                  {swapTargetLibero.name}
                </p>
                <p className="text-[10px] text-muted-foreground">Entra</p>
              </div>
            </div>
            
            <p className="text-xs text-center text-muted-foreground">
              (Troca de líbero por líbero - ilimitada)
            </p>
            
            <div className="flex gap-2">
              {onSkip && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={onSkip}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              )}
              <Button
                className="flex-1"
                onClick={handleConfirmSwap}
                disabled={isLoading}
              >
                {isLoading ? 'A registar...' : 'Confirmar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // ENTRY type
  if (type === 'entry') {
    const hasMultipleLiberos = effectiveLiberos.length > 1;
    const hasRecommended = !!recommendedPlayer;
    const showQuickConfirm = hasRecommended && selectedPlayer === recommendedPlayer.id && !showAllPlayers && selectedLiberoId;
    
    return (
      <div className="fixed inset-x-0 top-16 z-50 px-4 animate-in slide-in-from-top-4 duration-300">
        <Card className="border-2 border-primary/50 shadow-lg max-w-md mx-auto bg-card/95 backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
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
            
            {/* Libero Selection (when multiple liberos) */}
            {hasMultipleLiberos && (
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">Escolher líbero:</span>
                <div className="grid grid-cols-2 gap-2">
                  {effectiveLiberos.map(lib => (
                    <Button
                      key={lib.id}
                      variant={selectedLiberoId === lib.id ? 'default' : 'outline'}
                      className={cn(
                        'h-auto py-2 flex flex-col gap-0.5',
                        selectedLiberoId === lib.id && 'ring-2 ring-primary ring-offset-2'
                      )}
                      onClick={() => setSelectedLiberoId(lib.id)}
                      disabled={isLoading}
                    >
                      <span className="text-lg font-bold">#{lib.jersey_number}</span>
                      <span className="text-xs truncate max-w-full">{lib.name}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Show selected libero info */}
            {selectedLibero && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">#{selectedLibero.jersey_number} {selectedLibero.name}</span>
                {' '}entra por:
              </div>
            )}
            
            {/* Quick confirm for recommended player (MB) */}
            {hasRecommended && selectedLiberoId && (
              <div className="space-y-2">
                <Button
                  variant={selectedPlayer === recommendedPlayer.id ? 'default' : 'outline'}
                  className={cn(
                    'w-full h-auto py-3 flex items-center justify-between gap-2',
                    selectedPlayer === recommendedPlayer.id && 'ring-2 ring-primary ring-offset-2'
                  )}
                  onClick={() => setSelectedPlayer(recommendedPlayer.id)}
                  disabled={isLoading}
                  style={{
                    borderColor: selectedPlayer !== recommendedPlayer.id && teamColor ? teamColor : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold">#{recommendedPlayer.jersey_number}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium">{recommendedPlayer.name}</div>
                      <div className="flex items-center gap-1">
                        {getZoneLabel?.(recommendedPlayer.id) && (
                          <Badge variant="secondary" className="text-[10px]">{getZoneLabel(recommendedPlayer.id)}</Badge>
                        )}
                        {recommendedPlayer.position && (
                          <Badge variant="outline" className="text-[10px]">{recommendedPlayer.position}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-primary">
                    <Star className="h-3 w-3 fill-current" />
                    <span>Recomendado</span>
                  </div>
                </Button>
                
                {showQuickConfirm && (
                  <Button
                    className="w-full"
                    onClick={handleConfirmEntry}
                    disabled={isLoading}
                  >
                    {isLoading ? 'A registar...' : `Confirmar por #${recommendedPlayer.jersey_number}`}
                  </Button>
                )}
              </div>
            )}
            
            {/* Toggle to show other players */}
            {otherPlayers.length > 0 && selectedLiberoId && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setShowAllPlayers(!showAllPlayers)}
              >
                {showAllPlayers ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Esconder outras opções
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Outras opções ({otherPlayers.length})
                  </>
                )}
              </Button>
            )}
            
            {/* Other players grid */}
            {showAllPlayers && otherPlayers.length > 0 && selectedLiberoId && (
              <div className="grid grid-cols-2 gap-2">
                {otherPlayers.map(player => {
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
            )}
            
            {/* Action buttons when showing all or no recommended */}
            {((showAllPlayers || !hasRecommended) && selectedLiberoId) && (
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
                  disabled={!selectedPlayer || !selectedLiberoId || isLoading}
                >
                  {isLoading ? 'A registar...' : 'Confirmar'}
                </Button>
              </div>
            )}
            
            {/* Skip button when quick confirm is shown */}
            {showQuickConfirm && onSkip && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={onSkip}
                disabled={isLoading}
              >
                Não usar libero neste rally
              </Button>
            )}
            
            {/* Prompt to select libero first */}
            {hasMultipleLiberos && !selectedLiberoId && (
              <p className="text-sm text-center text-muted-foreground">
                Seleciona um líbero para continuar
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Exit prompt
  const exitLibero = libero || (liberoOnCourt ? liberoOnCourt : effectiveLiberos[0]);
  
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
              {exitLibero && (
                <span className="font-medium">#{exitLibero.jersey_number} {exitLibero.name}</span>
              )}
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
