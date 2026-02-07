import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Side } from '@/types/volleyball';

interface SubstitutionsCardProps {
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
  homeSubsUsed: number;
  awaySubsUsed: number;
  maxSubstitutions: number;
  onOpenSubModal: (side: Side) => void;
}

export function SubstitutionsCard({
  homeName,
  awayName,
  homeColor,
  awayColor,
  homeSubsUsed,
  awaySubsUsed,
  maxSubstitutions,
  onOpenSubModal,
}: SubstitutionsCardProps) {
  
  const renderTeamCell = (
    side: Side,
    teamName: string,
    subsUsed: number,
    color?: string
  ) => {
    const isHome = side === 'CASA';
    const isFull = subsUsed >= maxSubstitutions;
    
    return (
      <Button
        variant="ghost"
        className={cn(
          "flex items-center justify-between px-3 py-2 h-auto rounded-md border",
          "hover:bg-muted/80 transition-colors",
          isFull ? "bg-destructive/10 border-destructive/30" : "bg-muted/50 border-border"
        )}
        style={color && !isFull ? { borderColor: `${color}40` } : undefined}
        onClick={() => onOpenSubModal(side)}
        disabled={isFull}
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: color || (isHome ? 'hsl(var(--home))' : 'hsl(var(--away))') }}
          />
          <span className="text-sm font-medium truncate max-w-[60px]">{teamName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge 
            variant={isFull ? "destructive" : "secondary"}
            className="text-xs"
          >
            {subsUsed}/{maxSubstitutions}
          </Badge>
          <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
      </Button>
    );
  };

  return (
    <Card className="border-muted bg-muted/30">
      <CardHeader className="py-2 px-3">
        <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
          <ArrowRightLeft className="h-3.5 w-3.5" />
          Substituições
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 pb-3 px-3">
        <div className="grid grid-cols-2 gap-2">
          {renderTeamCell('CASA', homeName, homeSubsUsed, homeColor)}
          {renderTeamCell('FORA', awayName, awaySubsUsed, awayColor)}
        </div>
      </CardContent>
    </Card>
  );
}
