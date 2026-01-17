import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Side, Reason, RallyAction } from '@/types/volleyball';

interface PointFinisherProps {
  actions: RallyAction[];
  homeName: string;
  awayName: string;
  onFinishPoint: (winner: Side, reason: Reason) => void;
  suggestedOutcome?: { winner: Side; reason: Reason } | null;
}

const REASON_OPTIONS: { value: Reason; label: string; emoji: string }[] = [
  { value: 'KILL', label: 'Kill', emoji: '🏐' },
  { value: 'ACE', label: 'ACE', emoji: '🎯' },
  { value: 'SE', label: 'Erro Serviço', emoji: '❌' },
  { value: 'AE', label: 'Erro Ataque', emoji: '💥' },
  { value: 'BLK', label: 'Bloco', emoji: '🚫' },
  { value: 'OP', label: 'Out/Falta', emoji: '📍' },
];

export function PointFinisher({
  actions,
  homeName,
  awayName,
  onFinishPoint,
  suggestedOutcome,
}: PointFinisherProps) {
  // If we have a suggested outcome, show it prominently
  if (suggestedOutcome) {
    return (
      <Card className={cn(
        'border-2',
        suggestedOutcome.winner === 'CASA' 
          ? 'border-home bg-home/10' 
          : 'border-away bg-away/10'
      )}>
        <CardContent className="p-4">
          <div className={cn(
            'text-center font-semibold',
            suggestedOutcome.winner === 'CASA' ? 'text-home' : 'text-away'
          )}>
            <span className="text-lg">{suggestedOutcome.reason}</span>
            <span className="mx-2">•</span>
            <span>
              Ponto {suggestedOutcome.winner === 'CASA' ? homeName : awayName}
            </span>
          </div>
          <Button
            className={cn(
              'w-full mt-3',
              suggestedOutcome.winner === 'CASA' 
                ? 'bg-home hover:bg-home/90' 
                : 'bg-away hover:bg-away/90'
            )}
            onClick={() => onFinishPoint(suggestedOutcome.winner, suggestedOutcome.reason)}
          >
            <Trophy className="h-4 w-4 mr-2" />
            Confirmar Ponto
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Manual point finish UI
  return (
    <Card className="border-2 border-dashed">
      <CardContent className="p-4 space-y-3">
        <div className="text-center">
          <Trophy className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <span className="font-semibold">Terminar Ponto</span>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          {(['CASA', 'FORA'] as Side[]).map((side) => (
            <div key={side} className="space-y-2">
              <div className={cn(
                'text-sm font-medium text-center py-1 rounded',
                side === 'CASA' ? 'bg-home/20 text-home' : 'bg-away/20 text-away'
              )}>
                {side === 'CASA' ? homeName : awayName}
              </div>
              <div className="grid grid-cols-2 gap-1">
                {REASON_OPTIONS.map((reason) => (
                  <Button
                    key={`${side}-${reason.value}`}
                    variant="outline"
                    size="sm"
                    className={cn(
                      'text-xs h-9',
                      side === 'CASA' 
                        ? 'hover:bg-home/20 hover:border-home' 
                        : 'hover:bg-away/20 hover:border-away'
                    )}
                    onClick={() => onFinishPoint(side, reason.value)}
                  >
                    <span className="mr-1">{reason.emoji}</span>
                    {reason.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
