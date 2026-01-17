import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, UserMinus, UserPlus, RefreshCw } from 'lucide-react';
import { MatchPlayer, Player, Side, Substitution } from '@/types/volleyball';

interface SubstitutionModalProps {
  open: boolean;
  onClose: () => void;
  side: Side;
  sideName: string;
  playersOnCourt: (Player | MatchPlayer)[];
  playersOnBench: (Player | MatchPlayer)[];
  substitutionsUsed: number;
  maxSubstitutions: number;
  onSubstitute: (playerOutId: string, playerInId: string, isLibero: boolean) => Promise<void>;
  recentSubstitutions: Substitution[];
  onUndoSubstitution?: (subId: string) => Promise<boolean>;
}

export function SubstitutionModal({
  open,
  onClose,
  side,
  sideName,
  playersOnCourt,
  playersOnBench,
  substitutionsUsed,
  maxSubstitutions,
  onSubstitute,
  recentSubstitutions,
  onUndoSubstitution,
}: SubstitutionModalProps) {
  const [playerOut, setPlayerOut] = useState<string | null>(null);
  const [playerIn, setPlayerIn] = useState<string | null>(null);
  const [isLibero, setIsLibero] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubstitute = !isLibero && substitutionsUsed >= maxSubstitutions;
  const subsRemaining = maxSubstitutions - substitutionsUsed;

  const handleConfirm = async () => {
    if (!playerOut || !playerIn) return;
    setLoading(true);
    try {
      await onSubstitute(playerOut, playerIn, isLibero);
      setPlayerOut(null);
      setPlayerIn(null);
      setIsLibero(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPlayerOut(null);
    setPlayerIn(null);
    setIsLibero(false);
  };

  const selectedOutPlayer = playersOnCourt.find(p => p.id === playerOut);
  const selectedInPlayer = playersOnBench.find(p => p.id === playerIn);

  // Find liberos on bench (position = 'L' or 'Libero')
  const liberosOnBench = playersOnBench.filter(p => 
    p.position?.toLowerCase() === 'l' || p.position?.toLowerCase() === 'libero'
  );

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Substituição - {sideName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Substitution counter */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <span className="text-sm">Substituições usadas</span>
            <Badge variant={subsRemaining <= 1 ? 'destructive' : 'secondary'}>
              {substitutionsUsed} / {maxSubstitutions}
            </Badge>
          </div>

          {/* Libero toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Entrada/Saída Libero</span>
              <span className="text-xs text-muted-foreground">(ilimitado)</span>
            </div>
            <Switch checked={isLibero} onCheckedChange={setIsLibero} />
          </div>

          {/* Player Out Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UserMinus className="h-4 w-4 text-destructive" />
              Jogador que SAI {!isLibero && <span className="text-xs text-muted-foreground">(em campo)</span>}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {playersOnCourt.map((player) => (
                <Button
                  key={player.id}
                  variant={playerOut === player.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPlayerOut(player.id)}
                  className="h-auto py-2 flex flex-col items-center"
                >
                  <span className="text-lg font-bold">#{player.jersey_number}</span>
                  <span className="text-[10px] truncate max-w-full">{player.name.split(' ')[0]}</span>
                  {player.position && (
                    <Badge variant="secondary" className="text-[9px] mt-0.5">
                      {player.position}
                    </Badge>
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Arrow indicator */}
          {playerOut && (
            <div className="flex justify-center">
              <ArrowRight className="h-6 w-6 text-primary animate-pulse" />
            </div>
          )}

          {/* Player In Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />
              Jogador que ENTRA {isLibero && liberosOnBench.length > 0 && <span className="text-xs text-muted-foreground">(liberos destacados)</span>}
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {playersOnBench.map((player) => {
                const isLiberoPlayer = player.position?.toLowerCase() === 'l' || player.position?.toLowerCase() === 'libero';
                return (
                  <Button
                    key={player.id}
                    variant={playerIn === player.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPlayerIn(player.id)}
                    className={`h-auto py-2 flex flex-col items-center ${
                      isLibero && isLiberoPlayer ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <span className="text-lg font-bold">#{player.jersey_number}</span>
                    <span className="text-[10px] truncate max-w-full">{player.name.split(' ')[0]}</span>
                    {player.position && (
                      <Badge 
                        variant={isLiberoPlayer ? 'default' : 'secondary'} 
                        className="text-[9px] mt-0.5"
                      >
                        {player.position}
                      </Badge>
                    )}
                  </Button>
                );
              })}
              {playersOnBench.length === 0 && (
                <div className="col-span-3 text-center text-sm text-muted-foreground py-4">
                  Nenhum jogador no banco
                </div>
              )}
            </div>
          </div>

          {/* Preview */}
          {selectedOutPlayer && selectedInPlayer && (
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="font-medium">
                  #{selectedOutPlayer.jersey_number} {selectedOutPlayer.name.split(' ')[0]}
                </span>
                <ArrowRight className="h-4 w-4" />
                <span className="font-medium">
                  #{selectedInPlayer.jersey_number} {selectedInPlayer.name.split(' ')[0]}
                </span>
                {isLibero && <Badge>Libero</Badge>}
              </div>
            </div>
          )}

          {/* Warning if no subs remaining */}
          {canSubstitute && !isLibero && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              Limite de substituições atingido. Apenas entradas de libero são permitidas.
            </div>
          )}

          {/* Recent substitutions in this set */}
          {recentSubstitutions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Substituições neste set</Label>
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {recentSubstitutions.slice(-5).reverse().map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                    <span>Rally {sub.rally_no}: Troca {sub.is_libero && '(L)'}</span>
                    {onUndoSubstitution && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs"
                        onClick={() => onUndoSubstitution(sub.id)}
                      >
                        Anular
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!playerOut || !playerIn || loading || (canSubstitute && !isLibero)}
          >
            {loading ? 'A guardar...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
