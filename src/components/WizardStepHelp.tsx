import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

type WizardStep = 'serve' | 'reception' | 'setter' | 'attack' | 'block' | 'defense' | 'outcome';

interface HelpContent {
  title: string;
  summary: string;
  bullets: string[];
  tip: string;
}

const HELP_CONTENT: Record<WizardStep, HelpContent> = {
  serve: {
    title: 'Serviço (S 0–3)',
    summary: '3=Ace | 2=tira opções | 1=neutro | 0=erro',
    bullets: [
      '3 = Ace: ponto direto no serviço (sem controlo do adversário).',
      '2 = Difícil: tira opções claras ao adversário (receção condicionada, ataque limitado).',
      '1 = Neutro: adversário recebe e organiza ataque com qualidade aceitável.',
      '0 = Erro: rede/fora/falta → ponto para o adversário.',
    ],
    tip: 'Se o ponto for "Erro de serviço", normalmente ficas só por aqui (R/A/B/D = vazio).',
  },
  reception: {
    title: 'Receção (R 0–3)',
    summary: '3=perfeita | 2=boa | 1=fraca | 0=erro',
    bullets: [
      '3 = Perfeita: bola na zona ideal do distribuidor, todas as opções disponíveis.',
      '2 = Boa: permite ataque organizado, mas com algumas limitações.',
      '1 = Fraca: bola afastada/alta, ataque previsível (quase sempre "bola alta").',
      '0 = Erro: ace/receção direta para ponto do adversário.',
    ],
    tip: 'Se S=0 (erro serviço), esta etapa não se preenche.',
  },
  setter: {
    title: 'Distribuição (Setter)',
    summary: 'Quem distribui + para onde',
    bullets: [
      'P2 = Ponta zona 2 (lado direito da rede).',
      'P3 = Central na rede (zona 3).',
      'P4 = Ponta zona 4 (lado esquerdo da rede).',
      'OP = Oposto (zona 2, mas atacante oposto).',
      'PIPE = Ataque de segunda linha pelo centro.',
      'BACK = Ataque de segunda linha pelos cantos.',
      'OUTROS = Outras situações (2ª bola, tips, etc.).',
    ],
    tip: 'Seleciona o setter que tocou a bola e o destino da distribuição.',
  },
  attack: {
    title: 'Ataque (A 0–3)',
    summary: '3=kill | 2=vantagem | 1=sem vantagem | 0=erro',
    bullets: [
      '3 = Ponto (Kill): ataque dá ponto direto (bola no chão, bloco fora, toque claro e sai).',
      '2 = Vantagem clara: defendem, mas ficas em clara vantagem (bola fácil / freeball).',
      '1 = Sem vantagem: defendem e organizam contra-ataque com controlo.',
      '0 = Erro: fora/rede/falta/4 toques → ponto para o adversário.',
    ],
    tip: 'Se não quiseres avaliar "vantagem", usa 2=continua com controlo e 1=continua em dificuldade.',
  },
  block: {
    title: 'Bloco (B 0–3)',
    summary: '3=ponto | 2=positivo | 1=sem controlo | 0=erro',
    bullets: [
      '3 = Bloco ponto: ponto direto do bloco (bola no chão ou devolvida impossível).',
      '2 = Toque positivo: bloco toca e condiciona forte (bola alta/fácil para a tua equipa).',
      '1 = Toque sem controlo: toca mas sem vantagem clara (rally continua equilibrado).',
      '0 = Falha/erro: bloco batido claro, falta na rede/invasão → ponto adversário.',
    ],
    tip: 'Se B=3, escolhe pelo menos 1 bloqueador (até 3) que participou no bloco.',
  },
  defense: {
    title: 'Defesa (D 0–3)',
    summary: '3=perfeita | 2=controlada | 1=esforço | 0=falha',
    bullets: [
      '3 = Defesa perfeita: controlo total, permite contra-ataque organizado.',
      '2 = Defesa controlada: bola jogável, mas com limitações.',
      '1 = Defesa em esforço: bola "viva" mas sem organização (só mantém o rally).',
      '0 = Falha: bola cai/sem controlo → ponto adversário.',
    ],
    tip: 'Se a defesa "ganha ponto" por erro do adversário, usa "Outro/OP" no outcome final.',
  },
  outcome: {
    title: 'Resultado Final',
    summary: 'Quem ganhou + motivo',
    bullets: [
      'Seleciona a equipa que ganhou o ponto.',
      'Indica o motivo: OP (Outro/Opponent Error) se não encaixar nos códigos anteriores.',
    ],
    tip: 'Este passo só aparece quando não há auto-outcome (ACE, SE, KILL, AE, BLK, DEF).',
  },
};

interface WizardStepHelpProps {
  currentStep: WizardStep;
}

export function WizardStepHelp({ currentStep }: WizardStepHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const content = HELP_CONTENT[currentStep];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-muted bg-muted/30">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-3 px-4 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                  Como preencher
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="ml-1 text-xs">{isOpen ? 'Fechar' : 'Ver mais'}</span>
                </Button>
              </div>
              <div className="text-xs text-muted-foreground font-mono">
                {content.summary}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-4 px-4">
            <div className="space-y-3">
              <div className="font-medium text-sm text-primary">
                {content.title}
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {content.bullets.map((bullet, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-primary shrink-0">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <div className="text-xs bg-primary/10 text-primary rounded-md p-2 border border-primary/20">
                <span className="font-medium">💡 Dica:</span> {content.tip}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
