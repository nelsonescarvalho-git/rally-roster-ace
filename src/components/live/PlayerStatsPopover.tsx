import { useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Player, MatchPlayer, Rally } from '@/types/volleyball';
import { cn } from '@/lib/utils';

interface PlayerStatsPopoverProps {
  player: Player | MatchPlayer;
  rallies: Rally[];
  children: React.ReactNode;
  isLibero?: boolean;
}

export function PlayerStatsPopover({ player, rallies, children, isLibero }: PlayerStatsPopoverProps) {
  const stats = useMemo(() => {
    // Get final phase of each rally
    const finalPhases = rallies.reduce((acc, r) => {
      const key = `${r.set_no}-${r.rally_no}`;
      if (!acc[key] || r.phase > acc[key].phase) acc[key] = r;
      return acc;
    }, {} as Record<string, Rally>);
    
    let attacks = 0, kills = 0, attErrors = 0, attBlocked = 0;
    let receptions = 0, perfectRec = 0, recErrors = 0;
    let serves = 0, aces = 0, serveErrors = 0;
    let blocks = 0, blockPoints = 0;
    let digs = 0, digErrors = 0;
    
    Object.values(finalPhases).forEach(r => {
      // Attacks
      if (r.a_player_id === player.id && r.a_code !== null) {
        attacks++;
        if (r.a_code === 3) kills++;
        if (r.a_code === 0) attErrors++;
        if (r.a_code === 1 && r.b_code === 3) attBlocked++;
      }
      // Receptions
      if (r.r_player_id === player.id && r.r_code !== null) {
        receptions++;
        if (r.r_code === 3) perfectRec++;
        if (r.r_code === 0) recErrors++;
      }
      // Serves
      if (r.s_player_id === player.id && r.s_code !== null) {
        serves++;
        if (r.s_code === 3) aces++;
        if (r.s_code === 0) serveErrors++;
      }
      // Blocks
      if ([r.b1_player_id, r.b2_player_id, r.b3_player_id].includes(player.id)) {
        blocks++;
        if (r.b_code === 3) blockPoints++;
      }
      // Digs/Defense
      if (r.d_player_id === player.id && r.d_code !== null) {
        digs++;
        if (r.d_code === 0) digErrors++;
      }
    });
    
    return { 
      attacks, kills, attErrors, attBlocked,
      receptions, perfectRec, recErrors, 
      serves, aces, serveErrors, 
      blocks, blockPoints,
      digs, digErrors
    };
  }, [player.id, rallies]);

  const efficiency = stats.attacks > 0 
    ? ((stats.kills - stats.attErrors - stats.attBlocked) / stats.attacks * 100).toFixed(0) 
    : null;

  const recEfficiency = stats.receptions > 0
    ? ((stats.perfectRec / stats.receptions) * 100).toFixed(0)
    : null;

  const hasStats = stats.attacks > 0 || stats.receptions > 0 || stats.serves > 0 || stats.blocks > 0 || stats.digs > 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" side="top" sideOffset={8}>
        <div className="space-y-2">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <span className={cn(
              "text-lg font-bold",
              isLibero && "text-warning"
            )}>
              #{player.jersey_number}
            </span>
            <span className="text-sm text-muted-foreground truncate flex-1">
              {player.name?.split(' ')[0] || 'Jogador'}
            </span>
          </div>
          
          {hasStats ? (
            <div className="space-y-1.5">
              {/* Attacks */}
              {stats.attacks > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ataque</span>
                  <span className="font-medium">
                    {stats.kills}/{stats.attacks}
                    {efficiency && (
                      <span className={cn(
                        "ml-1.5 text-xs",
                        Number(efficiency) >= 40 ? "text-primary" :
                        Number(efficiency) >= 20 ? "text-warning" : "text-destructive"
                      )}>
                        ({efficiency}%)
                      </span>
                    )}
                  </span>
                </div>
              )}
              
              {/* Receptions */}
              {stats.receptions > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Receção</span>
                  <span className="font-medium">
                    {stats.perfectRec}★/{stats.receptions}
                    {stats.recErrors > 0 && (
                      <span className="text-destructive ml-1.5 text-xs">({stats.recErrors}✗)</span>
                    )}
                  </span>
                </div>
              )}
              
              {/* Serves */}
              {stats.serves > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serviço</span>
                  <span className="font-medium">
                    {stats.aces}★/{stats.serves}
                    {stats.serveErrors > 0 && (
                      <span className="text-destructive ml-1.5 text-xs">({stats.serveErrors}✗)</span>
                    )}
                  </span>
                </div>
              )}
              
              {/* Blocks */}
              {stats.blocks > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bloco</span>
                  <span className="font-medium">
                    {stats.blockPoints} pts
                    <span className="text-muted-foreground ml-1.5 text-xs">/{stats.blocks}</span>
                  </span>
                </div>
              )}
              
              {/* Digs */}
              {stats.digs > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Defesa</span>
                  <span className="font-medium">
                    {stats.digs - stats.digErrors}/{stats.digs}
                    {stats.digErrors > 0 && (
                      <span className="text-destructive ml-1.5 text-xs">({stats.digErrors}✗)</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-3">
              Sem ações registadas
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
