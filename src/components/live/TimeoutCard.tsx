import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Timer, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Side, Timeout, GameState } from '@/types/volleyball';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '@/components/ui/drawer';

interface TimeoutCardProps {
  matchId: string;
  currentSet: number;
  currentRally: number;
  gameState: GameState;
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
  timeouts: Timeout[];
  onTimeoutCalled: (side: Side, notes?: string) => Promise<void>;
}

const MAX_TIMEOUTS_PER_SET = 2;

export function TimeoutCard({
  matchId,
  currentSet,
  currentRally,
  gameState,
  homeName,
  awayName,
  homeColor,
  awayColor,
  timeouts,
  onTimeoutCalled,
}: TimeoutCardProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [selectedSide, setSelectedSide] = useState<Side | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Count timeouts per team in current set
  const homeTimeouts = useMemo(() => 
    timeouts.filter(t => t.side === 'CASA').length, 
    [timeouts]
  );
  const awayTimeouts = useMemo(() => 
    timeouts.filter(t => t.side === 'FORA').length, 
    [timeouts]
  );

  const handleOpen = () => {
    setSelectedSide(null);
    setNotes('');
    setOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedSide) return;
    
    setIsSubmitting(true);
    try {
      await onTimeoutCalled(selectedSide, notes || undefined);
      setOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canCallTimeout = (side: Side) => {
    const used = side === 'CASA' ? homeTimeouts : awayTimeouts;
    return used < MAX_TIMEOUTS_PER_SET;
  };

  const getTimeoutCount = (side: Side) => {
    return side === 'CASA' ? homeTimeouts : awayTimeouts;
  };

  const renderTimeoutBadge = (side: Side, teamName: string, color?: string) => {
    const count = getTimeoutCount(side);
    const isFull = count >= MAX_TIMEOUTS_PER_SET;
    
    return (
      <div 
        className={cn(
          "flex items-center justify-between px-3 py-2 rounded-md border",
          isFull ? "bg-destructive/10 border-destructive/30" : "bg-muted/50"
        )}
        style={color && !isFull ? { borderColor: `${color}40` } : undefined}
      >
        <span className="text-sm font-medium truncate max-w-[80px]">{teamName}</span>
        <Badge 
          variant={isFull ? "destructive" : "secondary"}
          className="text-xs"
        >
          {count}/{MAX_TIMEOUTS_PER_SET}
        </Badge>
      </div>
    );
  };

  const renderContent = () => (
    <div className="space-y-4">
      {/* Team selector */}
      <div className="space-y-2">
        <Label>Equipa</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={selectedSide === 'CASA' ? 'default' : 'outline'}
            className={cn(
              "h-14 flex flex-col gap-1",
              !canCallTimeout('CASA') && "opacity-50"
            )}
            style={selectedSide === 'CASA' && homeColor ? { 
              backgroundColor: homeColor,
              borderColor: homeColor 
            } : homeColor ? { borderColor: homeColor } : undefined}
            onClick={() => canCallTimeout('CASA') && setSelectedSide('CASA')}
            disabled={!canCallTimeout('CASA')}
          >
            <span className="font-semibold">{homeName}</span>
            <span className="text-xs opacity-80">
              {homeTimeouts}/{MAX_TIMEOUTS_PER_SET} usados
            </span>
          </Button>
          <Button
            variant={selectedSide === 'FORA' ? 'default' : 'outline'}
            className={cn(
              "h-14 flex flex-col gap-1",
              !canCallTimeout('FORA') && "opacity-50"
            )}
            style={selectedSide === 'FORA' && awayColor ? { 
              backgroundColor: awayColor,
              borderColor: awayColor 
            } : awayColor ? { borderColor: awayColor } : undefined}
            onClick={() => canCallTimeout('FORA') && setSelectedSide('FORA')}
            disabled={!canCallTimeout('FORA')}
          >
            <span className="font-semibold">{awayName}</span>
            <span className="text-xs opacity-80">
              {awayTimeouts}/{MAX_TIMEOUTS_PER_SET} usados
            </span>
          </Button>
        </div>
      </div>

      {/* Current score display */}
      <div className="flex items-center justify-center gap-4 py-2 bg-muted/30 rounded-md">
        <span className="text-sm text-muted-foreground">Placar atual:</span>
        <span className="font-mono font-bold">
          {gameState.homeScore} - {gameState.awayScore}
        </span>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="timeout-notes">Notas (opcional)</Label>
        <Textarea
          id="timeout-notes"
          placeholder="Observações..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="min-h-[60px] resize-none"
        />
      </div>

      {/* Set history */}
      {timeouts.length > 0 && (
        <div className="space-y-2">
          <Label className="text-muted-foreground">Timeouts neste set:</Label>
          <div className="space-y-1">
            {timeouts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "flex items-center gap-2 text-xs p-2 rounded border",
                  t.side === 'CASA' ? "bg-home/10 border-home/20" : "bg-away/10 border-away/20"
                )}
              >
                <Timer className="h-3 w-3" />
                <span className="font-medium">
                  {t.side === 'CASA' ? homeName : awayName}
                </span>
                <span className="text-muted-foreground">
                  ({t.home_score}-{t.away_score})
                </span>
                <span className="text-muted-foreground ml-auto">
                  #{t.rally_no}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderFooter = () => (
    <div className="flex gap-2 w-full">
      <Button 
        variant="outline" 
        className="flex-1" 
        onClick={() => setOpen(false)}
      >
        Cancelar
      </Button>
      <Button 
        className="flex-1"
        disabled={!selectedSide || isSubmitting}
        onClick={handleConfirm}
      >
        {isSubmitting ? 'A registar...' : 'Registar Timeout'}
      </Button>
    </div>
  );

  return (
    <>
      <Card 
        className="border-muted bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={handleOpen}
      >
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
            <Timer className="h-3.5 w-3.5" />
            Timeouts
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-3 px-3">
          <div className="grid grid-cols-2 gap-2">
            {renderTimeoutBadge('CASA', homeName, homeColor)}
            {renderTimeoutBadge('FORA', awayName, awayColor)}
          </div>
        </CardContent>
      </Card>

      {/* Modal/Drawer */}
      {isMobile ? (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader>
              <DrawerTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Registar Timeout
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-4 overflow-y-auto">
              {renderContent()}
            </div>
            <DrawerFooter>
              {renderFooter()}
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Registar Timeout
              </DialogTitle>
            </DialogHeader>
            {renderContent()}
            <DialogFooter>
              {renderFooter()}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
