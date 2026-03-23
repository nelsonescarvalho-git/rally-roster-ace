import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ActionPad } from './ActionPad';
import { QualityPad } from './QualityPad';
import { PlayerStrip } from './PlayerStrip';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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
  ServeType,
  AttackDirection,
  SERVE_TYPE_LABELS,
  ATTACK_DIRECTION_LABELS,
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
  // Opponent players eligible for block (Z2,Z3,Z4, no liberos)
  opponentBlockers?: PlayerLike[];
  // Current values
  selectedPlayer?: string | null;
  selectedCode?: number | null;
  selectedKillType?: KillType | null;
  selectedServeType?: ServeType | null;
  selectedAttackDirection?: AttackDirection | null;
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
  // Freeball attack (from reception over the net - skip pass quality step)
  isFreeballAttack?: boolean;
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
  onAttackDirectionChange?: (dir: AttackDirection | null) => void;
  onServeTypeChange?: (type: ServeType | null) => void;
  onSetterChange?: (id: string | null) => void;
  onDestinationChange?: (dest: PassDestination | null) => void;
  onPassCodeChange?: (code: number | null) => void;
  onBlocker1Change?: (id: string | null) => void;
  onBlocker2Change?: (id: string | null) => void;
  onBlocker3Change?: (id: string | null) => void;
  onBlockCodeChange?: (code: number | null) => void;
  onAttackPassQualityChange?: (quality: number | null) => void;
  onConfirm: (overrides?: {
    passDestination?: PassDestination | null;
    passCode?: number | null;
    setterId?: string | null;
    playerId?: string | null;
    code?: number | null;
    killType?: KillType | null;
    blockCode?: number | null;
    blocker1Id?: string | null;
    attackDirection?: AttackDirection | null;
    serveType?: ServeType | null;
    overTheNet?: boolean;
  }) => void;
  onCancel: () => void;
  onUndo?: () => void;
  // Auto-finish point for definitive actions (errors, kills, aces, etc.)
  // Accepts optional attack overrides to bypass React state race conditions
  onAutoFinishPoint?: (winner: Side, reason: Reason, attackOverrides?: {
    attackPlayerId?: string | null;
    attackCode?: number | null;
    killType?: KillType | null;
    blockCode?: number | null;
    blocker1Id?: string | null;
  }) => void;
  // Auto-chain to next logical action (e.g., attack defended → defense)
  // Accepts optional inherited data to propagate (e.g., pass_destination from setter to attack)
  onChainAction?: (type: RallyActionType, side: Side, inheritedData?: {
    passDestination?: PassDestination | null;
    passCode?: number | null;
  }) => void;
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
  opponentBlockers,
  selectedPlayer,
  selectedCode,
  selectedKillType,
  selectedServeType,
  selectedAttackDirection,
  selectedSetter,
  selectedDestination,
  selectedPassCode,
  selectedBlocker1,
  selectedBlocker2,
  selectedBlocker3,
  selectedBlockCode,
  receptionCode,
  attackPassQuality,
  isFreeballAttack = false,
  getZoneLabel,
  lastUsedPlayerId,
  destinationStats,
  onPlayerChange,
  onCodeChange,
  onKillTypeChange,
  onAttackDirectionChange,
  onServeTypeChange,
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
  // Always start at step 1 to ensure player selection
  const [currentStep, setCurrentStep] = useState(1);

  // Defense "Passou Rede" toggle state
  const [defenseOverTheNet, setDefenseOverTheNet] = useState(false);

  // Serve type default from localStorage
  const [localServeType, setLocalServeType] = useState<ServeType>(() => {
    try {
      return (localStorage.getItem('lastServeType') as ServeType) || 'FLOAT';
    } catch { return 'FLOAT'; }
  });

  // Reset step when action type or side changes (for chained actions)
  useEffect(() => {
    setCurrentStep(1);
    setDefenseOverTheNet(false);
  }, [actionType, side]);

  // Always show all positions - simplified UX
  const availablePositions = DESTINATIONS;

  // Calculate total steps based on action type and selected code
  const totalSteps = useMemo(() => {
    switch (actionType) {
      case 'serve': return 2;      // Player → [Type toggle + Quality]
      case 'reception': return 2;  // Player → Quality
      case 'defense': return 2;    // Player → Quality (+ overTheNet toggle)
      case 'setter': return 2;     // Player → [Quality toggle + Destination]
      case 'attack': 
        // Player → [Direction toggle + Quality] → (KillType/BlockResult) → (Blocker)
        if (selectedCode === 1 && (selectedBlockCode === 1 || selectedBlockCode === 2 || selectedBlockCode === 3)) return 4;
        if (selectedCode === 1 || selectedCode === 3) return 3;
        return 2; // Player → [Direction + Quality]
      case 'block': return 2;
      default: return 1;
    }
  }, [actionType, selectedCode, selectedBlockCode]);

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
    if (actionType === 'block') {
      if (!selectedBlocker1) {
        toast.warning('Selecione um jogador primeiro');
        return;
      }
      const player = blockersPool.find(p => p.id === selectedBlocker1);
      requestAnimationFrame(() => {
        setTimeout(() => {
          showConfirmToast(player?.jersey_number, code);
          onConfirm({ code: code });
        }, 0);
      });
      return;
    }
    
    // Auto-confirm for Defense with optional overTheNet
    if (actionType === 'defense') {
      if (!selectedPlayer) {
        toast.warning('Selecione um jogador primeiro');
        return;
      }
      const player = players.find(p => p.id === selectedPlayer);
      const isOverTheNet = defenseOverTheNet && code > 0;
      requestAnimationFrame(() => {
        setTimeout(() => {
          showConfirmToast(player?.jersey_number, code);
          onConfirm({ code: code, overTheNet: isOverTheNet || undefined });
          // If defense went over the net, chain to opponent attack (freeball)
          if (isOverTheNet) {
            const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
            onChainAction?.('attack', opponent);
          }
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
      const currentServeType = selectedServeType || localServeType;
      
      if (code === 3) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            showConfirmToast(player?.jersey_number, code);
            onConfirm({ serveType: currentServeType });
            onAutoFinishPoint?.(side, 'ACE');
          }, 0);
        });
        return;
      }
      
      if (code === 0) {
        const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
        requestAnimationFrame(() => {
          setTimeout(() => {
            showConfirmToast(player?.jersey_number, code);
            onConfirm({ serveType: currentServeType });
            onAutoFinishPoint?.(opponent, 'SE');
          }, 0);
        });
        return;
      }
      
      requestAnimationFrame(() => {
        setTimeout(() => {
          showConfirmToast(player?.jersey_number, code);
          onConfirm({ serveType: currentServeType });
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
    
    // Attack: code 1 or 3 needs Step 4, code 0 auto-finishes, code 2 continues
    if (actionType === 'attack') {
      if (code === 1 || code === 3) {
        setCurrentStep(3);
        return;
        return;
      }
      
      if (code === 0) {
        // Attack error: opponent wins
        const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
        const player = players.find(p => p.id === selectedPlayer);
        requestAnimationFrame(() => {
          setTimeout(() => {
            showConfirmToast(player?.jersey_number, code);
            // Pass playerId and code directly to avoid race conditions
            onConfirm({ playerId: selectedPlayer, code: 0 });
            // Pass attack overrides to handleFinishPoint to avoid race condition
            onAutoFinishPoint?.(opponent, 'AE', {
              attackPlayerId: selectedPlayer,
              attackCode: 0,
            });
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
          // Pass playerId and code directly to avoid race conditions
          onConfirm({ playerId: selectedPlayer, code: 2 });
          // Chain to defense action for opponent (they defended the attack)
          onChainAction?.('defense', opponent);
        }, 0);
      });
    }
  }, [actionType, selectedCode, selectedPlayer, selectedServeType, localServeType, players, side, defenseOverTheNet, onCodeChange, onConfirm, showConfirmToast, onKillTypeChange, onBlockCodeChange, onAutoFinishPoint, onChainAction]);

  // Handler for block result when a_code=1
  const handleBlockCodeWithAutoConfirm = useCallback((bCode: number) => {
    onBlockCodeChange?.(bCode);
    
    // For block types 1, 2, 3 → go to Step 4 to select blocker
    if (bCode === 1 || bCode === 2 || bCode === 3) {
      setCurrentStep(4);
      return;
    }
    
    // Only bCode=0 (Falta) auto-confirms immediately
    const player = players.find(p => p.id === selectedPlayer);
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        toast.success(
          `#${player?.jersey_number || '?'} · Ataque → Bloco Falta`,
          { duration: 2500 }
        );
        onConfirm({ playerId: selectedPlayer, code: 1, blockCode: bCode });
        // Block fault: attacker wins
        onAutoFinishPoint?.(side, 'BLK', {
          attackPlayerId: selectedPlayer,
          attackCode: 1,
          blockCode: 0,
        });
      }, 0);
    });
  }, [onBlockCodeChange, onConfirm, onAutoFinishPoint, onChainAction, side, selectedPlayer, players]);

  // Blockers pool for Step 4 (stuff block) - use opponentBlockers if available
  const blockersPool = useMemo(() => {
    // Use opponentBlockers if provided (for stuff block - shows opponent's front row)
    if (opponentBlockers && opponentBlockers.length > 0) {
      return opponentBlockers;
    }
    // Fallback: filter liberos from players (for standalone block action)
    return players.filter(p => {
      const pos = p.position?.toUpperCase();
      return pos !== 'L' && pos !== 'LIBERO';
    });
  }, [opponentBlockers, players]);

  // Handler for stuff block confirmation after blocker selection (b_code=3)
  const handleStuffBlockConfirm = useCallback((blockerId: string) => {
    onBlocker1Change?.(blockerId);
    const blocker = blockersPool.find(p => p.id === blockerId);
    const attacker = players.find(p => p.id === selectedPlayer);
    const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        toast.success(
          `#${attacker?.jersey_number || '?'} Bloqueado por #${blocker?.jersey_number || '?'} · Ponto de Bloco`,
          { duration: 2500 }
        );
        onConfirm({ playerId: selectedPlayer, code: 1, blockCode: 3, blocker1Id: blockerId });
        onAutoFinishPoint?.(blockerSide, 'BLK', {
          attackPlayerId: selectedPlayer,
          attackCode: 1,
          blockCode: 3,
          blocker1Id: blockerId,
        });
      }, 0);
    });
  }, [onBlocker1Change, blockersPool, players, selectedPlayer, side, onConfirm, onAutoFinishPoint]);

  // Handler for offensive/defensive block confirmation after blocker selection (b_code=1 or 2)
  const handleBlockChainConfirm = useCallback((blockerId: string) => {
    onBlocker1Change?.(blockerId);
    const blocker = blockersPool.find(p => p.id === blockerId);
    const attacker = players.find(p => p.id === selectedPlayer);
    const bCodeLabels: Record<number, string> = { 1: 'Ofensivo', 2: 'Defensivo' };
    
    requestAnimationFrame(() => {
      setTimeout(() => {
        toast.success(
          `#${attacker?.jersey_number || '?'} → Bloco ${bCodeLabels[selectedBlockCode!]} por #${blocker?.jersey_number || '?'}`,
          { duration: 2500 }
        );
        onConfirm({ playerId: selectedPlayer, code: 1, blockCode: selectedBlockCode!, blocker1Id: blockerId });
        
        if (selectedBlockCode === 1) {
          // Bloco Ofensivo: bola jogável no campo do bloqueador → defesa para bloqueador
          const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
          onChainAction?.('defense', blockerSide);
        } else if (selectedBlockCode === 2) {
          // Bloco Defensivo: bola volta ao campo do atacante → defesa para atacante
          onChainAction?.('defense', side);
        }
      }, 0);
    });
  }, [onBlocker1Change, blockersPool, players, selectedPlayer, selectedBlockCode, side, onConfirm, onChainAction]);

  const handleKillTypeWithAutoConfirm = useCallback((type: KillType) => {
    onKillTypeChange?.(type);
    const player = players.find(p => p.id === selectedPlayer);
    setTimeout(() => {
      showConfirmToast(player?.jersey_number, 3);
      // Pass playerId, code, and killType directly to avoid race conditions
      onConfirm({ playerId: selectedPlayer, code: 3, killType: type });
      // Kill: attacking team wins - pass overrides to avoid race condition
      onAutoFinishPoint?.(side, 'KILL', {
        attackPlayerId: selectedPlayer,
        attackCode: 3,
        killType: type,
      });
    }, 50);
  }, [onKillTypeChange, onConfirm, onAutoFinishPoint, side, selectedPlayer, players, showConfirmToast]);

  // OUTROS uses same single-click as all other destinations

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
      // Pass values directly to avoid race condition with async state updates
      onConfirm({
        passDestination: dest,
        passCode: selectedPassCode,
        setterId: selectedSetter,
      });
      // Chain to Attack action for the same team - pass inherited data
      onChainAction?.('attack', side, {
        passDestination: dest,
        passCode: selectedPassCode,
      });
    }, 50);
  }, [selectedDestination, selectedSetter, selectedPassCode, players, onDestinationChange, onConfirm, showConfirmToast, onChainAction, side]);

  // Keyboard shortcuts - block 0-3 in Step 1 (player selection)
  useKeyboardShortcuts({
    enabled: true,
    onQualitySelect: (code) => {
      // Block shortcuts in Step 1 (player selection step)
      if (currentStep === 1) return;
      
      if (actionType === 'attack' && currentStep === 2) {
        handleCodeWithAutoConfirm(code);
      } else if (currentStep === 2) {
        // For serve/reception/defense in Step 2
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
    if (currentStep === 1) {
      return '←/→ Navegar • Enter Selecionar';
    }
    if (actionType === 'setter' && currentStep === 2) {
      return '2/3/4 Posição • O OP • I PIPE • B BACK • U Undo';
    }
    return '0-3 Qualidade • U Undo • Esc Cancelar';
  };

  const renderContent = () => {
    switch (actionType) {
      case 'serve':
        return (
          <div className="space-y-4">
            {currentStep === 1 ? (
              <PlayerStrip
                players={players}
                selectedPlayerId={selectedPlayer || null}
                onSelect={(playerId) => {
                  onPlayerChange(playerId);
                  setCurrentStep(2);
                }}
                teamSide={teamSide}
                lastUsedPlayerId={lastUsedPlayerId}
                showZones={!!getZoneLabel}
                getZoneLabel={getZoneLabelWrapper}
              />
            ) : (
              <div className="space-y-3">
                {/* Serve type toggle (optional, defaults to last used) */}
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Tipo de Serviço
                </div>
                <ToggleGroup 
                  type="single" 
                  value={selectedServeType || localServeType}
                  onValueChange={(v) => {
                    if (v) {
                      const st = v as ServeType;
                      onServeTypeChange?.(st);
                      setLocalServeType(st);
                      try { localStorage.setItem('lastServeType', st); } catch {}
                    }
                  }}
                  className="justify-center"
                >
                  {(['FLOAT', 'JUMP_FLOAT', 'POWER'] as ServeType[]).map((type) => {
                    const typeInfo = SERVE_TYPE_LABELS[type];
                    return (
                      <ToggleGroupItem
                        key={type}
                        value={type}
                        variant="outline"
                        size="sm"
                        className="gap-1 px-3"
                      >
                        <span>{typeInfo.emoji}</span>
                        <span className="text-xs">{typeInfo.shortLabel}</span>
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>
                
                <QualityPad
                  selectedCode={selectedCode ?? null}
                  onSelect={handleCodeWithAutoConfirm}
                />
              </div>
            )}
          </div>
        );

      case 'reception':
        return (
          <div className="space-y-4">
            {currentStep === 1 ? (
              <PlayerStrip
                players={players}
                selectedPlayerId={selectedPlayer || null}
                onSelect={(playerId) => {
                  onPlayerChange(playerId);
                  setCurrentStep(2);
                }}
                teamSide={teamSide}
                lastUsedPlayerId={lastUsedPlayerId}
                showZones={!!getZoneLabel}
                getZoneLabel={getZoneLabelWrapper}
              />
            ) : (
              <QualityPad
                selectedCode={selectedCode ?? null}
                onSelect={handleCodeWithAutoConfirm}
              />
            )}
          </div>
        );

      case 'defense':
        return (
          <div className="space-y-4">
            {currentStep === 1 ? (
              <PlayerStrip
                players={players}
                selectedPlayerId={selectedPlayer || null}
                onSelect={(playerId) => {
                  onPlayerChange(playerId);
                  setCurrentStep(2);
                }}
                teamSide={teamSide}
                lastUsedPlayerId={lastUsedPlayerId}
                showZones={!!getZoneLabel}
                getZoneLabel={getZoneLabelWrapper}
              />
            ) : (
              <div className="space-y-3">
                {/* Passou Rede toggle */}
                <button
                  type="button"
                  onClick={() => setDefenseOverTheNet(!defenseOverTheNet)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border-2 text-sm font-medium transition-all',
                    defenseOverTheNet
                      ? 'border-warning bg-warning/15 text-warning'
                      : 'border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40'
                  )}
                >
                  <span>↗️</span>
                  <span>Passou Rede</span>
                  {defenseOverTheNet && <span className="text-xs opacity-70">(ativo)</span>}
                </button>
                
                <QualityPad
                  selectedCode={selectedCode ?? null}
                  onSelect={handleCodeWithAutoConfirm}
                />
              </div>
            )}
          </div>
        );

      case 'setter':
        return (
          <div className="space-y-4">
            {currentStep === 1 ? (
              <PlayerStrip
                players={players}
                selectedPlayerId={selectedSetter || null}
                onSelect={(id) => {
                  onSetterChange?.(id);
                  setCurrentStep(2);
                }}
                teamSide={teamSide}
                showZones={!!getZoneLabel}
                getZoneLabel={getZoneLabelWrapper}
              />
            ) : (
              <div className="space-y-3">
                {/* Quality selection */}
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Qualidade do Passe
                </div>
                <QualityPad
                  selectedCode={selectedPassCode ?? null}
                  onSelect={(code) => {
                    onPassCodeChange?.(code);
                    
                    if (code === 0) {
                      // Erro de distribuição: auto-confirmar
                      const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
                      const player = players.find(p => p.id === selectedSetter);
                      
                      requestAnimationFrame(() => {
                        setTimeout(() => {
                          toast.success(
                            `#${player?.jersey_number || '?'} · Distribuição · Erro`,
                            { duration: 2500 }
                          );
                          onConfirm({
                            passCode: 0,
                            setterId: selectedSetter,
                            passDestination: null,
                          });
                          onAutoFinishPoint?.(opponent, 'OP');
                        }, 0);
                      });
                    }
                  }}
                />
                
                {/* Hint when quality not yet selected */}
                {selectedPassCode === null && (
                  <div className="text-center text-xs text-muted-foreground py-2 animate-pulse">
                    👆 Seleciona a qualidade do passe primeiro
                  </div>
                )}
                
                {/* Destination grid (only if quality selected and > 0) */}
                {selectedPassCode !== null && selectedPassCode > 0 && (
                  <>
                    <div className="text-xs font-medium text-muted-foreground text-center">
                      Destino do Passe
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {availablePositions.map((dest) => {
                        const stats = destinationStats?.[dest];
                        const hasData = stats && stats.attempts > 0;
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
                                {stats.kills}/{stats.attempts} · {Math.round(killRate! * 100)}%
                              </span>
                            ) : (
                              <span className="text-xs opacity-50">-</span>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'w-full h-10 text-xs text-muted-foreground',
                        selectedDestination === 'OUTROS' && 'bg-primary text-primary-foreground'
                      )}
                      onClick={() => handleDestinationWithAutoConfirm('OUTROS' as PassDestination)}
                    >
                      OUTROS
                    </Button>
                  </>
                )}
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
                  onSelect={(playerId) => {
                    onPlayerChange(playerId);
                    setCurrentStep(2); // Avançar para Step 2 (direção)
                  }}
                  teamSide={teamSide}
                  lastUsedPlayerId={lastUsedPlayerId}
                  showZones={!!getZoneLabel}
                  getZoneLabel={getZoneLabelWrapper}
                />
                
                {/* Indicador visual se qualidade está herdada */}
                {attackPassQuality !== null && (
                  <div className="text-center p-2 rounded bg-muted/30 text-xs text-muted-foreground">
                    Passe: <span className="font-medium text-foreground">{getQualityLabel(attackPassQuality)}</span>
                    <span className="opacity-70"> (via Distribuição)</span>
                  </div>
                )}
                
                {/* Indicador para freeball */}
                {isFreeballAttack && attackPassQuality === null && (
                  <div className="text-center p-2 rounded bg-warning/10 border border-warning/30 text-xs text-warning">
                    🎁 Bola de Graça — Qualidade de passe N/A
                  </div>
                )}
              </>
            ) : currentStep === 2 ? (
              // Step 2: Direction toggle (optional) + Quality (auto-confirms)
              <div className="space-y-3">
                {selectedPlayer && (
                  <div className="flex items-center justify-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/50">
                    <span className="text-lg font-bold">
                      #{players.find(p => p.id === selectedPlayer)?.jersey_number}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {players.find(p => p.id === selectedPlayer)?.name?.split(' ')[0]}
                    </span>
                    {getZoneLabel && (
                      <Badge variant="outline" className="text-[10px] h-5">
                        {getZoneLabelWrapper(selectedPlayer)}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Indicador de qualidade herdada ou freeball */}
                {attackPassQuality !== null ? (
                  <div className="flex items-center justify-center gap-2 p-1.5 rounded bg-primary/10 border border-primary/20">
                    <span className="text-xs text-muted-foreground">Passe:</span>
                    <Badge variant="secondary" className="text-xs">
                      Q{attackPassQuality} · {getQualityLabel(attackPassQuality)}
                    </Badge>
                  </div>
                ) : isFreeballAttack ? (
                  <div className="flex items-center justify-center gap-2 p-1.5 rounded bg-warning/10 border border-warning/30">
                    <span>🎁</span>
                    <span className="text-xs text-warning font-medium">Bola de Graça</span>
                  </div>
                ) : null}

                {/* Direction pad (optional) */}
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Direção <span className="opacity-50">(opcional)</span>
                </div>
                <div className="flex gap-2 w-full">
                  {([
                    { dir: 'DIAGONAL' as AttackDirection, color: 'primary' },
                    { dir: 'LINE' as AttackDirection, color: 'accent' },
                    { dir: 'TIP' as AttackDirection, color: 'warning' },
                    { dir: 'Z1' as AttackDirection, color: 'primary' },
                    { dir: 'Z5' as AttackDirection, color: 'destructive' },
                  ]).map(({ dir, color }) => {
                    const info = ATTACK_DIRECTION_LABELS[dir];
                    const isSelected = selectedAttackDirection === dir;
                    const baseBtn = 'relative flex flex-col items-center justify-center gap-0.5 rounded-xl border-2 cursor-pointer select-none transition-all duration-200 min-h-[64px] px-2 py-2 flex-1';
                    const selectedStyles = `bg-${color} text-${color}-foreground border-${color} scale-105 shadow-lg shadow-${color}/30 ring-2 ring-${color}/50 ring-offset-2 ring-offset-background`;
                    const unselectedStyles = `bg-${color}/8 text-${color} border-${color}/20 hover:bg-${color}/15 hover:border-${color}/40 hover:scale-[1.02] active:scale-95`;
                    return (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => onAttackDirectionChange?.(selectedAttackDirection === dir ? null : dir)}
                        className={cn(
                          baseBtn,
                          isSelected ? selectedStyles : unselectedStyles,
                        )}
                      >
                        <span className={cn("text-xl font-bold leading-none", isSelected && "animate-bounce-once")}>
                          {info.emoji}
                        </span>
                        <span className={cn("text-[11px] font-semibold leading-tight whitespace-nowrap", isSelected ? "opacity-100" : "opacity-80")}>
                          {info.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                
                <div className="text-xs font-medium text-muted-foreground text-center pt-1">
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
            ) : currentStep === 3 ? (
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
                    
                    {/* Botão para continuar sem detalhar bloco */}
                    <Button
                      variant="outline"
                      className="w-full h-12 mt-1 text-sm text-muted-foreground hover:text-foreground border-dashed"
                      onClick={() => {
                        // Confirma sem b_code e encadeia para defesa do oponente
                        onConfirm();
                        const opponent: Side = side === 'CASA' ? 'FORA' : 'CASA';
                        onChainAction?.('defense', opponent);
                      }}
                    >
                      ➡️ Continua Rally (sem detalhar bloco)
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // Step 4: Blocker selection for all block types (b_code 1, 2, 3)
              <div className="space-y-4">
                <div className={cn(
                  "text-center p-3 rounded-lg border",
                  selectedBlockCode === 3 && "bg-destructive/10 border-destructive/30",
                  selectedBlockCode === 1 && "bg-primary/10 border-primary/30",
                  selectedBlockCode === 2 && "bg-warning/10 border-warning/30",
                )}>
                  <span className="text-lg">
                    {selectedBlockCode === 3 ? '🧱' : selectedBlockCode === 1 ? '⚔️' : '🛡️'}
                  </span>
                  <p className={cn(
                    "text-sm font-medium mt-1",
                    selectedBlockCode === 3 && "text-destructive",
                    selectedBlockCode === 1 && "text-primary",
                    selectedBlockCode === 2 && "text-warning",
                  )}>
                    {selectedBlockCode === 3 ? 'Bloco Ponto' : selectedBlockCode === 1 ? 'Bloco Ofensivo' : 'Bloco Defensivo'}
                  </p>
                  <p className="text-xs text-muted-foreground">Quem fez o bloco? (Adversário)</p>
                </div>
                
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Selecionar Bloqueador <span className="text-destructive">*</span>
                  <span className="block text-[10px] opacity-70 mt-0.5">Linha de Ataque (Z2, Z3, Z4)</span>
                </div>
                
                {blockersPool.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {blockersPool.map((player) => (
                      <Button
                        key={player.id}
                        variant={selectedBlocker1 === player.id ? 'default' : 'outline'}
                        className={cn(
                          'h-14 flex flex-col gap-0.5',
                          selectedBlocker1 === player.id && 'ring-2 ring-offset-2',
                          selectedBlockCode === 3 && selectedBlocker1 === player.id && 'bg-destructive hover:bg-destructive/90',
                          selectedBlockCode === 1 && selectedBlocker1 === player.id && 'bg-primary hover:bg-primary/90',
                          selectedBlockCode === 2 && selectedBlocker1 === player.id && 'bg-warning hover:bg-warning/90',
                        )}
                        onClick={() => {
                          if (selectedBlockCode === 3) {
                            handleStuffBlockConfirm(player.id);
                          } else {
                            handleBlockChainConfirm(player.id);
                          }
                        }}
                      >
                        <span className="text-lg font-bold">#{player.jersey_number}</span>
                        {player.position && (
                          <span className="text-[10px] opacity-70">
                            {player.position === 'Middle Blocker' ? 'MB' : 
                             player.position === 'Outside Hitter' ? 'OH' :
                             player.position === 'Opposite' ? 'OP' :
                             player.position === 'Setter' ? 'S' : 
                             player.position?.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center p-4 rounded-lg bg-muted/30 border border-border/50">
                    <p className="text-sm text-muted-foreground">Sem bloqueadores elegíveis</p>
                    <p className="text-xs opacity-70 mt-1">Nenhum jogador na linha de ataque</p>
                  </div>
                )}
                
                {/* Skip blocker identification */}
                <Button
                  variant="outline"
                  className="w-full h-10 text-xs text-muted-foreground hover:text-foreground border-dashed"
                  onClick={() => {
                    if (selectedBlockCode === 3) {
                      const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
                      toast.success('Bloco Ponto (sem identificar bloqueador)', { duration: 2500 });
                      onConfirm({ playerId: selectedPlayer, code: 1, blockCode: 3 });
                      onAutoFinishPoint?.(blockerSide, 'BLK', {
                        attackPlayerId: selectedPlayer,
                        attackCode: 1,
                        blockCode: 3,
                      });
                    } else {
                      const bCodeLabel = selectedBlockCode === 1 ? 'Ofensivo' : 'Defensivo';
                      toast.success(`Bloco ${bCodeLabel} (sem identificar bloqueador)`, { duration: 2500 });
                      onConfirm({ playerId: selectedPlayer, code: 1, blockCode: selectedBlockCode! });
                      if (selectedBlockCode === 1) {
                        const blockerSide: Side = side === 'CASA' ? 'FORA' : 'CASA';
                        onChainAction?.('defense', blockerSide);
                      } else {
                        onChainAction?.('defense', side);
                      }
                    }
                  }}
                >
                  Sem identificar bloqueador →
                </Button>
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
