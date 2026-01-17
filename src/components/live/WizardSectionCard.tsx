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
  headerBg: string;
  borderColor: string;
}> = {
  serve: { 
    icon: CircleDot, 
    label: 'Serviço',
    headerBg: 'bg-primary',
    borderColor: 'border-l-primary',
  },
  reception: { 
    icon: Shield, 
    label: 'Receção',
    headerBg: 'bg-success',
    borderColor: 'border-l-success',
  },
  setter: { 
    icon: Target, 
    label: 'Distribuição',
    headerBg: 'bg-[hsl(280,68%,50%)]',
    borderColor: 'border-l-[hsl(280,68%,50%)]',
  },
  attack: { 
    icon: Swords, 
    label: 'Ataque',
    headerBg: 'bg-destructive',
    borderColor: 'border-l-destructive',
  },
  block: { 
    icon: Square, 
    label: 'Bloco',
    headerBg: 'bg-warning',
    borderColor: 'border-l-warning',
  },
  defense: { 
    icon: ShieldCheck, 
    label: 'Defesa',
    headerBg: 'bg-accent',
    borderColor: 'border-l-accent',
  },
};

export function WizardSectionCard({ 
  actionType, 
  teamName, 
  teamSide = 'home',
  optional = false,
  children 
}: WizardSectionCardProps) {
  const config = actionConfig[actionType];
  const Icon = config.icon;

  return (
    <Card className={cn(
      'overflow-hidden border-l-4 shadow-sm',
      config.borderColor
    )}>
      {/* Colored Header */}
      <div className={cn(
        'flex items-center gap-2 px-4 py-2',
        config.headerBg,
        'text-white'
      )}>
        <Icon className="h-5 w-5" />
        <span className="font-semibold">{config.label}</span>
        {optional && (
          <span className="text-xs opacity-80">(opcional)</span>
        )}
        <div className="flex-1" />
        {teamName && (
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            teamSide === 'home' ? 'bg-home/30' : 'bg-away/30'
          )}>
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
