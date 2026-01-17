import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, ChevronDown, ChevronRight, AlertTriangle, Pencil, Filter } from 'lucide-react';
import { Rally, Player, MatchPlayer, Side } from '@/types/volleyball';
import { EditRallyModal } from '@/components/EditRallyModal';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

function getCodeColor(code: number | null): string {
  switch (code) {
    case 0: return 'bg-destructive text-destructive-foreground';
    case 1: return 'bg-orange-500 text-white';
    case 2: return 'bg-blue-500 text-white';
    case 3: return 'bg-green-500 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getCodeLabel(code: number | null): string {
  switch (code) {
    case 0: return 'Erro';
    case 1: return 'Fraco';
    case 2: return 'Bom';
    case 3: return 'Excelente';
    default: return '-';
  }
}

interface ActionBadgeProps {
  label: string;
  code: number | null;
  playerNumber: number | null;
  playerName?: string;
  className?: string;
}

function ActionBadge({ label, code, playerNumber, playerName, className = '' }: ActionBadgeProps) {
  if (code === null && playerNumber === null) return null;
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}:</span>
      {playerNumber !== null && (
        <Badge variant="outline" className="text-xs font-mono">
          #{playerNumber}
        </Badge>
      )}
      {playerName && (
        <span className="text-xs text-muted-foreground truncate max-w-20">{playerName}</span>
      )}
      {code !== null && (
        <Badge className={`text-[10px] px-1.5 ${getCodeColor(code)}`}>
          {code}
        </Badge>
      )}
    </div>
  );
}

interface RallyPhaseCardProps {
  rally: Rally;
  players: (Player | MatchPlayer)[];
  homeName: string;
  awayName: string;
  onEdit: (rally: Rally) => void;
}

function RallyPhaseCard({ rally, players, homeName, awayName, onEdit }: RallyPhaseCardProps) {
  const sPlayer = players.find(p => p.id === rally.s_player_id);
  const rPlayer = players.find(p => p.id === rally.r_player_id);
  const setterPlayer = players.find(p => p.id === rally.setter_player_id);
  const aPlayer = players.find(p => p.id === rally.a_player_id);
  const b1Player = players.find(p => p.id === rally.b1_player_id);
  const b2Player = players.find(p => p.id === rally.b2_player_id);
  const b3Player = players.find(p => p.id === rally.b3_player_id);
  const dPlayer = players.find(p => p.id === rally.d_player_id);

  const hasIssue = rally.reason === 'KILL' && !rally.a_player_id;
  const serveSideName = rally.serve_side === 'CASA' ? homeName : awayName;
  const recvSideName = rally.recv_side === 'CASA' ? homeName : awayName;
  const attackSide = rally.phase % 2 === 1 ? rally.recv_side : rally.serve_side;
  const attackSideName = attackSide === 'CASA' ? homeName : awayName;
  const defSideName = attackSide === 'CASA' ? awayName : homeName;

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${hasIssue ? 'border-destructive bg-destructive/5' : 'bg-card'}`}>
      {/* Phase Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            Fase {rally.phase}
          </Badge>
          {hasIssue && (
            <Badge variant="destructive" className="text-xs gap-1">
              <AlertTriangle className="h-3 w-3" />
              Atacante em falta
            </Badge>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(rally)}>
          <Pencil className="h-3 w-3" />
        </Button>
      </div>

      {/* Actions Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {/* Serve */}
        {(rally.s_player_id || rally.s_code !== null) && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground w-14">Serviço</span>
            <Badge variant="secondary" className="text-[10px]">{serveSideName.slice(0, 3)}</Badge>
            {sPlayer && <span className="font-mono">#{sPlayer.jersey_number}</span>}
            {rally.s_code !== null && (
              <Badge className={`text-[10px] px-1 ${getCodeColor(rally.s_code)}`}>{rally.s_code}</Badge>
            )}
          </div>
        )}

        {/* Reception */}
        {(rally.r_player_id || rally.r_code !== null) && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground w-14">Receção</span>
            <Badge variant="secondary" className="text-[10px]">{recvSideName.slice(0, 3)}</Badge>
            {rPlayer && <span className="font-mono">#{rPlayer.jersey_number}</span>}
            {rally.r_code !== null && (
              <Badge className={`text-[10px] px-1 ${getCodeColor(rally.r_code)}`}>{rally.r_code}</Badge>
            )}
          </div>
        )}

        {/* Setter */}
        {(rally.setter_player_id || rally.pass_destination) && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground w-14">Passe</span>
            {setterPlayer && <span className="font-mono">#{setterPlayer.jersey_number}</span>}
            {rally.pass_destination && (
              <Badge variant="outline" className="text-[10px]">{rally.pass_destination}</Badge>
            )}
            {rally.pass_code !== null && (
              <Badge className={`text-[10px] px-1 ${getCodeColor(rally.pass_code)}`}>{rally.pass_code}</Badge>
            )}
          </div>
        )}

        {/* Attack */}
        {(rally.a_player_id || rally.a_code !== null) && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground w-14">Ataque</span>
            <Badge variant="secondary" className="text-[10px]">{attackSideName.slice(0, 3)}</Badge>
            {aPlayer && <span className="font-mono">#{aPlayer.jersey_number}</span>}
            {rally.a_code !== null && (
              <Badge className={`text-[10px] px-1 ${getCodeColor(rally.a_code)}`}>{rally.a_code}</Badge>
            )}
            {rally.kill_type && (
              <Badge variant="outline" className="text-[10px]">
                {rally.kill_type === 'BLOCKOUT' ? 'B.Out' : 'Chão'}
              </Badge>
            )}
          </div>
        )}

        {/* Block */}
        {(rally.b1_player_id || rally.b_code !== null) && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground w-14">Bloco</span>
            <Badge variant="secondary" className="text-[10px]">{defSideName.slice(0, 3)}</Badge>
            {b1Player && <span className="font-mono">#{b1Player.jersey_number}</span>}
            {b2Player && <span className="font-mono">#{b2Player.jersey_number}</span>}
            {b3Player && <span className="font-mono">#{b3Player.jersey_number}</span>}
            {rally.b_code !== null && (
              <Badge className={`text-[10px] px-1 ${getCodeColor(rally.b_code)}`}>{rally.b_code}</Badge>
            )}
          </div>
        )}

        {/* Defense */}
        {(rally.d_player_id || rally.d_code !== null) && (
          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground w-14">Defesa</span>
            <Badge variant="secondary" className="text-[10px]">{defSideName.slice(0, 3)}</Badge>
            {dPlayer && <span className="font-mono">#{dPlayer.jersey_number}</span>}
            {rally.d_code !== null && (
              <Badge className={`text-[10px] px-1 ${getCodeColor(rally.d_code)}`}>{rally.d_code}</Badge>
            )}
          </div>
        )}
      </div>

      {/* Outcome */}
      {rally.point_won_by && (
        <div className="flex items-center gap-2 pt-1 border-t">
          <span className="text-xs text-muted-foreground">Resultado:</span>
          <Badge 
            className={rally.point_won_by === 'CASA' ? 'bg-home text-home-foreground' : 'bg-away text-away-foreground'}
          >
            {rally.point_won_by === 'CASA' ? homeName : awayName}
          </Badge>
          {rally.reason && (
            <Badge variant="outline">{rally.reason}</Badge>
          )}
        </div>
      )}

      {/* Rotations */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground pt-1">
        <span>{serveSideName.slice(0, 3)} R{rally.serve_rot}</span>
        <span>{recvSideName.slice(0, 3)} R{rally.recv_rot}</span>
      </div>
    </div>
  );
}

interface RallyGroupProps {
  rallyNo: number;
  phases: Rally[];
  players: (Player | MatchPlayer)[];
  homeName: string;
  awayName: string;
  onEdit: (rally: Rally) => void;
  defaultOpen?: boolean;
}

function RallyGroup({ rallyNo, phases, players, homeName, awayName, onEdit, defaultOpen = false }: RallyGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const sortedPhases = [...phases].sort((a, b) => a.phase - b.phase);
  const finalPhase = sortedPhases[sortedPhases.length - 1];
  const hasIssue = phases.some(p => p.reason === 'KILL' && !p.a_player_id);
  
  const winnerName = finalPhase?.point_won_by === 'CASA' ? homeName : awayName;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className={`flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${hasIssue ? 'bg-destructive/10 border border-destructive/30' : 'bg-muted/30'}`}>
          <div className="flex items-center gap-3">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            <span className="font-mono font-medium">Rally #{rallyNo}</span>
            <Badge variant="outline" className="text-xs">
              {phases.length} fase{phases.length > 1 ? 's' : ''}
            </Badge>
            {hasIssue && (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3 w-3" />
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {finalPhase?.point_won_by && (
              <Badge className={finalPhase.point_won_by === 'CASA' ? 'bg-home text-home-foreground' : 'bg-away text-away-foreground'}>
                +{winnerName.slice(0, 3)} {finalPhase.reason}
              </Badge>
            )}
          </div>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 pr-2 py-2 space-y-2">
          {sortedPhases.map((phase) => (
            <RallyPhaseCard
              key={phase.id}
              rally={phase}
              players={players}
              homeName={homeName}
              awayName={awayName}
              onEdit={onEdit}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function RallyHistory() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { match, rallies, loading, loadMatch, getEffectivePlayers, updateRally, getRalliesForSet } = useMatch(matchId || null);
  const players = getEffectivePlayers();
  const [selectedSet, setSelectedSet] = useState(0);
  const [showOnlyIssues, setShowOnlyIssues] = useState(false);
  const [editingRally, setEditingRally] = useState<Rally | null>(null);

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId, loadMatch]);

  if (loading || !match) {
    return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;
  }

  const filteredRallies = selectedSet === 0 ? rallies : getRalliesForSet(selectedSet);

  // Group rallies by set and rally number
  const rallyGroups = new Map<string, Rally[]>();
  filteredRallies.forEach(r => {
    const key = `${r.set_no}-${r.rally_no}`;
    if (!rallyGroups.has(key)) {
      rallyGroups.set(key, []);
    }
    rallyGroups.get(key)!.push(r);
  });

  // Group by set for display
  const setGroups = new Map<number, { rallyNo: number; phases: Rally[] }[]>();
  rallyGroups.forEach((phases, key) => {
    const setNo = phases[0].set_no;
    const rallyNo = phases[0].rally_no;
    
    // Filter by issues if needed
    if (showOnlyIssues) {
      const hasIssue = phases.some(p => p.reason === 'KILL' && !p.a_player_id);
      if (!hasIssue) return;
    }
    
    if (!setGroups.has(setNo)) {
      setGroups.set(setNo, []);
    }
    setGroups.get(setNo)!.push({ rallyNo, phases });
  });

  // Sort each set's rallies by rally number (descending - newest first)
  setGroups.forEach((rallies, setNo) => {
    rallies.sort((a, b) => b.rallyNo - a.rallyNo);
  });

  const issueCount = Array.from(rallyGroups.values()).filter(phases => 
    phases.some(p => p.reason === 'KILL' && !p.a_player_id)
  ).length;

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/stats/${matchId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">Histórico de Rallies</h1>
            <p className="text-xs text-muted-foreground">{match.title}</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedSet === 0 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedSet(0)}
          >
            Todos
          </Button>
          {[1, 2, 3, 4, 5].map((set) => (
            <Button
              key={set}
              variant={selectedSet === set ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSet(set)}
            >
              Set {set}
            </Button>
          ))}
        </div>

        {/* Issues Filter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch
              id="issues-filter"
              checked={showOnlyIssues}
              onCheckedChange={setShowOnlyIssues}
            />
            <Label htmlFor="issues-filter" className="text-sm cursor-pointer flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Mostrar apenas com problemas
            </Label>
          </div>
          {issueCount > 0 && (
            <Badge variant="destructive">{issueCount} com problemas</Badge>
          )}
        </div>

        {/* Rally Groups by Set */}
        <div className="space-y-6">
          {Array.from(setGroups.entries())
            .sort(([a], [b]) => a - b)
            .map(([setNo, rallyList]) => (
              <Card key={setNo}>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Badge variant="outline">Set {setNo}</Badge>
                    <span className="text-muted-foreground font-normal">
                      {rallyList.length} rally{rallyList.length > 1 ? 's' : ''}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-0 pb-3 space-y-1">
                  {rallyList.map(({ rallyNo, phases }) => (
                    <RallyGroup
                      key={`${setNo}-${rallyNo}`}
                      rallyNo={rallyNo}
                      phases={phases}
                      players={players}
                      homeName={match.home_name}
                      awayName={match.away_name}
                      onEdit={setEditingRally}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}

          {setGroups.size === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {showOnlyIssues ? 'Nenhum rally com problemas encontrado.' : 'Nenhum rally registado.'}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <EditRallyModal
        open={!!editingRally}
        onOpenChange={(open) => !open && setEditingRally(null)}
        rally={editingRally}
        players={players}
        onSave={updateRally}
        homeName={match.home_name}
        awayName={match.away_name}
      />
    </div>
  );
}
