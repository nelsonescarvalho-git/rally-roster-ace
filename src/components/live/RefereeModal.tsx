import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';
import { PlayerSelectorPopup } from './PlayerSelectorPopup';
import { 
  AlertTriangle, 
  XCircle, 
  UserX, 
  Ban, 
  Clock,
  User,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { 
  Player, 
  MatchPlayer, 
  Side, 
  SanctionType, 
  Sanction,
  GameState,
  SANCTION_CONFIG,
} from '@/types/volleyball';

interface RefereeModalProps {
  open: boolean;
  onClose: () => void;
  matchId: string;
  currentSet: number;
  currentRally: number;
  gameState: GameState;
  playersOnCourt: { casa: (Player | MatchPlayer)[]; fora: (Player | MatchPlayer)[] };
  playersOnBench: { casa: (Player | MatchPlayer)[]; fora: (Player | MatchPlayer)[] };
  homeName: string;
  awayName: string;
  homeColor?: string;
  awayColor?: string;
  onSanctionApplied: (sanction: Partial<Sanction>) => Promise<void>;
}

const SANCTION_TYPES: Array<{
  id: SanctionType;
  label: string;
  desc: string;
  color: string;
  icon: React.ElementType;
  givesPoint: boolean;
  givesServe: boolean;
  removesPlayer: boolean;
  removalUntil: 'SET' | 'MATCH' | null;
}> = [
  { 
    id: 'WARNING', 
    label: 'Aviso', 
    desc: 'Cartão amarelo',
    color: 'bg-yellow-500', 
    icon: AlertTriangle,
    givesPoint: false,
    givesServe: false,
    removesPlayer: false,
    removalUntil: null,
  },
  { 
    id: 'PENALTY', 
    label: 'Penalidade', 
    desc: 'Cartão vermelho - ponto ao adversário',
    color: 'bg-red-500', 
    icon: XCircle,
    givesPoint: true,
    givesServe: true,
    removesPlayer: false,
    removalUntil: null,
  },
  { 
    id: 'EXPULSION', 
    label: 'Expulsão', 
    desc: 'Am+Ver - fora até fim do set',
    color: 'bg-red-700', 
    icon: UserX,
    givesPoint: false,
    givesServe: false,
    removesPlayer: true,
    removalUntil: 'SET',
  },
  { 
    id: 'DISQUALIFICATION', 
    label: 'Desqualificação', 
    desc: 'Ver+Am - fora até fim do jogo',
    color: 'bg-red-900', 
    icon: Ban,
    givesPoint: false,
    givesServe: false,
    removesPlayer: true,
    removalUntil: 'MATCH',
  },
  { 
    id: 'DELAY_WARNING', 
    label: 'Atraso (Aviso)', 
    desc: 'Atraso - sem efeito',
    color: 'bg-orange-400', 
    icon: Clock,
    givesPoint: false,
    givesServe: false,
    removesPlayer: false,
    removalUntil: null,
  },
  { 
    id: 'DELAY_PENALTY', 
    label: 'Atraso (Penalidade)', 
    desc: 'Atraso - ponto ao adversário',
    color: 'bg-orange-600', 
    icon: Clock,
    givesPoint: true,
    givesServe: true,
    removesPlayer: false,
    removalUntil: null,
  },
];

export function RefereeModal({
  open,
  onClose,
  matchId,
  currentSet,
  currentRally,
  gameState,
  playersOnCourt,
  playersOnBench,
  homeName,
  awayName,
  homeColor,
  awayColor,
  onSanctionApplied,
}: RefereeModalProps) {
  const isMobile = useIsMobile();
  
  // State
  const [side, setSide] = useState<Side | null>(null);
  const [selectedType, setSelectedType] = useState<SanctionType | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | MatchPlayer | null>(null);
  const [isCoachStaff, setIsCoachStaff] = useState(false);
  const [coachStaffName, setCoachStaffName] = useState('');
  const [notes, setNotes] = useState('');
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const reset = () => {
    setSide(null);
    setSelectedType(null);
    setSelectedPlayer(null);
    setIsCoachStaff(false);
    setCoachStaffName('');
    setNotes('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const selectedTypeConfig = useMemo(() => 
    SANCTION_TYPES.find(t => t.id === selectedType), 
    [selectedType]
  );

  const currentPlayers = useMemo(() => {
    if (!side) return { court: [], bench: [] };
    return {
      court: side === 'CASA' ? playersOnCourt.casa : playersOnCourt.fora,
      bench: side === 'CASA' ? playersOnBench.casa : playersOnBench.fora,
    };
  }, [side, playersOnCourt, playersOnBench]);

  const teamColor = side === 'CASA' ? homeColor : awayColor;

  const canApply = side && selectedType && (selectedPlayer || (isCoachStaff && coachStaffName.trim()));

  const handleApply = async () => {
    if (!canApply || !selectedTypeConfig) return;

    setIsLoading(true);
    try {
      const courtSnapshot = side === 'CASA' 
        ? playersOnCourt.casa.map((p, i) => ({
            player_id: p.id,
            jersey: p.jersey_number,
            position: p.position,
            zone: i + 1,
          }))
        : playersOnCourt.fora.map((p, i) => ({
            player_id: p.id,
            jersey: p.jersey_number,
            position: p.position,
            zone: i + 1,
          }));

      await onSanctionApplied({
        match_id: matchId,
        set_no: currentSet,
        rally_no: currentRally,
        sanction_type: selectedType,
        side: side,
        player_id: selectedPlayer?.id || null,
        player_jersey: selectedPlayer?.jersey_number || null,
        player_name: selectedPlayer?.name || null,
        is_coach_staff: isCoachStaff,
        coach_staff_name: isCoachStaff ? coachStaffName : null,
        gives_point: selectedTypeConfig.givesPoint,
        gives_serve: selectedTypeConfig.givesServe,
        removes_player: selectedTypeConfig.removesPlayer,
        removal_until: selectedTypeConfig.removalUntil,
        serve_side: gameState.serveSide,
        serve_rot: gameState.serveRot,
        home_score: gameState.homeScore,
        away_score: gameState.awayScore,
        court_snapshot: courtSnapshot,
        notes: notes.trim() || null,
      });

      handleClose();
    } finally {
      setIsLoading(false);
    }
  };

  const content = (
    <ScrollArea className="max-h-[70vh] pr-4">
      <div className="space-y-6 pb-4">
        {/* Step 1: Team selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">1. Equipa</Label>
          <div className="flex gap-2">
            <Button
              variant={side === 'CASA' ? 'default' : 'outline'}
              className="flex-1 h-12"
              style={side === 'CASA' ? { backgroundColor: homeColor } : { borderColor: homeColor }}
              onClick={() => { setSide('CASA'); setSelectedPlayer(null); setIsCoachStaff(false); }}
            >
              {homeName}
            </Button>
            <Button
              variant={side === 'FORA' ? 'default' : 'outline'}
              className="flex-1 h-12"
              style={side === 'FORA' ? { backgroundColor: awayColor } : { borderColor: awayColor }}
              onClick={() => { setSide('FORA'); setSelectedPlayer(null); setIsCoachStaff(false); }}
            >
              {awayName}
            </Button>
          </div>
        </div>

        {/* Step 2: Sanction type */}
        {side && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">2. Tipo de Sanção</Label>
            <div className="grid grid-cols-2 gap-2">
              {SANCTION_TYPES.map(type => {
                const Icon = type.icon;
                return (
                  <Card
                    key={type.id}
                    className={cn(
                      "cursor-pointer hover:ring-2 hover:ring-primary/50 p-3 transition-all",
                      selectedType === type.id && "ring-2 ring-primary"
                    )}
                    onClick={() => setSelectedType(type.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={cn("w-3 h-8 rounded", type.color)} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm flex items-center gap-1">
                          <Icon className="h-3.5 w-3.5" />
                          {type.label}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {type.desc}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Offender selection */}
        {side && selectedType && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">3. Infrator</Label>
            
            <div className="flex gap-2">
              <Button
                variant={!isCoachStaff ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setIsCoachStaff(false); setCoachStaffName(''); }}
              >
                <User className="h-4 w-4 mr-1" />
                Jogador
              </Button>
              <Button
                variant={isCoachStaff ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setIsCoachStaff(true); setSelectedPlayer(null); }}
              >
                Coach/Staff
              </Button>
            </div>

            {!isCoachStaff ? (
              <div className="space-y-2">
                {selectedPlayer ? (
                  <Card 
                    className="p-3 cursor-pointer hover:bg-accent/50"
                    style={{ borderColor: teamColor }}
                    onClick={() => setShowPlayerPicker(true)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">#{selectedPlayer.jersey_number}</span>
                      <div>
                        <div className="font-medium">{selectedPlayer.name}</div>
                        {selectedPlayer.position && (
                          <Badge variant="secondary" className="text-[10px]">
                            {selectedPlayer.position}
                          </Badge>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="ml-auto">
                        Alterar
                      </Button>
                    </div>
                  </Card>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full h-12"
                    style={{ borderColor: teamColor }}
                    onClick={() => setShowPlayerPicker(true)}
                  >
                    Selecionar Jogador
                  </Button>
                )}
              </div>
            ) : (
              <Input
                placeholder="Nome do coach/staff..."
                value={coachStaffName}
                onChange={(e) => setCoachStaffName(e.target.value)}
              />
            )}
          </div>
        )}

        {/* Step 4: Notes */}
        {side && selectedType && (selectedPlayer || (isCoachStaff && coachStaffName)) && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">4. Notas (opcional)</Label>
            <Textarea
              placeholder="Observações..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[60px] resize-none"
            />
          </div>
        )}

        {/* Summary */}
        {selectedTypeConfig && canApply && (
          <Card className="p-3 bg-muted/50">
            <div className="text-sm space-y-1">
              <div className="font-medium">Resumo:</div>
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-4 rounded", selectedTypeConfig.color)} />
                <span>{selectedTypeConfig.label}</span>
                <span className="text-muted-foreground">→</span>
                <span>{side === 'CASA' ? homeName : awayName}</span>
              </div>
              {selectedTypeConfig.givesPoint && (
                <Badge variant="destructive" className="text-[10px]">
                  Ponto + Serviço para {side === 'CASA' ? awayName : homeName}
                </Badge>
              )}
              {selectedTypeConfig.removesPlayer && (
                <Badge variant="destructive" className="text-[10px]">
                  Jogador removido até fim do {selectedTypeConfig.removalUntil === 'SET' ? 'set' : 'jogo'}
                </Badge>
              )}
            </div>
          </Card>
        )}
      </div>
    </ScrollArea>
  );

  const footer = (
    <div className="flex gap-2 pt-4 border-t">
      <Button variant="outline" className="flex-1" onClick={handleClose}>
        Cancelar
      </Button>
      <Button 
        className="flex-1" 
        disabled={!canApply || isLoading}
        onClick={handleApply}
      >
        {isLoading ? 'A aplicar...' : 'Aplicar Sanção'}
      </Button>
    </div>
  );

  // Player selector popup
  const playerPicker = (
    <PlayerSelectorPopup
      open={showPlayerPicker}
      onClose={() => setShowPlayerPicker(false)}
      onSelectPlayer={setSelectedPlayer}
      playersOnCourt={currentPlayers.court}
      playersOnBench={currentPlayers.bench}
      teamColor={teamColor}
      title="Selecionar Infrator"
    />
  );

  if (isMobile) {
    return (
      <>
        <Drawer open={open} onOpenChange={(o) => !o && handleClose()}>
          <DrawerContent className="max-h-[85vh]">
            <DrawerHeader className="border-b pb-4">
              <DrawerTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Menu Árbitro
              </DrawerTitle>
            </DrawerHeader>
            <div className="p-4 flex flex-col">
              {content}
              {footer}
            </div>
          </DrawerContent>
        </Drawer>
        {playerPicker}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Menu Árbitro
            </DialogTitle>
          </DialogHeader>
          {content}
          {footer}
        </DialogContent>
      </Dialog>
      {playerPicker}
    </>
  );
}
