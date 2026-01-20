import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PlayerGrid } from './PlayerGrid';
import { ColoredRatingButton } from './ColoredRatingButton';
import { ChevronLeft, Target, Swords, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Player, Side, PassDestination, RallyAction } from '@/types/volleyball';

interface ComboSetterAttackProps {
  players: Player[];
  side: Side;
  homeName: string;
  awayName: string;
  getZoneLabel?: (playerId: string, side: Side) => string;
  /** Reception quality for destination filtering */
  receptionCode?: number | null;
  onComplete: (setterAction: RallyAction, attackAction: RallyAction) => void;
  onCancel: () => void;
}

const DESTINATIONS: PassDestination[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK', 'OUTROS'];
const CODES = [0, 1, 2, 3];

export function ComboSetterAttack({
  players,
  side,
  homeName,
  awayName,
  getZoneLabel,
  receptionCode,
  onComplete,
  onCancel,
}: ComboSetterAttackProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [setterId, setSetterId] = useState<string | null>(null);
  const [destination, setDestination] = useState<PassDestination | null>(null);
  const [attackerId, setAttackerId] = useState<string | null>(null);
  const [attackCode, setAttackCode] = useState<number | null>(null);
  const [passQuality, setPassQuality] = useState<number | null>(null);

  const teamName = side === 'CASA' ? homeName : awayName;
  const teamColor = side === 'CASA' ? 'home' : 'away';

  // Get setter from player
  const setterPlayer = useMemo(() => 
    players.find(p => p.id === setterId),
    [players, setterId]
  );

  // Get attacker from player
  const attackerPlayer = useMemo(() =>
    players.find(p => p.id === attackerId),
    [players, attackerId]
  );

  const handleSetterSelect = (id: string) => {
    setSetterId(id);
  };

  const handleDestinationSelect = (dest: PassDestination) => {
    setDestination(dest);
    setStep(2);
  };

  const handleAttackerSelect = (id: string) => {
    setAttackerId(id);
  };

  const handleAttackCodeSelect = (code: number) => {
    setAttackCode(code);
    
    // Auto-complete on code selection (if attacker already selected)
    if (attackerId) {
      const setterAction: RallyAction = {
        type: 'setter',
        side,
        phase: 1,
        setterId,
        passDestination: destination,
        passCode: passQuality,
        playerNo: setterPlayer?.jersey_number || null,
      };

      const attackAction: RallyAction = {
        type: 'attack',
        side,
        phase: 1,
        playerId: attackerId,
        playerNo: attackerPlayer?.jersey_number || null,
        code,
        attackPassQuality: passQuality,
      };

      onComplete(setterAction, attackAction);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
      setAttackerId(null);
      setAttackCode(null);
    } else {
      onCancel();
    }
  };

  // Dynamic team color from CSS variables
  const teamColorHsl = side === 'CASA' ? 'hsl(var(--home))' : 'hsl(var(--away))';

  return (
    <Card 
      className="overflow-hidden"
      style={{ 
        borderLeftWidth: '4px',
        borderLeftColor: teamColorHsl
      }}
    >
      {/* Header with gradient indicating combo */}
      <div 
        className="flex items-center gap-2 px-4 py-2 text-white"
        style={{
          background: `linear-gradient(to right, ${teamColorHsl}, rgb(147 51 234), ${teamColorHsl})`
        }}
      >
        <Target className="h-4 w-4" />
        <ArrowRight className="h-3 w-3" />
        <Swords className="h-4 w-4" />
        <span className="font-semibold">Dist + Ataque</span>
        <div className="flex-1" />
        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">
          {teamName}
        </span>
      </div>

      <CardContent className="p-4 space-y-4">
        {step === 1 && (
          <>
            {/* Step 1: Setter selection */}
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground">
                1. Distribuidor
              </div>
              <PlayerGrid
                players={players}
                selectedPlayer={setterId}
                onSelect={handleSetterSelect}
                onDeselect={() => setSetterId(null)}
                side={side}
                getZoneLabel={getZoneLabel}
                columns={6}
                size="sm"
              />
            </div>

            {/* Destination selection (appears after setter selected) */}
            {setterId && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  2. Destino
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {DESTINATIONS.slice(0, 4).map((dest) => (
                    <Button
                      key={dest}
                      variant={destination === dest ? 'default' : 'outline'}
                      className="h-10 text-xs transition-all"
                      style={destination === dest ? { backgroundColor: teamColorHsl } : undefined}
                      onClick={() => handleDestinationSelect(dest)}
                    >
                      {dest}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DESTINATIONS.slice(4).map((dest) => (
                    <Button
                      key={dest}
                      variant={destination === dest ? 'default' : 'outline'}
                      className="h-10 text-xs transition-all"
                      style={destination === dest ? { backgroundColor: teamColorHsl } : undefined}
                      onClick={() => handleDestinationSelect(dest)}
                    >
                      {dest}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {step === 2 && (
          <>
            {/* Step 2: Attacker + Code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-muted-foreground">
                  3. Atacante
                </div>
                <div className="text-xs text-muted-foreground">
                  {setterPlayer && `Dist: #${setterPlayer.jersey_number} → ${destination}`}
                </div>
              </div>
              <PlayerGrid
                players={players}
                selectedPlayer={attackerId}
                onSelect={handleAttackerSelect}
                onDeselect={() => setAttackerId(null)}
                side={side}
                getZoneLabel={getZoneLabel}
                columns={6}
                size="sm"
              />
            </div>

            {/* Attack code (appears after attacker selected) */}
            {attackerId && (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">
                  4. Resultado do Ataque
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {CODES.map((code) => (
                    <ColoredRatingButton
                      key={code}
                      code={code}
                      selected={attackCode === code}
                      onClick={() => handleAttackCodeSelect(code)}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between pt-3 border-t">
          <Button 
            variant="outline" 
            size="sm"
            className="gap-1" 
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>
          
          {/* Progress indicator */}
          <div className="flex items-center gap-1">
            <div 
              className="w-2 h-2 rounded-full transition-colors"
              style={{ backgroundColor: step >= 1 ? teamColorHsl : 'hsl(var(--muted))' }}
            />
            <div 
              className="w-2 h-2 rounded-full transition-colors"
              style={{ backgroundColor: step >= 2 ? teamColorHsl : 'hsl(var(--muted))' }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
