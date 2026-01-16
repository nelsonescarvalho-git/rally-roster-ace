import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { History, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Rally, MatchPlayer, Player, Side, Reason } from '@/types/volleyball';

interface RecentPlaysProps {
  rallies: Rally[];
  players: (Player | MatchPlayer)[];
  homeName: string;
  awayName: string;
  currentSet: number;
}

function getCodeBadgeClass(code: number | null): string {
  switch (code) {
    case 0: return 'bg-destructive/20 text-destructive border-destructive/30';
    case 1: return 'bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30';
    case 2: return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30';
    case 3: return 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30';
    default: return 'bg-muted text-muted-foreground border-muted';
  }
}

interface ActionInfo {
  actorLabel: string;
  actionText: string;
  isError: boolean;
  winnerLabel: string;
}

function getActionInfo(rally: Rally, homeName: string, awayName: string): ActionInfo {
  const homeLabel = homeName.slice(0, 3).toUpperCase();
  const awayLabel = awayName.slice(0, 3).toUpperCase();
  const winnerLabel = rally.point_won_by === 'CASA' ? homeLabel : awayLabel;
  const loserLabel = rally.point_won_by === 'CASA' ? awayLabel : homeLabel;
  const serverLabel = rally.serve_side === 'CASA' ? homeLabel : awayLabel;

  switch (rally.reason) {
    case 'SE':
      // Serve Error - servidor errou, adversário ganhou
      return { 
        actorLabel: serverLabel,
        actionText: 'errou serv.',
        isError: true,
        winnerLabel
      };
    case 'AE':
      // Attack Error - atacante errou (quem NÃO ganhou)
      return { 
        actorLabel: loserLabel,
        actionText: 'errou atq.',
        isError: true,
        winnerLabel
      };
    case 'ACE':
      return { 
        actorLabel: winnerLabel,
        actionText: 'Ace',
        isError: false,
        winnerLabel
      };
    case 'KILL':
      return { 
        actorLabel: winnerLabel,
        actionText: 'Kill',
        isError: false,
        winnerLabel
      };
    case 'BLK':
      return { 
        actorLabel: winnerLabel,
        actionText: 'Bloco',
        isError: false,
        winnerLabel
      };
    case 'DEF':
      return { 
        actorLabel: winnerLabel,
        actionText: 'Defesa',
        isError: false,
        winnerLabel
      };
    default:
      return { 
        actorLabel: winnerLabel,
        actionText: 'Outro',
        isError: false,
        winnerLabel
      };
  }
}

export function RecentPlays({ rallies, players, homeName, awayName, currentSet }: RecentPlaysProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Get rallies for current set, group by rally_no, take last 5 unique rallies
  const setRallies = rallies.filter(r => r.set_no === currentSet);
  
  // Group by rally_no and get the final phase of each rally
  const rallyMap = new Map<number, Rally>();
  setRallies.forEach(r => {
    const existing = rallyMap.get(r.rally_no);
    if (!existing || r.phase > existing.phase) {
      rallyMap.set(r.rally_no, r);
    }
  });
  
  // Get last 5 completed rallies (with point_won_by)
  const completedRallies = Array.from(rallyMap.values())
    .filter(r => r.point_won_by)
    .sort((a, b) => b.rally_no - a.rally_no)
    .slice(0, 5);

  if (completedRallies.length === 0) {
    return null;
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border-muted bg-muted/30">
        <CollapsibleTrigger asChild>
          <CardHeader className="py-2 px-3 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs font-medium flex items-center gap-2 text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Últimas {completedRallies.length} jogadas
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-5 px-1.5">
                {isOpen ? (
                  <ChevronUp className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </Button>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="space-y-1.5">
              {completedRallies.map((rally) => {
                const actionInfo = getActionInfo(rally, homeName, awayName);
                
                return (
                  <div 
                    key={rally.id}
                    className={`flex items-center gap-2 p-2 rounded-md border text-xs ${
                      rally.point_won_by === 'CASA'
                        ? 'bg-home/10 border-home/20'
                        : 'bg-away/10 border-away/20'
                    }`}
                  >
                    {/* Rally number */}
                    <span className="font-mono text-muted-foreground w-6 text-center">
                      #{rally.rally_no}
                    </span>
                    
                    {/* Action description */}
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      {actionInfo.isError ? (
                        <>
                          <span className="text-destructive font-medium">
                            {actionInfo.actorLabel}
                          </span>
                          <span className="text-muted-foreground">
                            {actionInfo.actionText}
                          </span>
                          <span className="text-muted-foreground">→</span>
                          <span className={`font-medium ${
                            rally.point_won_by === 'CASA' ? 'text-home' : 'text-away'
                          }`}>
                            +{actionInfo.winnerLabel}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className={`font-medium ${
                            rally.point_won_by === 'CASA' ? 'text-home' : 'text-away'
                          }`}>
                            +{actionInfo.actorLabel}
                          </span>
                          <span className="text-muted-foreground">
                            {actionInfo.actionText}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Stats summary */}
                    <div className="flex items-center gap-1 ml-auto">
                      {rally.s_code !== null && (
                        <span className={`px-1 py-0.5 rounded border text-[10px] font-mono ${getCodeBadgeClass(rally.s_code)}`}>
                          S{rally.s_code}
                        </span>
                      )}
                      {rally.r_code !== null && (
                        <span className={`px-1 py-0.5 rounded border text-[10px] font-mono ${getCodeBadgeClass(rally.r_code)}`}>
                          R{rally.r_code}
                        </span>
                      )}
                      {rally.a_code !== null && (
                        <span className={`px-1 py-0.5 rounded border text-[10px] font-mono ${getCodeBadgeClass(rally.a_code)}`}>
                          A{rally.a_code}
                        </span>
                      )}
                      {rally.b_code !== null && (
                        <span className={`px-1 py-0.5 rounded border text-[10px] font-mono ${getCodeBadgeClass(rally.b_code)}`}>
                          B{rally.b_code}
                        </span>
                      )}
                      {rally.d_code !== null && (
                        <span className={`px-1 py-0.5 rounded border text-[10px] font-mono ${getCodeBadgeClass(rally.d_code)}`}>
                          D{rally.d_code}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
