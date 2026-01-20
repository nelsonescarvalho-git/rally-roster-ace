import { ReactNode } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Undo2, Target, Swords, Square, ShieldCheck, Shield, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ActionType = 'serve' | 'reception' | 'setter' | 'attack' | 'block' | 'defense';

interface ActionPadProps {
  actionType: ActionType;
  teamSide: 'home' | 'away';
  teamName: string;
  currentStep: number;
  totalSteps: number;
  onUndo?: () => void;
  onCancel?: () => void;
  children: ReactNode;
  showShortcuts?: boolean;
  customShortcuts?: string;
}

const ACTION_CONFIG: Record<ActionType, { icon: typeof Target; label: string; color: string }> = {
  serve: { icon: Circle, label: 'Serviço', color: 'text-orange-500' },
  reception: { icon: Shield, label: 'Receção', color: 'text-green-500' },
  setter: { icon: Target, label: 'Distribuição', color: 'text-purple-500' },
  attack: { icon: Swords, label: 'Ataque', color: 'text-red-500' },
  block: { icon: Square, label: 'Bloco', color: 'text-blue-500' },
  defense: { icon: ShieldCheck, label: 'Defesa', color: 'text-teal-500' },
};

const DEFAULT_SHORTCUTS = '0-3 Qualidade • U Undo • Esc Cancelar';

export function ActionPad({
  actionType,
  teamSide,
  teamName,
  currentStep,
  totalSteps,
  onUndo,
  onCancel,
  children,
  showShortcuts = true,
  customShortcuts,
}: ActionPadProps) {
  const config = ACTION_CONFIG[actionType];
  const Icon = config.icon;

  const teamColorClasses = teamSide === 'home'
    ? 'bg-home text-home-foreground'
    : 'bg-away text-away-foreground';

  return (
    <Card className="overflow-hidden border-2">
      {/* Compact Header */}
      <CardHeader className="py-2.5 px-4 bg-muted/50 border-b">
        <div className="flex items-center justify-between">
          {/* Left: Icon + Title + Step */}
          <div className="flex items-center gap-3">
            <div className={cn('p-1.5 rounded-lg bg-background', config.color)}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{config.label}</span>
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                {currentStep}/{totalSteps}
              </Badge>
            </div>
          </div>

          {/* Right: Team Badge + Undo */}
          <div className="flex items-center gap-2">
            <Badge className={cn('text-xs font-semibold', teamColorClasses)}>
              {teamName.length > 10 ? teamName.slice(0, 10) + '…' : teamName}
            </Badge>
            {onUndo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onUndo}
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                title="Undo (U)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Body */}
      <CardContent className="p-4 space-y-4">
        {children}
      </CardContent>

      {/* Footer with shortcuts */}
      {showShortcuts && (
        <div className="px-4 py-2 bg-muted/30 border-t text-center">
          <span className="text-[10px] font-mono text-muted-foreground">
            {customShortcuts || DEFAULT_SHORTCUTS}
          </span>
        </div>
      )}
    </Card>
  );
}
