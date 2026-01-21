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

// Zone layout for each side - courts face each other across the net
// Back row at top (away from net), Front row at bottom (near net)
// Home (left): Back row Z5-Z6-Z1, Front row Z4-Z3-Z2
// Away (right): Back row Z1-Z6-Z5, Front row Z2-Z3-Z4 (mirrored)
const HOME_ZONES = [
  [5, 6, 1], // Back row (top - away from net)
  [4, 3, 2], // Front row (bottom - near net)
];

const AWAY_ZONES = [
  [1, 6, 5], // Back row (top - away from net, mirrored)
  [2, 3, 4], // Front row (bottom - near net, mirrored)
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
}: {
  side: Side;
  teamName: string;
  players: PlayerInZone[];
  zones: number[][];
  isServing: boolean;
  teamColor?: string;
}) {
  const getPlayerInZone = (zone: number): PlayerInZone | undefined => {
    return players.find(p => p.zone === zone);
  };

  return (
    <div className="flex flex-col gap-1">
      {/* Team header */}
      <div 
        className={cn(
          "text-center py-1.5 px-2 rounded-t-lg font-semibold text-sm flex items-center justify-center gap-2",
          side === 'CASA' ? 'bg-home/20 text-home' : 'bg-away/20 text-away'
        )}
        style={teamColor ? { 
          backgroundColor: `${teamColor}20`,
          color: teamColor 
        } : undefined}
      >
        {isServing && <span className="text-base animate-pulse">🏐</span>}
        <span className="truncate max-w-[100px]">{teamName}</span>
        {isServing && <span className="text-[10px] opacity-70">(a servir)</span>}
      </div>
      
      {/* Court grid */}
      <div className="grid grid-rows-2 gap-0.5 bg-accent/30 p-1 rounded-b-lg border border-accent/30">
        {zones.map((row, rowIdx) => (
          <div key={rowIdx} className="grid grid-cols-3 gap-0.5">
            {row.map((zone) => {
              const playerData = getPlayerInZone(zone);
              const isBackRow = rowIdx === 0; // Back row is now at top (index 0)
              
              return (
                <div
                  key={zone}
                  className={cn(
                    "relative flex flex-col items-center justify-center p-1.5 rounded min-h-[52px] min-w-[56px] transition-all",
                    isBackRow ? "bg-muted/60" : "bg-muted/40",
                    playerData?.isLibero && "bg-warning/30 ring-1 ring-warning/60",
                    playerData?.isServer && "ring-2 ring-primary"
                  )}
                >
                  {/* Zone label */}
                  <span className="absolute top-0.5 left-1 text-[9px] text-muted-foreground/60 font-medium">
                    Z{zone}
                  </span>
                  
                  {playerData ? (
                    <>
                      {/* Jersey number */}
                      <span className={cn(
                        "text-base font-bold leading-none",
                        playerData.isLibero ? "text-warning" : "text-foreground"
                      )}>
                        #{playerData.player.jersey_number}
                      </span>
                      
                      {/* Position badge */}
                      <PositionBadge 
                        position={playerData.player.position} 
                        className="mt-0.5 text-[9px] px-1 py-0"
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
      
      {/* Row labels */}
      <div className="flex justify-between text-[9px] text-muted-foreground/50 px-1">
        <span>↑ Fundo</span>
        <span>Rede ↓</span>
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
      
      {/* Courts side by side - facing each other */}
      <div className="flex flex-col items-center gap-0">
        <div className="flex gap-2 justify-center">
          {/* Home court (left) */}
          <CourtHalf
            side="CASA"
            teamName={homeName}
            players={homePlayersWithZones}
            zones={HOME_ZONES}
            isServing={serveSide === 'CASA'}
            teamColor={homeColor}
          />
          
          {/* Away court (right) */}
          <CourtHalf
            side="FORA"
            teamName={awayName}
            players={awayPlayersWithZones}
            zones={AWAY_ZONES}
            isServing={serveSide === 'FORA'}
            teamColor={awayColor}
          />
        </div>
        
        {/* Net separator - horizontal line between courts */}
        <div className="w-full flex items-center justify-center py-1">
          <div className="flex-1 h-px bg-border/40"></div>
          <span className="px-3 text-[10px] font-medium text-muted-foreground/60 bg-card/50">═══ REDE ═══</span>
          <div className="flex-1 h-px bg-border/40"></div>
        </div>
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
