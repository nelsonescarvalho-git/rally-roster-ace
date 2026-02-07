import { useMemo } from 'react';
import { differenceInYears, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Ruler, Calendar } from 'lucide-react';
import { TeamPlayer } from '@/types/volleyball';

interface SquadStatsCardProps {
  players: TeamPlayer[];
}

const POSITION_ORDER = ['OH', 'OP', 'MB', 'S', 'L', 'Sem posição'];

export function SquadStatsCard({ players }: SquadStatsCardProps) {
  const squadStats = useMemo(() => {
    if (players.length === 0) {
      return { avgHeight: null, heightCount: 0, avgAge: null, ageCount: 0, positionCounts: {}, totalPlayers: 0 };
    }

    const playersWithHeight = players.filter(p => p.height_cm);
    const avgHeight = playersWithHeight.length > 0
      ? Math.round(playersWithHeight.reduce((sum, p) => sum + p.height_cm!, 0) / playersWithHeight.length)
      : null;

    const today = new Date();
    const playersWithAge = players.filter(p => p.birth_date).map(p => ({
      ...p,
      age: differenceInYears(today, parseISO(p.birth_date!))
    }));
    const avgAge = playersWithAge.length > 0
      ? (playersWithAge.reduce((sum, p) => sum + p.age, 0) / playersWithAge.length).toFixed(1)
      : null;

    const positionCounts: Record<string, number> = {};
    players.forEach(p => {
      const pos = p.position || 'Sem posição';
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    });

    return {
      avgHeight,
      heightCount: playersWithHeight.length,
      avgAge,
      ageCount: playersWithAge.length,
      positionCounts,
      totalPlayers: players.length
    };
  }, [players]);

  if (players.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Estatísticas do Plantel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Altura Média */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Ruler className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">
              {squadStats.avgHeight ? `${squadStats.avgHeight}` : '-'}
            </div>
            <div className="text-xs text-muted-foreground">cm (altura média)</div>
            <div className="text-xs text-muted-foreground mt-1">
              {squadStats.heightCount}/{squadStats.totalPlayers} com altura
            </div>
          </div>

          {/* Idade Média */}
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Calendar className="h-5 w-5 mx-auto mb-1 text-muted-foreground" />
            <div className="text-2xl font-bold">
              {squadStats.avgAge || '-'}
            </div>
            <div className="text-xs text-muted-foreground">anos (idade média)</div>
            <div className="text-xs text-muted-foreground mt-1">
              {squadStats.ageCount}/{squadStats.totalPlayers} com nascimento
            </div>
          </div>

          {/* Distribuição por Posição */}
          <div className="col-span-2 md:col-span-1 p-3 bg-muted/50 rounded-lg">
            <div className="text-sm font-medium mb-2">Por Posição</div>
            {Object.entries(squadStats.positionCounts)
              .sort(([a], [b]) => POSITION_ORDER.indexOf(a) - POSITION_ORDER.indexOf(b))
              .map(([pos, count]) => (
                <div key={pos} className="flex items-center gap-2 mb-1">
                  <span className="w-16 text-xs font-mono">{pos}</span>
                  <Progress 
                    value={(count / squadStats.totalPlayers) * 100} 
                    className="h-2 flex-1" 
                  />
                  <span className="w-4 text-xs text-right">{count}</span>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
