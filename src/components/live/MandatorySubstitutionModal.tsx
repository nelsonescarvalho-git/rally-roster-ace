import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, UserX } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Player, MatchPlayer, Side } from '@/types/volleyball';

interface MandatorySubstitutionModalProps {
  open: boolean;
  side: Side;
  playerOut: Player | MatchPlayer;
  validSubstitutes: (Player | MatchPlayer)[];
  exceptionalSubstitutes: (Player | MatchPlayer)[];
  teamColor?: string;
  onSubstitute: (playerInId: string) => Promise<void>;
  onDeclareIncomplete: () => void;
}

export function MandatorySubstitutionModal({
  open,
  side,
  playerOut,
  validSubstitutes,
  exceptionalSubstitutes,
  teamColor,
  onSubstitute,
  onDeclareIncomplete,
}: MandatorySubstitutionModalProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const hasValidSubs = validSubstitutes.length > 0;
  const hasExceptionalSubs = exceptionalSubstitutes.length > 0;
  const canSubstitute = hasValidSubs || hasExceptionalSubs;

  const handleConfirm = async () => {
    if (!selectedPlayer) return;
    setIsLoading(true);
    try {
      await onSubstitute(selectedPlayer);
    } finally {
      setIsLoading(false);
      setSelectedPlayer(null);
    }
  };

  const PlayerCard = ({ player, isExceptional = false }: { player: Player | MatchPlayer; isExceptional?: boolean }) => (
    <Button
      key={player.id}
      variant={selectedPlayer === player.id ? 'default' : 'outline'}
      className={cn(
        "h-auto py-3 flex flex-col items-center",
        selectedPlayer === player.id && "ring-2 ring-primary"
      )}
      style={{ borderColor: teamColor }}
      onClick={() => setSelectedPlayer(player.id)}
    >
      <span className="text-xl font-bold">#{player.jersey_number}</span>
      <span className="text-xs truncate max-w-full">{player.name}</span>
      {player.position && (
        <Badge variant="secondary" className="text-[10px] mt-1">
          {player.position}
        </Badge>
      )}
      {isExceptional && (
        <Badge variant="destructive" className="text-[10px] mt-1">
          15.7
        </Badge>
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <UserX className="h-5 w-5" />
            Substituição Obrigatória
          </DialogTitle>
          <DialogDescription>
            Jogador #{playerOut.jersey_number} ({playerOut.name}) foi removido do jogo.
            Selecione um substituto para manter 6 jogadores em campo.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh]">
          <div className="space-y-4 pr-4">
            {/* Step 1: Legal substitutes */}
            {hasValidSubs && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Substituição Legal</h4>
                <div className="grid grid-cols-3 gap-2">
                  {validSubstitutes.map(player => (
                    <PlayerCard key={player.id} player={player} />
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Exceptional substitutes (rule 15.7) */}
            {!hasValidSubs && hasExceptionalSubs && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm text-warning">Substituição Excecional (15.7)</h4>
                </div>
                <p className="text-xs text-muted-foreground">
                  Sem substitutos legais disponíveis. Qualquer jogador fora de campo 
                  (exceto Liberos) pode entrar.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {exceptionalSubstitutes.map(player => (
                    <PlayerCard key={player.id} player={player} isExceptional />
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: No players available - Team incomplete */}
            {!canSubstitute && (
              <div className="space-y-4 text-center py-4">
                <AlertCircle className="h-12 w-12 mx-auto text-destructive" />
                <div>
                  <p className="font-semibold">Sem Jogadores Disponíveis</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    A equipa será declarada INCOMPLETA (regra 6.4.3).
                  </p>
                  <p className="text-sm text-muted-foreground">
                    O set termina automaticamente com vitória do adversário.
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={onDeclareIncomplete}
                  className="w-full"
                >
                  Marcar Equipa Incompleta
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer - only show if can substitute */}
        {canSubstitute && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              className="flex-1"
              disabled={!selectedPlayer || isLoading}
              onClick={handleConfirm}
            >
              {isLoading ? 'A substituir...' : 'Confirmar Substituição'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
