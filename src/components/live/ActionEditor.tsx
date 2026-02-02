import { Button } from '@/components/ui/button';
import { ActionPad } from './ActionPad';
import { QualityPad } from './QualityPad';
import { PlayerStrip } from './PlayerStrip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { toast } from 'sonner';
import {
  RallyActionType, 
  Side, 
  Reason,
  PassDestination, 
  KillType,
  POSITIONS_BY_RECEPTION,
  MatchPlayer,
  Player
} from '@/types/volleyball';
import { DestinationStats } from '@/hooks/useDestinationStats';

// Accept both Player and MatchPlayer types
type PlayerLike = (Player | MatchPlayer) & { id: string; jersey_number: number; position?: string | null };

const CODES = [0, 1, 2, 3];
const DESTINATIONS: PassDestination[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK'];

interface ActionEditorProps {
  actionType: RallyActionType;
  side: Side;
  players: PlayerLike[];
  homeName: string;
  awayName: string;
  // Current values
  selectedPlayer?: string | null;
  selectedCode?: number | null;
  selectedKillType?: KillType | null;
  selectedSetter?: string | null;
  selectedDestination?: PassDestination | null;
  selectedPassCode?: number | null;
  // Block players
  selectedBlocker1?: string | null;
  selectedBlocker2?: string | null;
  selectedBlocker3?: string | null;
  // Block result when a_code=1
  selectedBlockCode?: number | null;
  // Context for setter (reception quality for destination filtering)
  receptionCode?: number | null;
  // Attack pass quality (distribution quality for attack)
  attackPassQuality?: number | null;
  // Zone getter for player zones
  getZoneLabel?: (playerId: string, side: Side) => string;
  // Last used player for quick re-selection
  lastUsedPlayerId?: string;
  // Real-time destination stats from match data
  destinationStats?: Record<PassDestination, DestinationStats>;
  // Callbacks
  onPlayerChange: (id: string | null) => void;
  onCodeChange: (code: number | null) => void;
  onKillTypeChange?: (type: KillType | null) => void;
  onSetterChange?: (id: string | null) => void;
  onDestinationChange?: (dest: PassDestination | null) => void;
  onPassCodeChange?: (code: number | null) => void;
  onBlocker1Change?: (id: string | null) => void;
  onBlocker2Change?: (id: string | null) => void;
  onBlocker3Change?: (id: string | null) => void;
  onBlockCodeChange?: (code: number | null) => void;
  onAttackPassQualityChange?: (quality: number | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onUndo?: () => void;
  // Auto-finish point for definitive actions (errors, kills, aces, etc.)
  onAutoFinishPoint?: (winner: Side, reason: Reason) => void;
  // Auto-chain to next logical action (e.g., attack defended → defense)
  onChainAction?: (type: RallyActionType, side: Side) => void;
  // Navigation between actions
  currentActionIndex?: number;
  totalActions?: number;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  isEditingExisting?: boolean;
}

// Helper to get quality label
const getQualityLabel = (code: number) => {
  switch (code) {
    case 0: return 'Erro';
    case 1: return 'Fraca';
    case 2: return 'Boa';
    case 3: return 'Excelente';
    default: return '';
  }
};

export function ActionEditor({
  actionType,
  side,
  players,
  homeName,
  awayName,
  selectedPlayer,
  selectedCode,
  selectedKillType,
  selectedSetter,
  selectedDestination,
  selectedPassCode,
  selectedBlocker1,
  selectedBlocker2,
  selectedBlocker3,
  selectedBlockCode,
  receptionCode,
  attackPassQuality,
  getZoneLabel,
  lastUsedPlayerId,
  destinationStats,
  onPlayerChange,
  onCodeChange,
  onKillTypeChange,
  onSetterChange,
  onDestinationChange,
  onPassCodeChange,
  onBlocker1Change,
  onBlocker2Change,
  onBlocker3Change,
  onBlockCodeChange,
  onAttackPassQualityChange,
  onConfirm,
  onCancel,
  onUndo,
  onAutoFinishPoint,
  onChainAction,
  currentActionIndex,
  totalActions,
  onNavigatePrev,
  onNavigateNext,
  isEditingExisting,
}: ActionEditorProps) {
  const teamName = side === 'CASA' ? homeName : awayName;
  const teamSide = side === 'CASA' ? 'home' : 'away';

  // Step tracking for multi-step actions
  const [currentStep, setCurrentStep] = useState(1);

  // Always show all positions - simplified UX
  const availablePositions = DESTINATIONS;

  // Calculate total steps based on action type and selected code
  const totalSteps = useMemo(() => {
    switch (actionType) {
      case 'serve': return 1;
      case 'reception': return 1;
      case 'defense': return 1;
      case 'setter': return 2; // Setter + Quality → Destination
      case 'attack': 
        // Step 3 for a_code=1 (block result) or a_code=3 (kill type)
        return (selectedCode === 1 || selectedCode === 3) ? 3 : 2;
      case 'block': return 2; // Blockers → Quality
      default: return 1;
    }
  }, [actionType, selectedCode]);

  // Show confirmation toast
  const showConfirmToast = useCallback((playerNumber: number | undefined, quality: number) => {
    const actionLabels: Record<RallyActionType, string> = {
      serve: 'Serviço',
      reception: 'Receção',
      defense: 'Defesa',
      setter: 'Distribuição',
      attack: 'Ataque',
      block: 'Bloco',
    };
    
    toast.success(
      `#${playerNumber || '?'} · ${actionLabels[actionType]} · ${getQualityLabel(quality)}`,
      {
        duration: 2500,
        action: onUndo ? {
          label: 'Desfazer',
          onClick: onUndo,
        } : undefined,
      }
    );
  }, [actionType, onUndo]);

  // Auto-confirm handlers with toast
  const handleCodeWithAutoConfirm = useCallback((code: number) => {
    // Se desselecionar o mesmo código, limpar tudo
    if (selectedCode === code) {
      onCodeChange(null);
      onKillTypeChange?.(null);
      onBlockCodeChange?.(null);
      return;
    }
    
    // Se mudar de código, limpar estados do Step 3
    if (selectedCode !== null && selectedCode !== code) {
      onKillTypeChange?.(null);
      onBlockCodeChange?.(null);
    }
    
    onCodeChange(code);
    
    // Auto-confirm for Block and Defense (no additional input needed)
    if (actionType === 'block' || actionType === 'defense') {
      if (!selectedPlayer) {
        toast.warning('Selecione um jogador primeiro');
        return;
      }
      const player = players.find(p => p.id === selectedPlayer);
      requestAnimationFrame(() => {
        setTimeout(() => {
          showConfirmToast(player?.jersey_number, code);
          onConfirm();
        }, 0);
      });
      return;
    }
    
    // Auto-confirm for Serve with auto-finish for ACE/Error
    if (actionType === 'serve') {
      if (!selectedPlayer) {
        toast.warning('Selecione um jogador primeiro');
        return;
      }
      const player = players.find(p => p.id === selectedPlayer);
      
      if (code === 3) {
        // ACE: server wins
        requestAnimationFrame(() => {
          setTimeout(() => {
            showConfirmToast(player?.jersey_number, code);
            onConfirm();
            onAutoFinishPoint?.(side, 'ACE');
          }, 0);
        });
        return;
      }
      
      if (code === 0) {
        // Serve error: receiver wins
        const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
        requestAnimationFrame(() => {
          setTimeout(() => {
            showConfirmToast(player?.jersey_number, code);
            onConfirm();
            onAutoFinishPoint?.(opponent, 'SE');
          }, 0);
        });
        return;
      }
      
      // code 1 or 2: just confirm, continue to reception
      requestAnimationFrame(() => {
        setTimeout(() => {
          showConfirmToast(player?.jersey_number, code);
          onConfirm();
        }, 0);
      });
      return;
    }
    
    // Auto-confirm for Reception (no auto-finish, rally continues)
    if (actionType === 'reception') {
      if (!selectedPlayer) {
        toast.warning('Selecione um jogador primeiro');
        return;
      }
      const player = players.find(p => p.id === selectedPlayer);
      requestAnimationFrame(() => {
        setTimeout(() => {
          showConfirmToast(player?.jersey_number, code);
          onConfirm();
        }, 0);
      });
      return;
    }
    
    // Attack: code 1 or 3 needs Step 3, code 0 auto-finishes, code 2 continues
    if (actionType === 'attack') {
      if (code === 1 || code === 3) {
        // Go to Step 3 for block result (code 1) or kill type (code 3)
        setCurrentStep(3);
        return;
      }
      
      if (code === 0) {
        // Attack error: opponent wins
        const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
        const player = players.find(p => p.id === selectedPlayer);
        requestAnimationFrame(() => {
          setTimeout(() => {
            showConfirmToast(player?.jersey_number, code);
            onConfirm();
            onAutoFinishPoint?.(opponent, 'AE');
          }, 0);
        });
        return;
      }
      
      // code 2 (defended) - auto-confirm, then chain to defense for opponent
      const player = players.find(p => p.id === selectedPlayer);
      const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
      requestAnimationFrame(() => {
        setTimeout(() => {
          showConfirmToast(player?.jersey_number, code);
          onConfirm();
          // Chain to defense action for opponent (they defended the attack)
          onChainAction?.('defense', opponent);
        }, 0);
      });
    }
  }, [actionType, selectedCode, selectedPlayer, players, side, onCodeChange, onConfirm, showConfirmToast, onKillTypeChange, onBlockCodeChange, onAutoFinishPoint, onChainAction]);

  // Handler for block result when a_code=1
  const handleBlockCodeWithAutoConfirm = useCallback((bCode: number) => {
    onBlockCodeChange?.(bCode);
    const player = players.find(p => p.id === selectedPlayer);
    const bCodeLabels = ['Falta', 'Ofensivo', 'Defensivo', 'Ponto'];
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        toast.success(
          `#${player?.jersey_number || '?'} · Ataque → Bloco ${bCodeLabels[bCode]}`,
          { duration: 2500 }
        );
        onConfirm();
        
        // Auto-finish point based on block result
        if (bCode === 0) {
          // Block fault: attacker wins (side is the attacker)
          onAutoFinishPoint?.(side, 'BLK');
        } else if (bCode === 3) {
          // Stuff block: blocker wins (opponent of attacker)
          const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
          onAutoFinishPoint?.(blockerSide, 'BLK');
        } else if (bCode === 1) {
          // Offensive block: ball playable in attacker's court → defense for attacker
          onChainAction?.('defense', side);
        } else if (bCode === 2) {
          // Defensive block: ball playable in blocker's court → attack for blocker
          const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
          onChainAction?.('attack', blockerSide);
        }
      }, 0);
    });
  }, [onBlockCodeChange, onConfirm, onAutoFinishPoint, onChainAction, side, selectedPlayer, players]);

  const handleKillTypeWithAutoConfirm = useCallback((type: KillType) => {
    onKillTypeChange?.(type);
    const player = players.find(p => p.id === selectedPlayer);
    setTimeout(() => {
      showConfirmToast(player?.jersey_number, 3);
      onConfirm();
      // Kill: attacking team wins
      onAutoFinishPoint?.(side, 'KILL');
    }, 50);
  }, [onKillTypeChange, onConfirm, onAutoFinishPoint, side, selectedPlayer, players, showConfirmToast]);

  // Long press state for OUTROS
  const [outrosPressed, setOutrosPressed] = useState(false);
  const [outrosPressTimer, setOutrosPressTimer] = useState<NodeJS.Timeout | null>(null);

  const handleOutrosStart = useCallback(() => {
    const timer = setTimeout(() => {
      onDestinationChange?.('OUTROS');
      if (!selectedSetter) {
        toast.warning('Selecione um distribuidor primeiro');
        setOutrosPressed(false);
        return;
      }
      setTimeout(() => onConfirm(), 50);
      setOutrosPressed(false);
    }, 250);
    setOutrosPressTimer(timer);
    setOutrosPressed(true);
  }, [selectedSetter, onDestinationChange, onConfirm]);

  const handleOutrosEnd = useCallback(() => {
    if (outrosPressTimer) {
      clearTimeout(outrosPressTimer);
      setOutrosPressTimer(null);
    }
    setOutrosPressed(false);
  }, [outrosPressTimer]);

  const handleDestinationWithAutoConfirm = useCallback((dest: PassDestination) => {
    if (selectedDestination === dest) {
      onDestinationChange?.(null);
      return;
    }
    
    onDestinationChange?.(dest);
    
    // Only auto-confirm if setter is selected
    if (!selectedSetter) {
      toast.warning('Selecione um distribuidor primeiro');
      return;
    }
    
    const player = players.find(p => p.id === selectedSetter);
    setTimeout(() => {
      showConfirmToast(player?.jersey_number, selectedPassCode ?? 2);
      onConfirm();
    }, 50);
  }, [selectedDestination, selectedSetter, selectedPassCode, players, onDestinationChange, onConfirm, showConfirmToast]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    enabled: true,
    onQualitySelect: (code) => {
      if (actionType === 'setter' && currentStep === 1) {
        onPassCodeChange?.(code);
        setCurrentStep(2);
      } else if (actionType === 'attack' && currentStep === 1) {
        onAttackPassQualityChange?.(code);
        setCurrentStep(2);
      } else {
        handleCodeWithAutoConfirm(code);
      }
    },
    onUndo: onUndo,
    onCancel: onCancel,
    onDestinationSelect: actionType === 'setter' && currentStep === 2 ? (dest) => {
      handleDestinationWithAutoConfirm(dest as PassDestination);
    } : undefined,
  });

  // Get zone label wrapper for PlayerStrip
  const getZoneLabelWrapper = useCallback((playerId: string) => {
    return getZoneLabel ? getZoneLabel(playerId, side) : '';
  }, [getZoneLabel, side]);

  // Get shortcut hints based on action type and step
  const getShortcutHints = () => {
    if (actionType === 'setter' && currentStep === 2) {
      return '2/3/4 Posição • O OP • I PIPE • B BACK • U Undo';
    }
    return '0-3 Qualidade • U Undo • Esc Cancelar';
  };

  const renderContent = () => {
    switch (actionType) {
      case 'serve':
      case 'reception':
      case 'defense':
        return (
          <div className="space-y-4">
            <PlayerStrip
              players={players}
              selectedPlayerId={selectedPlayer || null}
              onSelect={onPlayerChange}
              teamSide={teamSide}
              lastUsedPlayerId={lastUsedPlayerId}
              showZones={!!getZoneLabel}
              getZoneLabel={getZoneLabelWrapper}
            />
            <QualityPad
              selectedCode={selectedCode ?? null}
              onSelect={handleCodeWithAutoConfirm}
            />
          </div>
        );

      case 'setter':
        return (
          <div className="space-y-4">
            {currentStep === 1 ? (
              <>
                <PlayerStrip
                  players={players}
                  selectedPlayerId={selectedSetter || null}
                  onSelect={(id) => onSetterChange?.(id)}
                  teamSide={teamSide}
                  showZones={!!getZoneLabel}
                  getZoneLabel={getZoneLabelWrapper}
                />
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground text-center">
                    Qualidade do Passe
                  </div>
                  <QualityPad
                    selectedCode={selectedPassCode ?? null}
                    onSelect={(code) => {
                      onPassCodeChange?.(code);
                      setCurrentStep(2);
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Destino do Passe
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {availablePositions.map((dest) => {
                    const stats = destinationStats?.[dest];
                    const hasData = stats && stats.attempts > 0;
                    
                    // Calculate dynamic difficulty based on real kill rate
                    const killRate = hasData ? stats.killRate : null;
                    const difficultyColor = killRate === null 
                      ? 'border-l-muted-foreground/30'
                      : killRate >= 0.45 
                        ? 'border-l-success' 
                        : killRate >= 0.30 
                          ? 'border-l-warning'
                          : 'border-l-destructive';
                    
                    return (
                      <Button
                        key={dest}
                        variant={selectedDestination === dest ? 'default' : 'outline'}
                        className={cn(
                          'h-16 flex flex-col gap-0.5 text-base font-semibold transition-all border-l-4',
                          selectedDestination === dest && 'ring-2 ring-offset-2',
                          selectedDestination !== dest && difficultyColor
                        )}
                        onClick={() => handleDestinationWithAutoConfirm(dest)}
                      >
                        <span>{dest}</span>
                        {hasData ? (
                          <span className="text-xs opacity-70">
                            {Math.round(killRate! * 100)}% ({stats.kills}/{stats.attempts})
                          </span>
                        ) : (
                          <span className="text-xs opacity-50">-</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
                {/* OUTROS with press-and-hold */}
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'w-full h-10 text-xs text-muted-foreground',
                    outrosPressed && 'bg-muted',
                    selectedDestination === 'OUTROS' && 'bg-primary text-primary-foreground'
                  )}
                  onMouseDown={handleOutrosStart}
                  onMouseUp={handleOutrosEnd}
                  onMouseLeave={handleOutrosEnd}
                  onTouchStart={handleOutrosStart}
                  onTouchEnd={handleOutrosEnd}
                >
                  OUTROS (manter 250ms)
                </Button>
              </div>
            )}
          </div>
        );

      case 'attack':
        return (
          <div className="space-y-4">
            {currentStep === 1 ? (
              <>
                <PlayerStrip
                  players={players}
                  selectedPlayerId={selectedPlayer || null}
                  onSelect={onPlayerChange}
                  teamSide={teamSide}
                  lastUsedPlayerId={lastUsedPlayerId}
                  showZones={!!getZoneLabel}
                  getZoneLabel={getZoneLabelWrapper}
                />
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground text-center">
                    Qualidade do Passe
                  </div>
                  <QualityPad
                    selectedCode={attackPassQuality ?? null}
                    onSelect={(code) => {
                      onAttackPassQualityChange?.(code);
                      setCurrentStep(2);
                    }}
                  />
                </div>
              </>
            ) : currentStep === 2 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Avaliação do Ataque
                </div>
                <QualityPad
                  selectedCode={selectedCode ?? null}
                  onSelect={handleCodeWithAutoConfirm}
                  labels={{
                    0: 'Erro',
                    1: 'Bloco',
                    2: 'Defendido',
                    3: 'Kill',
                  }}
                />
              </div>
            ) : (
              // Step 3: Kill Type (code=3) or Block Result (code=1)
              <div className="space-y-4">
                {selectedCode === 3 && (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground text-center">
                      Tipo de Kill <span className="text-destructive">*</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={selectedKillType === 'FLOOR' ? 'default' : 'outline'}
                        className={cn(
                          'h-16 flex flex-col gap-1',
                          selectedKillType === 'FLOOR' && 'bg-success hover:bg-success/90'
                        )}
                        onClick={() => handleKillTypeWithAutoConfirm('FLOOR')}
                      >
                        <span className="text-2xl">🏐</span>
                        <span className="text-sm">Chão</span>
                      </Button>
                      <Button
                        variant={selectedKillType === 'BLOCKOUT' ? 'default' : 'outline'}
                        className={cn(
                          'h-16 flex flex-col gap-1',
                          selectedKillType === 'BLOCKOUT' && 'bg-success hover:bg-success/90'
                        )}
                        onClick={() => handleKillTypeWithAutoConfirm('BLOCKOUT')}
                      >
                        <span className="text-2xl">🚫</span>
                        <span className="text-sm">Block-out</span>
                      </Button>
                    </div>
                  </div>
                )}
                
                {selectedCode === 1 && (
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-muted-foreground text-center">
                      Resultado do Bloco <span className="text-destructive">*</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        variant={selectedBlockCode === 0 ? 'default' : 'outline'}
                        className={cn(
                          'h-20 flex flex-col gap-1',
                          'bg-success/10 border-success/30 hover:bg-success/20',
                          selectedBlockCode === 0 && 'bg-success hover:bg-success/90 text-success-foreground'
                        )}
                        onClick={() => handleBlockCodeWithAutoConfirm(0)}
                      >
                        <span className="text-lg">🎯</span>
                        <span className="text-xs font-medium">Falta</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">Ponto Atacante</span>
                      </Button>
                      <Button
                        variant={selectedBlockCode === 1 ? 'default' : 'outline'}
                        className={cn(
                          'h-20 flex flex-col gap-1',
                          'bg-primary/10 border-primary/30 hover:bg-primary/20',
                          selectedBlockCode === 1 && 'bg-primary hover:bg-primary/90'
                        )}
                        onClick={() => handleBlockCodeWithAutoConfirm(1)}
                      >
                        <span className="text-lg">⚔️</span>
                        <span className="text-xs font-medium">Bloco Ofensivo</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">Bola jogável campo adversário</span>
                      </Button>
                      <Button
                        variant={selectedBlockCode === 2 ? 'default' : 'outline'}
                        className={cn(
                          'h-20 flex flex-col gap-1',
                          'bg-warning/10 border-warning/30 hover:bg-warning/20',
                          selectedBlockCode === 2 && 'bg-warning hover:bg-warning/90'
                        )}
                        onClick={() => handleBlockCodeWithAutoConfirm(2)}
                      >
                        <span className="text-lg">🛡️</span>
                        <span className="text-xs font-medium">Bloco Defensivo</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">Bola jogável campo bloqueador</span>
                      </Button>
                      <Button
                        variant={selectedBlockCode === 3 ? 'default' : 'outline'}
                        className={cn(
                          'h-20 flex flex-col gap-1',
                          'bg-destructive/10 border-destructive/30 hover:bg-destructive/20',
                          selectedBlockCode === 3 && 'bg-destructive hover:bg-destructive/90'
                        )}
                        onClick={() => handleBlockCodeWithAutoConfirm(3)}
                      >
                        <span className="text-lg">🧱</span>
                        <span className="text-xs font-medium">Bloco Ponto</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">Stuff block</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'block':
        return (
          <div className="space-y-4">
            {currentStep === 1 ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Bloqueadores (até 3)
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      onBlocker1Change?.(null);
                      onBlocker2Change?.(null);
                      onBlocker3Change?.(null);
                      setCurrentStep(2);
                    }}
                  >
                    Sem bloco →
                  </Button>
                </div>
                
                {/* 3 Slots for blockers */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Bloq 1', selected: selectedBlocker1, onChange: onBlocker1Change },
                    { label: 'Bloq 2', selected: selectedBlocker2, onChange: onBlocker2Change },
                    { label: 'Bloq 3', selected: selectedBlocker3, onChange: onBlocker3Change },
                  ].map(({ label, selected, onChange }) => {
                    const player = players.find(p => p.id === selected);
                    return (
                      <div key={label} className="text-center">
                        <div className="text-[10px] text-muted-foreground mb-1">{label}</div>
                        <div className={cn(
                          'h-12 rounded-lg border-2 flex items-center justify-center text-lg font-bold',
                          selected 
                            ? cn('border-2', teamSide === 'home' ? 'border-home bg-home/10 text-home' : 'border-away bg-away/10 text-away')
                            : 'border-dashed border-muted-foreground/30 text-muted-foreground/50'
                        )}>
                          {player ? `#${player.jersey_number}` : '—'}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Player pool */}
                <div className="grid grid-cols-6 gap-1.5">
                  {players.map((player) => {
                    const isSelected = player.id === selectedBlocker1 || 
                                      player.id === selectedBlocker2 || 
                                      player.id === selectedBlocker3;
                    return (
                      <button
                        key={player.id}
                        onClick={() => {
                          if (isSelected) {
                            if (player.id === selectedBlocker1) onBlocker1Change?.(null);
                            else if (player.id === selectedBlocker2) onBlocker2Change?.(null);
                            else if (player.id === selectedBlocker3) onBlocker3Change?.(null);
                          } else {
                            if (!selectedBlocker1) onBlocker1Change?.(player.id);
                            else if (!selectedBlocker2) onBlocker2Change?.(player.id);
                            else if (!selectedBlocker3) onBlocker3Change?.(player.id);
                          }
                        }}
                        className={cn(
                          'h-10 rounded-lg text-sm font-bold transition-all',
                          isSelected 
                            ? cn('ring-2 ring-offset-1', teamSide === 'home' ? 'bg-home/20 ring-home text-home' : 'bg-away/20 ring-away text-away')
                            : 'bg-muted hover:bg-muted/80 text-foreground'
                        )}
                      >
                        {player.jersey_number}
                      </button>
                    );
                  })}
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => setCurrentStep(2)}
                  disabled={!selectedBlocker1}
                >
                  Continuar →
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Avaliação do Bloco
                </div>
                <QualityPad
                  selectedCode={selectedCode ?? null}
                  onSelect={handleCodeWithAutoConfirm}
                  labels={{ 0: 'Falta', 1: 'Ofensivo', 2: 'Defensivo', 3: 'Ponto' }}
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <ActionPad
      actionType={actionType}
      teamSide={teamSide}
      teamName={teamName}
      currentStep={currentStep}
      totalSteps={totalSteps}
      onUndo={onUndo}
      customShortcuts={getShortcutHints()}
    >
      {renderContent()}
      
      {/* Navigation footer */}
      <div className="flex justify-between pt-3 border-t mt-3">
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground" 
              onClick={() => {
                if (currentStep > 1) {
                  // Se estiver no Step 3, limpar estados do Step 3
                  if (currentStep === 3 && actionType === 'attack') {
                    onKillTypeChange?.(null);
                    onBlockCodeChange?.(null);
                  }
                  setCurrentStep(currentStep - 1);
                } else if (currentActionIndex !== undefined && currentActionIndex > 0 && onNavigatePrev) {
                  onNavigatePrev();
                } else {
                  onCancel();
                }
              }}
        >
          <ChevronLeft className="h-3 w-3" />
          Voltar
        </Button>
        
        {currentActionIndex !== undefined && totalActions !== undefined && currentActionIndex < totalActions - 1 && onNavigateNext && (
          <Button 
            variant="ghost" 
            size="sm"
            className="gap-1 text-muted-foreground hover:text-foreground" 
            onClick={onNavigateNext}
          >
            Avançar
            <ChevronRight className="h-3 w-3" />
          </Button>
        )}
      </div>
    </ActionPad>
  );
}
