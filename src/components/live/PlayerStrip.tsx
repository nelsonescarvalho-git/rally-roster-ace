import { useEffect, useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { MatchPlayer, Player } from '@/types/volleyball';

// Accept both Player and MatchPlayer types
type PlayerLike = (Player | MatchPlayer) & { id: string; jersey_number: number; position?: string | null };

interface PlayerStripProps {
  players: PlayerLike[];
  selectedPlayerId: string | null;
  onSelect: (playerId: string) => void;
  teamSide: 'home' | 'away';
  lastUsedPlayerId?: string;
  showZones?: boolean;
  getZoneLabel?: (playerId: string) => string;
  disabled?: boolean;
  enableKeyboard?: boolean;
}

const POSITION_LABELS: Record<string, string> = {
  'Opposite': 'OP',
  'Outside Hitter': 'OH',
  'Middle Blocker': 'MB',
  'Setter': 'S',
  'Libero': 'L',
  'Defensive Specialist': 'DS',
};

export function PlayerStrip({
  players,
  selectedPlayerId,
  onSelect,
  teamSide,
  lastUsedPlayerId,
  showZones = false,
  getZoneLabel,
  disabled = false,
  enableKeyboard = true,
}: PlayerStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  // Sort players by zone if available, otherwise by jersey number
  const sortedPlayers = [...players].sort((a, b) => {
    if (showZones && getZoneLabel) {
      const zoneA = getZoneLabel(a.id);
      const zoneB = getZoneLabel(b.id);
      if (zoneA && zoneB) {
        return parseInt(zoneA.replace('Z', '')) - parseInt(zoneB.replace('Z', ''));
      }
    }
    return a.jersey_number - b.jersey_number;
  });

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled || !enableKeyboard) return;
    
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const direction = e.key === 'ArrowLeft' ? -1 : 1;
      
      setFocusedIndex(prev => {
        const newIndex = prev + direction;
        if (newIndex < 0) return sortedPlayers.length - 1;
        if (newIndex >= sortedPlayers.length) return 0;
        return newIndex;
      });
    }
    
    if (e.key === 'Enter' && focusedIndex >= 0) {
      e.preventDefault();
      onSelect(sortedPlayers[focusedIndex].id);
    }
  }, [disabled, enableKeyboard, focusedIndex, sortedPlayers, onSelect]);

  useEffect(() => {
    if (enableKeyboard) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enableKeyboard, handleKeyDown]);

  // Auto-select focused player when focus changes
  useEffect(() => {
    if (focusedIndex >= 0 && sortedPlayers[focusedIndex]) {
      const playerButton = containerRef.current?.querySelector(`[data-index="${focusedIndex}"]`);
      playerButton?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [focusedIndex, sortedPlayers]);

  const teamColorClasses = teamSide === 'home' 
    ? 'ring-home border-home bg-home/10' 
    : 'ring-away border-away bg-away/10';

  const teamHoverClasses = teamSide === 'home'
    ? 'hover:border-home/50 hover:bg-home/5'
    : 'hover:border-away/50 hover:bg-away/5';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Selecionar Jogador</span>
        {enableKeyboard && (
          <span className="font-mono">←/→ navegar • Enter selecionar</span>
        )}
      </div>
      
      <div 
        ref={containerRef}
        className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2"
      >
        {sortedPlayers.map((player, index) => {
          const isSelected = selectedPlayerId === player.id;
          const isLastUsed = lastUsedPlayerId === player.id;
          const isFocused = focusedIndex === index;
          const positionLabel = player.position ? POSITION_LABELS[player.position] || player.position?.substring(0, 2).toUpperCase() : '';
          const zoneLabel = showZones && getZoneLabel ? getZoneLabel(player.id) : null;
          const isLibero = player.position === 'Libero';

          return (
            <button
              key={player.id}
              data-index={index}
              disabled={disabled}
              onClick={() => onSelect(player.id)}
              className={cn(
                'relative flex flex-col items-center justify-center p-2 rounded-xl border-2 transition-all duration-150',
                'min-h-[60px] min-w-[60px]',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                disabled && 'opacity-50 cursor-not-allowed',
                isSelected 
                  ? cn('ring-2 ring-offset-2 ring-offset-background', teamColorClasses)
                  : cn('border-border bg-card', teamHoverClasses),
                isFocused && !isSelected && 'ring-2 ring-muted-foreground ring-offset-1',
                isLibero && !isSelected && 'bg-amber-500/10 border-amber-500/30'
              )}
            >
              {/* Last used indicator */}
              {isLastUsed && !isSelected && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-muted-foreground/50" />
              )}
              
              {/* Zone badge */}
              {zoneLabel && (
                <span className="absolute top-0.5 left-1 text-[9px] font-mono text-muted-foreground">
                  {zoneLabel}
                </span>
              )}

              {/* Jersey number */}
              <span className={cn(
                'text-xl font-bold',
                isSelected 
                  ? (teamSide === 'home' ? 'text-home' : 'text-away')
                  : 'text-foreground'
              )}>
                {player.jersey_number}
              </span>

              {/* Position tag */}
              {positionLabel && (
                <span className={cn(
                  'text-[10px] font-medium px-1.5 py-0.5 rounded',
                  isLibero 
                    ? 'bg-warning/20 text-warning'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {positionLabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
