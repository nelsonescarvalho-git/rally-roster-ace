import { cn } from '@/lib/utils';
import { PositionBadge, getPositionConfig } from './PositionBadge';
import { Player, MatchPlayer, Side } from '@/types/volleyball';

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
}: {
  side: Side;
  teamName: string;
  players: PlayerInZone[];
  zones: number[][];
  isServing: boolean;
  teamColor?: string;
  isHome: boolean;
}) {
  const getPlayerInZone = (zone: number): PlayerInZone | undefined => {
    return players.find(p => p.zone === zone);
  };

  // Determine which column is front (near net) vs back
  const getFrontCol = () => isHome ? 1 : 0;
  const getBackCol = () => isHome ? 0 : 1;

  return (
    <div className="flex flex-col gap-1">
      {/* Team header */}
      <div 
        className={cn(
          "text-center py-1 px-2 rounded-t-lg font-semibold text-xs flex items-center justify-center gap-1",
          side === 'CASA' ? 'bg-home/20 text-home' : 'bg-away/20 text-away'
        )}
        style={teamColor ? { 
          backgroundColor: `${teamColor}20`,
          color: teamColor 
        } : undefined}
      >
        {isServing && <span className="text-sm animate-pulse">🏐</span>}
        <span className="truncate max-w-[80px]">{teamName}</span>
      </div>
      
      {/* Court grid - 3 rows × 2 cols */}
      <div className="grid grid-rows-3 gap-0.5 bg-accent/30 p-1 rounded-b-lg border border-accent/30">
        {zones.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-2 gap-0.5">
            {row.map((zone, colIdx) => {
              const playerData = getPlayerInZone(zone);
              const isFrontRow = colIdx === getFrontCol();
              
              return (
                <div
                  key={zone}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-1 rounded min-h-[56px] min-w-[60px] transition-all",
                    isFrontRow ? "bg-muted/40" : "bg-muted/60",
                    playerData?.isLibero && "bg-warning/30 ring-1 ring-warning/60",
                    playerData?.isServer && "ring-2 ring-primary"
                  )}
                >
                  {/* Zone label */}
                  <span className="absolute top-0.5 left-1 text-[8px] text-muted-foreground/60 font-medium">
                    Z{zone}
                  </span>
                  
                  {playerData ? (
                    <>
                      {/* Jersey number */}
                      <span className={cn(
                        "text-lg font-bold leading-none",
                        playerData.isLibero ? "text-warning" : "text-foreground"
                      )}>
                        #{playerData.player.jersey_number}
                      </span>
                      
                      {/* Position badge */}
                      <PositionBadge 
                        position={playerData.player.position} 
                        className="mt-0.5 text-[8px] px-1 py-0"
                      />
                      
                      {/* Server indicator */}
                      {playerData.isServer && (
                        <span className="absolute bottom-0.5 right-0.5 text-xs animate-pulse">
                          🏐
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      
      {/* Column labels */}
      <div className="flex justify-between text-[8px] text-muted-foreground/50 px-1">
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
    <div className="bg-card/50 backdrop-blur-sm rounded-lg p-2 border border-border/50">
      {/* Title */}
      <div className="text-center text-xs text-muted-foreground mb-2 font-medium">
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
        />
        
        {/* Net separator - vertical */}
        <div className="flex flex-col items-center justify-center px-1">
          <div className="w-1 h-full bg-destructive/70 rounded-full relative flex items-center justify-center">
            <span className="absolute bg-card px-0.5 py-2 text-[8px] font-bold text-destructive/80 writing-vertical">
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
        />
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2 text-[9px] text-muted-foreground/70">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-warning/30 ring-1 ring-warning/60"></span>
          Libero
        </span>
        <span className="flex items-center gap-1">
          <span>🏐</span>
          Servidor
        </span>
      </div>
    </div>
  );
}
