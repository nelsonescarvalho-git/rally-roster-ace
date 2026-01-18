import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { CircleDot, Shield, Target, Swords, Square, ShieldCheck } from 'lucide-react';

type ActionType = 'serve' | 'reception' | 'setter' | 'attack' | 'block' | 'defense';
type TeamSide = 'home' | 'away';

interface WizardSectionCardProps {
  actionType: ActionType;
  teamName?: string;
  teamSide?: TeamSide;
  optional?: boolean;
  children: ReactNode;
}

const actionConfig: Record<ActionType, { 
  icon: React.ElementType; 
  label: string; 
}> = {
  serve: { icon: CircleDot, label: 'Serviço' },
  reception: { icon: Shield, label: 'Receção' },
  setter: { icon: Target, label: 'Distribuição' },
  attack: { icon: Swords, label: 'Ataque' },
  block: { icon: Square, label: 'Bloco' },
  defense: { icon: ShieldCheck, label: 'Defesa' },
};

// Team-based colors instead of action-based
const teamColors: Record<TeamSide, { headerBg: string; borderColor: string }> = {
  home: { headerBg: 'bg-home', borderColor: 'border-l-home' },
  away: { headerBg: 'bg-away', borderColor: 'border-l-away' },
};

export function WizardSectionCard({ 
  actionType, 
  teamName, 
  teamSide = 'home',
  optional = false,
  children 
}: WizardSectionCardProps) {
  const config = actionConfig[actionType];
  const colors = teamColors[teamSide];
  const Icon = config.icon;

  return (
    <Card className={cn(
      'overflow-hidden border-l-4 shadow-sm',
      colors.borderColor
    )}>
      {/* Colored Header - color based on team */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-2 text-white',
        colors.headerBg
      )}>
        <Icon className="h-5 w-5" />
        <span className="font-semibold">{config.label}</span>
        {optional && (
          <span className="text-xs opacity-80">(opcional)</span>
        )}
        <div className="flex-1" />
        {teamName && (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">
            {teamName}
          </span>
        )}
      </div>
      
      {/* Content */}
      <CardContent className="p-4 space-y-3">
        {children}
      </CardContent>
    </Card>
  );
}
