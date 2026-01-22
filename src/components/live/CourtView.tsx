import { cn } from '@/lib/utils';
import { PositionBadge } from './PositionBadge';
import { PlayerStatsPopover } from './PlayerStatsPopover';
import { Player, MatchPlayer, Side, Rally } from '@/types/volleyball';

interface CourtViewProps {
  currentSet: number;
  currentRally: number;
  serveSide: Side;
  serveRotation: number;
  recvRotation: number;
  homeName: string;
  awayName: string;
  getPlayersOnCourt: (setNo: number, side: Side, rally: number) => (Player | MatchPlayer)[];
  getPlayerZone: (setNo: number, side: Side, playerId: string, rot: number, rally: number) => number | null;
  homeLiberoOnCourt: boolean;
  homeLiberoId: string | null;
  awayLiberoOnCourt: boolean;
  awayLiberoId: string | null;
  homeColor?: string;
  awayColor?: string;
  rallies: Rally[];
}

// Zone layout: 3 rows × 2 cols - courts face each other with vertical net in center
// HOME (left): Col1 = Back court, Col2 = Front court (near net)
// AWAY (right): Col1 = Front court (near net), Col2 = Back court
const HOME_ZONES = [
  [5, 4], // Row 1: Z5 (back), Z4 (front)
  [6, 3], // Row 2: Z6 (back), Z3 (front)
  [1, 2], // Row 3: Z1 (back, server), Z2 (front)
];

const AWAY_ZONES = [
  [2, 1], // Row 1: Z2 (front), Z1 (back)
  [3, 6], // Row 2: Z3 (front), Z6 (back)
  [4, 5], // Row 3: Z4 (front), Z5 (back)
];

interface PlayerInZone {
  player: Player | MatchPlayer;
  zone: number;
  isLibero: boolean;
  isServer: boolean;
}

function CourtHalf({
  side,
  teamName,
  players,
  zones,
  isServing,
  teamColor,
  isHome,
  rallies,
  currentSet,
}: {
  side: Side;
  teamName: string;
  players: PlayerInZone[];
  zones: number[][];
  isServing: boolean;
  teamColor?: string;
  isHome: boolean;
  rallies: Rally[];
  currentSet: number;
}) {
  const getPlayerInZone = (zone: number): PlayerInZone | undefined => {
    return players.find(p => p.zone === zone);
  };

  // Determine which column is front (near net) vs back
  const getFrontCol = () => isHome ? 1 : 0;

  return (
    <div className="flex flex-col gap-1 lg:gap-2">
      {/* Team header */}
      <div 
        className={cn(
          "text-center py-1.5 lg:py-2 px-2 lg:px-3 rounded-t-lg font-semibold text-xs lg:text-sm flex items-center justify-center gap-1.5 lg:gap-2",
          side === 'CASA' ? 'bg-home/20 text-home' : 'bg-away/20 text-away'
        )}
        style={teamColor ? { 
          backgroundColor: `${teamColor}20`,
          color: teamColor 
        } : undefined}
      >
        {isServing && <span className="text-sm lg:text-lg animate-pulse">🏐</span>}
        <span className="truncate max-w-[80px] lg:max-w-[120px] xl:max-w-[160px]">{teamName}</span>
      </div>
      
      {/* Court grid - 3 rows × 2 cols */}
      <div className="grid grid-rows-3 gap-1 bg-accent/30 p-2 rounded-b-lg border border-accent/30">
        {zones.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-2 gap-1">
            {row.map((zone, colIdx) => {
              const playerData = getPlayerInZone(zone);
              const isFrontRow = colIdx === getFrontCol();
              
              return (
                <div
                  key={zone}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-1.5 lg:p-2 rounded",
                    "min-h-[48px] min-w-[70px] lg:min-h-[60px] lg:min-w-[100px] xl:min-h-[72px] xl:min-w-[120px]",
                    "transition-all",
                    isFrontRow ? "bg-muted/40" : "bg-muted/60",
                    playerData?.isLibero && "bg-warning/30 ring-1 ring-warning/60",
                    playerData?.isServer && "ring-2 ring-primary"
                  )}
                >
                  {/* Zone label */}
                  <span className="absolute top-0.5 left-1 lg:top-1 lg:left-2 text-[10px] lg:text-xs text-muted-foreground/60 font-medium">
                    Z{zone}
                  </span>
                  
                  {playerData ? (
                    <PlayerStatsPopover 
                      player={playerData.player} 
                      rallies={rallies}
                      isLibero={playerData.isLibero}
                      currentSet={currentSet}
                    >
                      <button className="flex flex-col items-center cursor-pointer hover:bg-accent/50 rounded p-1 transition-colors">
                        {/* Jersey number */}
                        <span className={cn(
                          "text-lg lg:text-xl xl:text-2xl font-bold leading-none",
                          playerData.isLibero ? "text-warning" : "text-foreground"
                        )}>
                          #{playerData.player.jersey_number}
                        </span>
                        
                        {/* Position badge */}
                        <PositionBadge 
                          position={playerData.player.position} 
                          className="mt-0.5 lg:mt-1 text-[10px] lg:text-xs px-1.5 lg:px-2 py-0.5"
                        />
                        
                        {/* Server indicator */}
                        {playerData.isServer && (
                          <span className="absolute bottom-0.5 right-0.5 lg:bottom-1 lg:right-1 text-sm lg:text-base animate-pulse">
                            🏐
                          </span>
                        )}
                      </button>
                    </PlayerStatsPopover>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs lg:text-sm">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Column labels - hidden on mobile, visible on larger screens */}
      <div className="hidden lg:flex justify-between text-xs xl:text-sm text-muted-foreground/50 px-2">
        {isHome ? (
          <>
            <span>Fundo</span>
            <span>Rede →</span>
          </>
        ) : (
          <>
            <span>← Rede</span>
            <span>Fundo</span>
          </>
        )}
      </div>
    </div>
  );
}

export function CourtView({
  currentSet,
  currentRally,
  serveSide,
  serveRotation,
  recvRotation,
  homeName,
  awayName,
  getPlayersOnCourt,
  getPlayerZone,
  homeLiberoOnCourt,
  homeLiberoId,
  awayLiberoOnCourt,
  awayLiberoId,
  homeColor,
  awayColor,
  rallies,
}: CourtViewProps) {
  // Get players on court for each side
  const homePlayers = getPlayersOnCourt(currentSet, 'CASA', currentRally);
  const awayPlayers = getPlayersOnCourt(currentSet, 'FORA', currentRally);
  
  // Determine rotations
  const homeRotation = serveSide === 'CASA' ? serveRotation : recvRotation;
  const awayRotation = serveSide === 'FORA' ? serveRotation : recvRotation;
  
  // Map players to zones with metadata
  const mapPlayersToZones = (
    players: (Player | MatchPlayer)[],
    side: Side,
    rotation: number,
    liberoOnCourt: boolean,
    liberoId: string | null,
    isServing: boolean
  ): PlayerInZone[] => {
    return players.map(player => {
      const zone = getPlayerZone(currentSet, side, player.id, rotation, currentRally);
      const isLibero = liberoOnCourt && player.id === liberoId;
      const isServer = isServing && zone === 1;
      
      return {
        player,
        zone: zone ?? 0,
        isLibero,
        isServer,
      };
    }).filter(p => p.zone > 0);
  };
  
  const homePlayersWithZones = mapPlayersToZones(
    homePlayers, 
    'CASA', 
    homeRotation, 
    homeLiberoOnCourt, 
    homeLiberoId,
    serveSide === 'CASA'
  );
  
  const awayPlayersWithZones = mapPlayersToZones(
    awayPlayers, 
    'FORA', 
    awayRotation, 
    awayLiberoOnCourt, 
    awayLiberoId,
    serveSide === 'FORA'
  );

  return (
    <div className="bg-card/50 backdrop-blur-sm rounded-lg p-1.5 lg:p-2 border border-border/50">
      {/* Title - hidden on mobile */}
      <div className="hidden lg:block text-center text-xs text-muted-foreground mb-2 font-medium">
        Campo em Tempo Real
      </div>
      
      {/* Courts side by side with vertical net */}
      <div className="flex items-stretch justify-center gap-0">
        {/* Home court (left) */}
        <CourtHalf
          side="CASA"
          teamName={homeName}
          players={homePlayersWithZones}
          zones={HOME_ZONES}
          isServing={serveSide === 'CASA'}
          teamColor={homeColor}
          isHome={true}
          rallies={rallies}
          currentSet={currentSet}
        />
        
        {/* Net separator - vertical */}
        <div className="flex flex-col items-center justify-center px-0.5 lg:px-1">
          <div className="w-0.5 lg:w-1 h-full bg-destructive/70 rounded-full relative flex items-center justify-center">
            <span className="absolute bg-card px-0.5 py-1 lg:py-2 text-[6px] lg:text-[8px] font-bold text-destructive/80 writing-vertical">
              REDE
            </span>
          </div>
        </div>
        
        {/* Away court (right) */}
        <CourtHalf
          side="FORA"
          teamName={awayName}
          players={awayPlayersWithZones}
          zones={AWAY_ZONES}
          isServing={serveSide === 'FORA'}
          teamColor={awayColor}
          isHome={false}
          rallies={rallies}
          currentSet={currentSet}
        />
      </div>
      
      {/* Legend - hidden on mobile */}
      <div className="hidden lg:flex justify-center gap-4 xl:gap-6 mt-2 lg:mt-3 text-xs lg:text-sm text-muted-foreground/70">
        <span className="flex items-center gap-1.5 lg:gap-2">
          <span className="w-3 h-3 lg:w-4 lg:h-4 rounded bg-warning/30 ring-1 ring-warning/60"></span>
          Libero
        </span>
        <span className="flex items-center gap-1.5 lg:gap-2">
          <span className="text-sm lg:text-lg">🏐</span>
          Servidor
        </span>
      </div>
    </div>
  );
}
