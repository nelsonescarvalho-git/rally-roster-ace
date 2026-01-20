import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColoredRatingButton } from './ColoredRatingButton';
import { WizardSectionCard } from './WizardSectionCard';
import { PositionBadge } from './PositionBadge';
import { PlayerGrid } from './PlayerGrid';
import { ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  RallyActionType, 
  Side, 
  Player, 
  PassDestination, 
  KillType,
  POSITIONS_BY_RECEPTION,
  RallyAction
} from '@/types/volleyball';

const CODES = [0, 1, 2, 3];
const DESTINATIONS: PassDestination[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK', 'OUTROS'];

interface ActionEditorProps {
  actionType: RallyActionType;
  side: Side;
  players: Player[];
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
  // Context for setter (reception quality for destination filtering)
  receptionCode?: number | null;
  // Attack pass quality (distribution quality for attack)
  attackPassQuality?: number | null;
  // Zone getter for player zones
  getZoneLabel?: (playerId: string, side: Side) => string;
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
  onAttackPassQualityChange?: (quality: number | null) => void;
  onConfirm: () => void;
  onCancel: () => void;
  // Navigation between actions
  currentActionIndex?: number;
  totalActions?: number;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  isEditingExisting?: boolean;
}

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
  receptionCode,
  attackPassQuality,
  getZoneLabel,
  onPlayerChange,
  onCodeChange,
  onKillTypeChange,
  onSetterChange,
  onDestinationChange,
  onPassCodeChange,
  onBlocker1Change,
  onBlocker2Change,
  onBlocker3Change,
  onAttackPassQualityChange,
  onConfirm,
  onCancel,
  currentActionIndex,
  totalActions,
  onNavigatePrev,
  onNavigateNext,
  isEditingExisting,
}: ActionEditorProps) {
  const teamName = side === 'CASA' ? homeName : awayName;
  const teamSide = side === 'CASA' ? 'home' : 'away';

  // Get available positions based on reception quality
  const availablePositions = receptionCode !== null && receptionCode !== undefined
    ? POSITIONS_BY_RECEPTION[receptionCode] || DESTINATIONS
    : DESTINATIONS;

  // Auto-confirm handlers
  const handleCodeWithAutoConfirm = useCallback((code: number) => {
    if (selectedCode === code) {
      onCodeChange(null);
      return;
    }
    
    onCodeChange(code);
    
    // Auto-confirm for Block and Defense (no additional input needed)
    if (actionType === 'block' || actionType === 'defense') {
      // Use requestAnimationFrame to ensure state update is processed before confirming
      requestAnimationFrame(() => {
        setTimeout(() => onConfirm(), 0);
      });
      return;
    }
    
    // Auto-confirm for Attack only if code ≠ 3 (code 3 needs Kill Type)
    if (actionType === 'attack' && code !== 3) {
      // Use requestAnimationFrame to ensure state update is processed before confirming
      requestAnimationFrame(() => {
        setTimeout(() => onConfirm(), 0);
      });
    }
  }, [actionType, selectedCode, onCodeChange, onConfirm]);

  const handleKillTypeWithAutoConfirm = useCallback((type: KillType) => {
    onKillTypeChange?.(type);
    // Always auto-confirm after selecting Kill Type
    setTimeout(() => onConfirm(), 50);
  }, [onKillTypeChange, onConfirm]);

  const handleDestinationWithAutoConfirm = useCallback((dest: PassDestination) => {
    if (selectedDestination === dest) {
      onDestinationChange?.(null);
      return;
    }
    
    onDestinationChange?.(dest);
    
    // Só auto-confirma se o setter estiver selecionado
    if (selectedSetter) {
      setTimeout(() => onConfirm(), 50);
    }
  }, [selectedDestination, selectedSetter, onDestinationChange, onConfirm]);

  const renderContent = () => {
    switch (actionType) {
      case 'serve':
      case 'reception':
      case 'defense':
        return (
          <div className="space-y-3">
            {/* Player Grid instead of dropdown */}
            <PlayerGrid
              players={players}
              selectedPlayer={selectedPlayer}
              onSelect={(id) => onPlayerChange(id)}
              onDeselect={() => onPlayerChange(null)}
              side={side}
              getZoneLabel={getZoneLabel}
              columns={6}
              size="sm"
            />
            <div className="grid grid-cols-4 gap-2">
              {CODES.map((code) => (
                <ColoredRatingButton
                  key={code}
                  code={code}
                  selected={selectedCode === code}
                  onClick={() => handleCodeWithAutoConfirm(code)}
                />
              ))}
            </div>
          </div>
        );

      case 'setter':
        return (
          <div className="space-y-3">
            {/* Setter Grid instead of dropdown */}
            <PlayerGrid
              players={players}
              selectedPlayer={selectedSetter}
              onSelect={(id) => onSetterChange?.(id)}
              onDeselect={() => onSetterChange?.(null)}
              side={side}
              getZoneLabel={getZoneLabel}
              columns={6}
              size="sm"
            />
            
            {/* Two Column Layout: Pass Quality | Destination */}
            <div className="grid grid-cols-2 gap-4">
              {/* Column 1: Pass Quality */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Qualidade do Passe
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CODES.map((code) => (
                    <ColoredRatingButton
                      key={code}
                      code={code}
                      selected={selectedPassCode === code}
                      onClick={() => onPassCodeChange?.(selectedPassCode === code ? null : code)}
                      size="md"
                    />
                  ))}
                </div>
              </div>
              
              {/* Column 2: Destination */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Destino
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {availablePositions.map((dest) => (
                    <Button
                      key={dest}
                      variant={selectedDestination === dest ? 'default' : 'outline'}
                      className="h-10 text-xs"
                      onClick={() => handleDestinationWithAutoConfirm(dest)}
                    >
                      {dest}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 'attack':
        return (
          <div className="space-y-3">
            {/* Attacker Grid instead of dropdown */}
            <PlayerGrid
              players={players}
              selectedPlayer={selectedPlayer}
              onSelect={(id) => onPlayerChange(id)}
              onDeselect={() => onPlayerChange(null)}
              side={side}
              getZoneLabel={getZoneLabel}
              columns={6}
              size="sm"
            />
            
            {/* Two Column Layout: Pass Quality | Attack Rating */}
            <div className="grid grid-cols-2 gap-4">
              {/* Column 1: Pass Quality (Primary) */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Qualidade do Passe
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CODES.map((code) => (
                    <ColoredRatingButton
                      key={`pass-${code}`}
                      code={code}
                      selected={attackPassQuality === code}
                      onClick={() => onAttackPassQualityChange?.(attackPassQuality === code ? null : code)}
                      size="md"
                    />
                  ))}
                </div>
              </div>
              
              {/* Column 2: Attack Rating */}
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground text-center">
                  Avaliação do Ataque
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {CODES.map((code) => (
                    <ColoredRatingButton
                      key={code}
                      code={code}
                      selected={selectedCode === code}
                      onClick={() => handleCodeWithAutoConfirm(code)}
                      size="md"
                    />
                  ))}
                </div>
              </div>
            </div>
            
            {/* Kill Type Selection when code = 3 */}
            {selectedCode === 3 && (
              <div className={cn(
                'flex items-center justify-between p-3 border-2 rounded-lg',
                selectedKillType === null ? 'bg-success/10 border-success animate-pulse' : 'bg-success/5 border-success/30'
              )}>
                <span className="text-sm font-medium">
                  Tipo de Kill <span className="text-destructive">*</span>
                </span>
                <div className="flex gap-2">
                  <Button
                    variant={selectedKillType === 'FLOOR' ? 'default' : 'outline'}
                    size="sm"
                    className={selectedKillType === 'FLOOR' ? 'bg-success hover:bg-success/90' : ''}
                    onClick={() => handleKillTypeWithAutoConfirm('FLOOR')}
                  >
                    🏐 Chão
                  </Button>
                  <Button
                    variant={selectedKillType === 'BLOCKOUT' ? 'default' : 'outline'}
                    size="sm"
                    className={selectedKillType === 'BLOCKOUT' ? 'bg-success hover:bg-success/90' : ''}
                    onClick={() => handleKillTypeWithAutoConfirm('BLOCKOUT')}
                  >
                    🚫 Block-out
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      case 'block':
        return (
          <div className="space-y-3">
            {/* Block - 3 compact player grids for blockers */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">Bloqueadores (até 3)</div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground text-center">Bloq 1</div>
                  <PlayerGrid
                    players={players}
                    selectedPlayer={selectedBlocker1}
                    onSelect={(id) => onBlocker1Change?.(id)}
                    onDeselect={() => onBlocker1Change?.(null)}
                    side={side}
                    getZoneLabel={getZoneLabel}
                    columns={3}
                    size="sm"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground text-center">Bloq 2</div>
                  <PlayerGrid
                    players={players}
                    selectedPlayer={selectedBlocker2}
                    onSelect={(id) => onBlocker2Change?.(id)}
                    onDeselect={() => onBlocker2Change?.(null)}
                    side={side}
                    getZoneLabel={getZoneLabel}
                    columns={3}
                    size="sm"
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground text-center">Bloq 3</div>
                  <PlayerGrid
                    players={players}
                    selectedPlayer={selectedBlocker3}
                    onSelect={(id) => onBlocker3Change?.(id)}
                    onDeselect={() => onBlocker3Change?.(null)}
                    side={side}
                    getZoneLabel={getZoneLabel}
                    columns={3}
                    size="sm"
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {CODES.map((code) => (
                <ColoredRatingButton
                  key={code}
                  code={code}
                  selected={selectedCode === code}
                  onClick={() => handleCodeWithAutoConfirm(code)}
                />
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <WizardSectionCard
      actionType={actionType}
      teamName={teamName}
      teamSide={teamSide}
    >
      {renderContent()}
      
      {/* Navigation footer with back/forward buttons */}
      <div className="flex justify-between pt-3 border-t mt-3">
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground" 
          onClick={currentActionIndex !== undefined && currentActionIndex > 0 && onNavigatePrev 
            ? onNavigatePrev 
            : onCancel}
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
    </WizardSectionCard>
  );
}