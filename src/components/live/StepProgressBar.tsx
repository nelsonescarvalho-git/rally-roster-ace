import { cn } from '@/lib/utils';
import { CircleDot, Shield, Target, Swords, Square, ShieldCheck, Check } from 'lucide-react';

type WizardStep = 'serve' | 'reception' | 'setter' | 'attack' | 'block' | 'defense' | 'outcome';

interface StepProgressBarProps {
  steps: WizardStep[];
  currentStep: WizardStep;
  getStepIndex: (step: WizardStep) => number;
}

const stepConfig: Record<WizardStep, { icon: React.ElementType; label: string; shortLabel: string; colorClass: string }> = {
  serve: { 
    icon: CircleDot, 
    label: 'Serviço', 
    shortLabel: 'S',
    colorClass: 'bg-primary'
  },
  reception: { 
    icon: Shield, 
    label: 'Receção', 
    shortLabel: 'R',
    colorClass: 'bg-success'
  },
  setter: { 
    icon: Target, 
    label: 'Distrib.', 
    shortLabel: 'D',
    colorClass: 'bg-[hsl(280,68%,50%)]'
  },
  attack: { 
    icon: Swords, 
    label: 'Ataque', 
    shortLabel: 'A',
    colorClass: 'bg-destructive'
  },
  block: { 
    icon: Square, 
    label: 'Bloco', 
    shortLabel: 'B',
    colorClass: 'bg-warning'
  },
  defense: { 
    icon: ShieldCheck, 
    label: 'Defesa', 
    shortLabel: 'Df',
    colorClass: 'bg-accent'
  },
  outcome: { 
    icon: Check, 
    label: 'Resultado', 
    shortLabel: 'R',
    colorClass: 'bg-muted'
  },
};

export function StepProgressBar({ steps, currentStep, getStepIndex }: StepProgressBarProps) {
  const currentIndex = getStepIndex(currentStep);
  
  // Filter out outcome from display
  const displaySteps = steps.filter(s => s !== 'outcome');

  return (
    <div className="flex items-center justify-center gap-1 px-2">
      {displaySteps.map((step, idx) => {
        const config = stepConfig[step];
        const Icon = config.icon;
        const stepIndex = getStepIndex(step);
        const isCompleted = stepIndex < currentIndex;
        const isActive = step === currentStep;
        const isPending = stepIndex > currentIndex;

        return (
          <div key={step} className="flex items-center">
            <div 
              className={cn(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-300',
                isActive && `${config.colorClass} text-white shadow-lg scale-110`,
                isCompleted && 'bg-success/20 text-success',
                isPending && 'bg-muted text-muted-foreground'
              )}
            >
              <div className="relative">
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span className="text-[10px] font-medium leading-none">
                {config.shortLabel}
              </span>
            </div>
            {idx < displaySteps.length - 1 && (
              <div className={cn(
                'w-4 h-0.5 mx-0.5 rounded-full transition-colors',
                stepIndex < currentIndex ? 'bg-success' : 'bg-border'
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}
