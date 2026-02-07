import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTeams } from '@/hooks/useTeams';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CreateTeamDialog } from '@/components/CreateTeamDialog';
import { supabase } from '@/integrations/supabase/client';

export default function Teams() {
  const { teams, loading } = useTeams();
  const [open, setOpen] = useState(false);
  const [playerCounts, setPlayerCounts] = useState<Record<string, number>>({});

  // Load player counts for all teams
  useEffect(() => {
    const loadPlayerCounts = async () => {
      if (teams.length === 0) return;
      
      const { data, error } = await supabase
        .from('team_players')
        .select('team_id')
        .eq('active', true)
        .in('team_id', teams.map(t => t.id));
      
      if (!error && data) {
        const counts: Record<string, number> = {};
        data.forEach(player => {
          counts[player.team_id] = (counts[player.team_id] || 0) + 1;
        });
        setPlayerCounts(counts);
      }
    };
    
    loadPlayerCounts();
  }, [teams]);

  return (
    <MainLayout title="Equipas">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {teams.length} {teams.length === 1 ? 'equipa' : 'equipas'}
        </p>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Nova Equipa
        </Button>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="animate-pulse text-muted-foreground">A carregar...</div>
        </div>
      ) : teams.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Sem equipas</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Crie a sua primeira equipa para gerir os plantéis.
            </p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Equipa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teams.map((team) => {
            const count = playerCounts[team.id] || 0;
            return (
              <Link key={team.id} to={`/equipas/${team.id}`}>
                <Card className="cursor-pointer transition-all hover:shadow-md">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ 
                          backgroundColor: team.primary_color ? `${team.primary_color}20` : 'hsl(var(--primary) / 0.1)',
                        }}
                      >
                        <Users 
                          className="h-5 w-5" 
                          style={{ color: team.primary_color || 'hsl(var(--primary))' }}
                        />
                      </div>
                      <div>
                        <h3 className="font-medium">{team.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {count} {count === 1 ? 'jogador' : 'jogadores'}
                          {team.coach_name && ` · ${team.coach_name}`}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <CreateTeamDialog open={open} onOpenChange={setOpen} />
    </MainLayout>
  );
}
