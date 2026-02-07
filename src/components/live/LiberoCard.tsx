import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserCheck, UserMinus, User, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Side, Player, MatchPlayer } from '@/types/volleyball';

interface LiberoCardProps {
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
  // Libero state
  homeLiberoOnCourt: boolean;
  homeLiberoPlayer: (Player | MatchPlayer) | null;
  awayLiberoOnCourt: boolean;
  awayLiberoPlayer: (Player | MatchPlayer) | null;
  // Callbacks
  onLiberoEntry: (side: Side) => void;
  onLiberoExit: (side: Side) => void;
  onLiberoSwap?: (side: Side) => void;
  // Eligibility
  homeCanEnterLibero: boolean;
  awayCanEnterLibero: boolean;
  homeMustExitLibero: boolean;
  awayMustExitLibero: boolean;
  // L-L Swap eligibility
  homeCanSwapLibero?: boolean;
  awayCanSwapLibero?: boolean;
  // Optional: available liberos
  homeHasLibero?: boolean;
  awayHasLibero?: boolean;
}

export function LiberoCard({
  homeName,
  awayName,
  homeColor,
  awayColor,
  homeLiberoOnCourt,
  homeLiberoPlayer,
  awayLiberoOnCourt,
  awayLiberoPlayer,
  onLiberoEntry,
  onLiberoExit,
  onLiberoSwap,
  homeCanEnterLibero,
  awayCanEnterLibero,
  homeMustExitLibero,
  awayMustExitLibero,
  homeCanSwapLibero = false,
  awayCanSwapLibero = false,
  homeHasLibero = true,
  awayHasLibero = true,
}: LiberoCardProps) {
  
  const renderLiberoStatus = (
    side: Side,
    isOnCourt: boolean,
    liberoPlayer: (Player | MatchPlayer) | null,
    canEnter: boolean,
    mustExit: boolean,
    hasLibero: boolean,
    canSwap: boolean
  ) => {
    const isHome = side === 'CASA';
    
    // No libero available
    if (!hasLibero) {
      return (
        <div className="flex items-center justify-center h-10 text-xs text-muted-foreground">
          <UserMinus className="h-3.5 w-3.5 mr-1.5" />
          Sem líbero
        </div>
      );
    }

    // Must exit - urgent state (pulsing red)
    if (mustExit && isOnCourt && liberoPlayer) {
      return (
        <div className="space-y-2">
          <Badge 
            variant="destructive"
            className="w-full justify-center text-xs py-1 animate-pulse"
          >
            <UserCheck className="h-3 w-3 mr-1" />
            #{liberoPlayer.jersey_number} Deve sair!
          </Badge>
          <Button
            variant="destructive"
            size="sm"
            className="w-full h-8 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onLiberoExit(side);
            }}
          >
            <UserMinus className="h-3.5 w-3.5 mr-1" />
            Sair Agora
          </Button>
        </div>
      );
    }

    // On court - can exit or swap
    if (isOnCourt && liberoPlayer) {
      return (
        <div className="space-y-2">
          <Badge 
            variant="secondary"
            className="w-full justify-center text-xs py-1 border-primary/30"
          >
            <UserCheck className="h-3 w-3 mr-1 text-primary" />
            #{liberoPlayer.jersey_number} Em campo
          </Badge>
          <div className="flex gap-1.5">
            {canSwap && onLiberoSwap && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1 h-7 text-xs px-2 border-accent hover:bg-accent/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onLiberoSwap(side);
                }}
                title="Trocar por outro líbero"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Trocar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 text-xs px-2 text-muted-foreground hover:text-foreground",
                canSwap ? "flex-1" : "w-full"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onLiberoExit(side);
              }}
            >
              <UserMinus className="h-3 w-3 mr-1" />
              Sair
            </Button>
          </div>
        </div>
      );
    }

    // Can enter - prompt available
    if (canEnter) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-center h-6 text-xs text-muted-foreground">
            <UserMinus className="h-3.5 w-3.5 mr-1.5" />
            Disponível
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs border-accent hover:bg-accent/20"
            onClick={(e) => {
              e.stopPropagation();
              onLiberoEntry(side);
            }}
          >
            <UserCheck className="h-3.5 w-3.5 mr-1" />
            Entrar
          </Button>
        </div>
      );
    }

    // Off court - default state (not eligible to enter)
    return (
      <div className="flex items-center justify-center h-10 text-xs text-muted-foreground">
        <UserMinus className="h-3.5 w-3.5 mr-1.5" />
        Disponível
      </div>
    );
  };

  const renderTeamSection = (
    side: Side,
    teamName: string,
    color: string | undefined,
    isOnCourt: boolean,
    liberoPlayer: (Player | MatchPlayer) | null,
    canEnter: boolean,
    mustExit: boolean,
    hasLibero: boolean,
    canSwap: boolean
  ) => {
    const isHome = side === 'CASA';
    
    return (
      <div className="flex-1 space-y-2">
        {/* Team header */}
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color || (isHome ? 'hsl(var(--home))' : 'hsl(var(--away))') }}
          />
          <span className="text-xs font-medium truncate">{teamName}</span>
        </div>

        {/* Libero status and actions */}
        {renderLiberoStatus(side, isOnCourt, liberoPlayer, canEnter, mustExit, hasLibero, canSwap)}
      </div>
    );
  };

  return (
    <Card className="border-muted bg-muted/30">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          Líbero
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-3">
        <div className="flex gap-3">
          {renderTeamSection(
            'CASA',
            homeName,
            homeColor,
            homeLiberoOnCourt,
            homeLiberoPlayer,
            homeCanEnterLibero,
            homeMustExitLibero,
            homeHasLibero,
            homeCanSwapLibero
          )}
          
          <Separator orientation="vertical" className="h-auto" />
          
          {renderTeamSection(
            'FORA',
            awayName,
            awayColor,
            awayLiberoOnCourt,
            awayLiberoPlayer,
            awayCanEnterLibero,
            awayMustExitLibero,
            awayHasLibero,
            awayCanSwapLibero
          )}
        </div>
      </CardContent>
    </Card>
  );
}
