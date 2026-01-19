import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PositionBadge } from './PositionBadge';
import { Player, Side } from '@/types/volleyball';

interface PlayerGridProps {
  players: Player[];
  selectedPlayer?: string | null;
  onSelect: (playerId: string) => void;
  side: Side;
  getZoneLabel?: (playerId: string, side: Side) => string;
  /** Grid columns: 3 for compact/modal, 6 for inline */
  columns?: 3 | 6;
  /** Size of buttons */
  size?: 'sm' | 'md';
  /** Allow deselecting by clicking again */
  allowDeselect?: boolean;
  /** Callback when deselecting */
  onDeselect?: () => void;
  /** Highlight color variant */
  variant?: 'default' | 'home' | 'away';
}

export function PlayerGrid({
  players,
  selectedPlayer,
  onSelect,
  side,
  getZoneLabel,
  columns = 6,
  size = 'md',
  allowDeselect = true,
  onDeselect,
  variant = 'default',
}: PlayerGridProps) {
  const handleClick = (playerId: string) => {
    if (selectedPlayer === playerId && allowDeselect) {
      onDeselect?.();
    } else {
      onSelect(playerId);
    }
  };

  // Determine color classes based on variant or side
  const getColorClasses = (isSelected: boolean) => {
    const colorSide = variant !== 'default' ? variant : (side === 'CASA' ? 'home' : 'away');
    
    if (isSelected) {
      return colorSide === 'home' 
        ? 'bg-home text-white border-home ring-2 ring-home ring-offset-1' 
        : 'bg-away text-white border-away ring-2 ring-away ring-offset-1';
    }
    
    return colorSide === 'home'
      ? 'border-home/30 hover:bg-home/10 hover:border-home/50'
      : 'border-away/30 hover:bg-away/10 hover:border-away/50';
  };

  const gridCols = columns === 3 ? 'grid-cols-3' : 'grid-cols-6';
  const buttonHeight = size === 'sm' ? 'h-12' : 'h-14';

  // Sort players by zone if getZoneLabel is provided
  const sortedPlayers = [...players].sort((a, b) => {
    if (getZoneLabel) {
      const zoneA = getZoneLabel(a.id, side);
      const zoneB = getZoneLabel(b.id, side);
      // Sort by zone number (Z1-Z6), empty zones last
      if (!zoneA && zoneB) return 1;
      if (zoneA && !zoneB) return -1;
      return zoneA.localeCompare(zoneB);
    }
    return a.jersey_number - b.jersey_number;
  });

  if (players.length === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        Sem jogadores disponíveis
      </div>
    );
  }

  return (
    <div className={cn('grid gap-1.5', gridCols)}>
      {sortedPlayers.map((player) => {
        const isSelected = selectedPlayer === player.id;
        const zone = getZoneLabel?.(player.id, side) || '';
        const isLibero = player.position?.toUpperCase() === 'L' || player.position?.toUpperCase() === 'LIBERO';

        return (
          <Button
            key={player.id}
            variant="outline"
            className={cn(
              'flex-col gap-0.5 p-1 relative transition-all',
              buttonHeight,
              getColorClasses(isSelected)
            )}
            onClick={() => handleClick(player.id)}
          >
            {/* Zone label - top left corner */}
            {zone && (
              <span className={cn(
                'absolute top-0.5 left-1 text-[9px] font-medium opacity-70',
                isSelected && 'opacity-90'
              )}>
                {zone}
              </span>
            )}
            
            {/* Libero indicator - top right corner */}
            {isLibero && (
              <span className={cn(
                'absolute top-0.5 right-1 text-[9px] font-bold',
                isSelected ? 'text-warning' : 'text-warning'
              )}>
                L
              </span>
            )}
            
            {/* Jersey number - large and central */}
            <span className={cn(
              'text-lg font-bold leading-none',
              size === 'sm' && 'text-base'
            )}>
              {player.jersey_number}
            </span>
            
            {/* Position badge - small below number */}
            <PositionBadge 
              position={player.position} 
              className="text-[8px] px-1 py-0 h-3.5 leading-none" 
            />
          </Button>
        );
      })}
    </div>
  );
}
