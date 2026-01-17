import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ColoredRatingButton } from './ColoredRatingButton';
import { WizardSectionCard } from './WizardSectionCard';
import { X, Check } from 'lucide-react';
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
  onConfirm: () => void;
  onCancel: () => void;
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
  onPlayerChange,
  onCodeChange,
  onKillTypeChange,
  onSetterChange,
  onDestinationChange,
  onPassCodeChange,
  onBlocker1Change,
  onBlocker2Change,
  onBlocker3Change,
  onConfirm,
  onCancel,
}: ActionEditorProps) {
  const teamName = side === 'CASA' ? homeName : awayName;
  const teamSide = side === 'CASA' ? 'home' : 'away';

  // Get available positions based on reception quality
  const availablePositions = receptionCode !== null && receptionCode !== undefined
    ? POSITIONS_BY_RECEPTION[receptionCode] || DESTINATIONS
    : DESTINATIONS;

  const renderContent = () => {
    switch (actionType) {
      case 'serve':
      case 'reception':
      case 'defense':
        return (
          <div className="space-y-3">
            <Select
              value={selectedPlayer || '__none__'}
              onValueChange={(val) => onPlayerChange(val === '__none__' ? null : val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar jogador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {players.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    #{p.jersey_number} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-4 gap-2">
              {CODES.map((code) => (
                <ColoredRatingButton
                  key={code}
                  code={code}
                  selected={selectedCode === code}
                  onClick={() => onCodeChange(selectedCode === code ? null : code)}
                />
              ))}
            </div>
          </div>
        );

      case 'setter':
        return (
          <div className="space-y-3">
            <Select
              value={selectedSetter || '__none__'}
              onValueChange={(val) => onSetterChange?.(val === '__none__' ? null : val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar distribuidor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {players.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    #{p.jersey_number} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="text-xs text-muted-foreground">Qualidade do passe:</div>
            <div className="grid grid-cols-4 gap-2">
              {CODES.map((code) => (
                <ColoredRatingButton
                  key={code}
                  code={code}
                  selected={selectedPassCode === code}
                  onClick={() => onPassCodeChange?.(selectedPassCode === code ? null : code)}
                  size="sm"
                />
              ))}
            </div>
            
            <div className="text-xs text-muted-foreground">Destino:</div>
            <div className="grid grid-cols-4 gap-2">
              {availablePositions.map((dest) => (
                <Button
                  key={dest}
                  variant={selectedDestination === dest ? 'default' : 'outline'}
                  className="h-10 text-xs"
                  onClick={() => onDestinationChange?.(selectedDestination === dest ? null : dest)}
                >
                  {dest}
                </Button>
              ))}
            </div>
          </div>
        );

      case 'attack':
        return (
          <div className="space-y-3">
            <Select
              value={selectedPlayer || '__none__'}
              onValueChange={(val) => onPlayerChange(val === '__none__' ? null : val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar atacante" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhum</SelectItem>
                {players.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    #{p.jersey_number} {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-4 gap-2">
              {CODES.map((code) => (
                <ColoredRatingButton
                  key={code}
                  code={code}
                  selected={selectedCode === code}
                  onClick={() => onCodeChange(selectedCode === code ? null : code)}
                />
              ))}
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
                    onClick={() => onKillTypeChange?.('FLOOR')}
                  >
                    🏐 Chão
                  </Button>
                  <Button
                    variant={selectedKillType === 'BLOCKOUT' ? 'default' : 'outline'}
                    size="sm"
                    className={selectedKillType === 'BLOCKOUT' ? 'bg-success hover:bg-success/90' : ''}
                    onClick={() => onKillTypeChange?.('BLOCKOUT')}
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
            <div className="grid grid-cols-3 gap-2">
              <Select
                value={selectedBlocker1 || '__none__'}
                onValueChange={(val) => onBlocker1Change?.(val === '__none__' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bloq 1" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.jersey_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedBlocker2 || '__none__'}
                onValueChange={(val) => onBlocker2Change?.(val === '__none__' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bloq 2" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.jersey_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedBlocker3 || '__none__'}
                onValueChange={(val) => onBlocker3Change?.(val === '__none__' ? null : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Bloq 3" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhum</SelectItem>
                  {players.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      #{p.jersey_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {CODES.map((code) => (
                <ColoredRatingButton
                  key={code}
                  code={code}
                  selected={selectedCode === code}
                  onClick={() => onCodeChange(selectedCode === code ? null : code)}
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
      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" />
          Cancelar
        </Button>
        <Button className="flex-1" onClick={onConfirm}>
          <Check className="h-4 w-4 mr-1" />
          Confirmar
        </Button>
      </div>
    </WizardSectionCard>
  );
}
