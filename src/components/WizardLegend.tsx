import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface WizardLegendProps {
  homeName: string;
  awayName: string;
}

export function WizardLegend({ homeName, awayName }: WizardLegendProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-muted bg-muted/30">
        <CollapsibleTrigger asChild>
          <div className="py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5" />
                <span>Legenda</span>
              </div>
              <Button variant="ghost" size="sm" className="h-5 px-1.5">
                {isOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-3 space-y-3">
            {/* Team Colors */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Cores das Equipas</div>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-home/20 border border-home/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-home"></span>
                  <span className="text-xs font-medium text-home">{homeName}</span>
                  <span className="text-[10px] text-home/70">(CASA)</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-away/20 border border-away/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-away"></span>
                  <span className="text-xs font-medium text-away">{awayName}</span>
                  <span className="text-[10px] text-away/70">(FORA)</span>
                </div>
              </div>
            </div>

            {/* Code Scale */}
            <div className="space-y-1.5">
              <div className="text-xs font-medium text-muted-foreground">Escala de Códigos (0-3)</div>
              <div className="grid grid-cols-4 gap-1">
                <div className="flex flex-col items-center p-1.5 rounded-md bg-destructive/10 border border-destructive/20">
                  <span className="text-sm font-bold text-destructive">0</span>
                  <span className="text-[10px] text-destructive/80 text-center leading-tight">Erro/Falha</span>
                </div>
                <div className="flex flex-col items-center p-1.5 rounded-md bg-orange-500/10 border border-orange-500/20">
                  <span className="text-sm font-bold text-orange-600 dark:text-orange-400">1</span>
                  <span className="text-[10px] text-orange-600/80 dark:text-orange-400/80 text-center leading-tight">Neutro</span>
                </div>
                <div className="flex flex-col items-center p-1.5 rounded-md bg-blue-500/10 border border-blue-500/20">
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">2</span>
                  <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80 text-center leading-tight">Bom</span>
                </div>
                <div className="flex flex-col items-center p-1.5 rounded-md bg-green-500/10 border border-green-500/20">
                  <span className="text-sm font-bold text-green-600 dark:text-green-400">3</span>
                  <span className="text-[10px] text-green-600/80 dark:text-green-400/80 text-center leading-tight">Excelente</span>
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground text-center">
                0 = ponto adversário • 3 = ponto próprio ou vantagem máxima
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
