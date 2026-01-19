import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ColoredRatingButton } from './ColoredRatingButton';
import { Zap, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Side } from '@/types/volleyball';

interface LastAttacker {
  playerId: string;
  playerNumber: number;
  playerName: string;
  side: Side;
}

interface QuickAttackBarProps {
  lastAttacker: LastAttacker;
  onQuickAttack: (code: number) => void;
  onChangePlayer: () => void;
  teamColor: 'home' | 'away';
}

export function QuickAttackBar({ 
  lastAttacker, 
  onQuickAttack, 
  onChangePlayer,
  teamColor 
}: QuickAttackBarProps) {
  const bgColor = teamColor === 'home' 
    ? 'bg-home/10 border-home/30' 
    : 'bg-away/10 border-away/30';
  
  const textColor = teamColor === 'home' ? 'text-home' : 'text-away';

  return (
    <Card className={cn("border", bgColor)}>
      <CardContent className="p-3">
        {/* Header com info do jogador */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium">Ataque Rápido</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onChangePlayer}
            className="text-xs h-7 px-2"
          >
            <Users className="h-3 w-3 mr-1" />
            Mudar
          </Button>
        </div>

        {/* Jogador atual */}
        <div className="flex items-center gap-2 mb-3 p-2 bg-muted/50 rounded">
          <Badge variant="outline" className={cn("text-lg font-bold", textColor)}>
            #{lastAttacker.playerNumber}
          </Badge>
          <span className="text-sm truncate">{lastAttacker.playerName}</span>
        </div>

        {/* Botões de código - 1 toque! */}
        <div className="grid grid-cols-4 gap-2">
          <ColoredRatingButton 
            code={0} 
            selected={false} 
            onClick={() => onQuickAttack(0)}
            size="lg"
          />
          <ColoredRatingButton 
            code={1} 
            selected={false} 
            onClick={() => onQuickAttack(1)}
            size="lg"
          />
          <ColoredRatingButton 
            code={2} 
            selected={false} 
            onClick={() => onQuickAttack(2)}
            size="lg"
          />
          <ColoredRatingButton 
            code={3} 
            selected={false} 
            onClick={() => onQuickAttack(3)}
            size="lg"
          />
        </div>

        <p className="text-xs text-muted-foreground text-center mt-2">
          Toca no resultado para registar ataque instantâneo
        </p>
      </CardContent>
    </Card>
  );
}
