import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ArrowRightLeft, UserCheck, UserMinus, Users, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Side, Player, MatchPlayer } from '@/types/volleyball';

interface SubsLiberosCardProps {
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
  // Libero state
  homeLiberoOnCourt: boolean;
  homeLiberoPlayer: (Player | MatchPlayer) | null;
  awayLiberoOnCourt: boolean;
  awayLiberoPlayer: (Player | MatchPlayer) | null;
  // Substitutions
  homeSubsUsed: number;
  awaySubsUsed: number;
  maxSubstitutions: number;
  // Callbacks
  onOpenSubModal: (side: Side) => void;
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

export function SubsLiberosCard({
  homeName,
  awayName,
  homeColor,
  awayColor,
  homeLiberoOnCourt,
  homeLiberoPlayer,
  awayLiberoOnCourt,
  awayLiberoPlayer,
  homeSubsUsed,
  awaySubsUsed,
  maxSubstitutions,
  onOpenSubModal,
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
}: SubsLiberosCardProps) {
  
  const renderLiberoStatus = (
    side: Side,
    isOnCourt: boolean,
    liberoPlayer: (Player | MatchPlayer) | null,
    canEnter: boolean,
    mustExit: boolean,
    hasLibero: boolean,
    canSwap: boolean,
    color?: string
  ) => {
    // No libero available
    if (!hasLibero) {
      return (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <UserMinus className="h-3.5 w-3.5" />
          <span>Sem líbero</span>
        </div>
      );
    }

    // Must exit - urgent state
    if (mustExit && isOnCourt && liberoPlayer) {
      return (
        <Button
          variant="destructive"
          size="sm"
          className="h-7 text-xs gap-1 animate-pulse"
          onClick={(e) => {
            e.stopPropagation();
            onLiberoExit(side);
          }}
        >
          <UserMinus className="h-3.5 w-3.5" />
          #{liberoPlayer.jersey_number} Sair
        </Button>
      );
    }

    // On court - can exit or swap
    if (isOnCourt && liberoPlayer) {
      return (
        <div className="flex items-center gap-2">
          <Badge 
            variant="secondary"
            className="text-xs gap-1 border-primary/30"
          >
            <UserCheck className="h-3 w-3 text-primary" />
            #{liberoPlayer.jersey_number}
          </Badge>
          {canSwap && onLiberoSwap && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2 text-accent-foreground hover:text-accent-foreground hover:bg-accent/20"
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
            className="h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onLiberoExit(side);
            }}
          >
            Sair
          </Button>
        </div>
      );
    }

    // Can enter - prompt available
    if (canEnter) {
      return (
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs gap-1 border-accent hover:bg-accent/20"
          onClick={(e) => {
            e.stopPropagation();
            onLiberoEntry(side);
          }}
        >
          <UserCheck className="h-3.5 w-3.5" />
          Entrar
        </Button>
      );
    }

    // Off court - default state
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <UserMinus className="h-3.5 w-3.5" />
        <span>Disponível</span>
      </div>
    );
  };

  const renderTeamSection = (
    side: Side,
    teamName: string,
    color: string | undefined,
    isOnCourt: boolean,
    liberoPlayer: (Player | MatchPlayer) | null,
    subsUsed: number,
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

        {/* Libero status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Líbero</span>
          {renderLiberoStatus(side, isOnCourt, liberoPlayer, canEnter, mustExit, hasLibero, canSwap, color)}
        </div>

        {/* Substitutions */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Subs</span>
          <div className="flex items-center gap-2">
            <Badge 
              variant={subsUsed >= maxSubstitutions ? "destructive" : "secondary"}
              className="text-xs"
            >
              {subsUsed}/{maxSubstitutions}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={(e) => {
                e.stopPropagation();
                onOpenSubModal(side);
              }}
              disabled={subsUsed >= maxSubstitutions}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-muted bg-muted/30">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Líbero & Substituições
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
            homeSubsUsed,
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
            awaySubsUsed,
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
