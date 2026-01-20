import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ShortcutItem {
  key: string;
  description: string;
}

interface ShortcutsOverlayProps {
  shortcuts?: ShortcutItem[];
  className?: string;
}

const DEFAULT_SHORTCUTS: ShortcutItem[] = [
  { key: '0-3', description: 'Selecionar qualidade' },
  { key: 'U', description: 'Desfazer último' },
  { key: 'Esc', description: 'Cancelar/Fechar' },
  { key: '←/→', description: 'Navegar jogadores' },
  { key: 'Enter', description: 'Confirmar seleção' },
];

const DISTRIBUTION_SHORTCUTS: ShortcutItem[] = [
  { key: '2/3/4', description: 'Posição P2/P3/P4' },
  { key: 'O', description: 'Oposto (OP)' },
  { key: 'I', description: 'PIPE' },
  { key: 'B', description: 'BACK' },
  { key: 'X', description: 'Outros' },
];

export function ShortcutsOverlay({ 
  shortcuts = DEFAULT_SHORTCUTS,
  className 
}: ShortcutsOverlayProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('fixed bottom-4 right-4 z-50', className)}>
      {isOpen ? (
        <Card className="w-64 shadow-lg animate-in slide-in-from-bottom-2 duration-200">
          <CardHeader className="py-2 px-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Atalhos de Teclado</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="py-2 px-3 space-y-1.5">
            {shortcuts.map(({ key, description }) => (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{description}</span>
                <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono font-semibold">
                  {key}
                </kbd>
              </div>
            ))}
            
            {/* Distribution shortcuts section */}
            <div className="border-t pt-1.5 mt-2">
              <div className="text-[10px] text-muted-foreground mb-1">Distribuição:</div>
              {DISTRIBUTION_SHORTCUTS.map(({ key, description }) => (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{description}</span>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono font-semibold">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="h-10 w-10 rounded-full shadow-lg bg-background"
          title="Atalhos de teclado"
        >
          <HelpCircle className="h-5 w-5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
}
