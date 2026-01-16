import { MainLayout } from '@/components/layout/MainLayout';
import { useMatches } from '@/hooks/useMatches';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trophy, Users, BarChart3, Play, Plus, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { matches, loading } = useMatches();
  
  const lastMatch = matches[0];
  const totalMatches = matches.length;

  return (
    <MainLayout title="VolleyStats">
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/jogos">
            <Card className="cursor-pointer transition-all hover:shadow-md">
              <CardContent className="flex flex-col items-center justify-center py-6">
                <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium">Novo Jogo</span>
              </CardContent>
            </Card>
          </Link>
          
          {lastMatch && (
            <Link to={`/live/${lastMatch.id}`}>
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardContent className="flex flex-col items-center justify-center py-6">
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                    <Play className="h-6 w-6 text-success" />
                  </div>
                  <span className="text-sm font-medium">Continuar</span>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Trophy className="mb-1 h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{totalMatches}</span>
              <span className="text-xs text-muted-foreground">Jogos</span>
            </CardContent>
          </Card>
          <Link to="/equipas">
            <Card className="cursor-pointer transition-all hover:shadow-md">
              <CardContent className="flex flex-col items-center py-4">
                <Users className="mb-1 h-5 w-5 text-accent" />
                <span className="text-2xl font-bold">—</span>
                <span className="text-xs text-muted-foreground">Equipas</span>
              </CardContent>
            </Card>
          </Link>
          <Link to="/kpis">
            <Card className="cursor-pointer transition-all hover:shadow-md">
              <CardContent className="flex flex-col items-center py-4">
                <BarChart3 className="mb-1 h-5 w-5 text-warning" />
                <span className="text-2xl font-bold">—</span>
                <span className="text-xs text-muted-foreground">KPIs</span>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Last Match */}
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="animate-pulse text-muted-foreground">A carregar...</div>
            </CardContent>
          </Card>
        ) : lastMatch ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                Último Jogo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <h3 className="font-medium">{lastMatch.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(lastMatch.match_date), "d 'de' MMMM", { locale: pt })}
                </p>
              </div>
              <div className="mb-4 flex items-center justify-center gap-4 text-center">
                <div className="flex-1">
                  <div className="text-sm font-medium text-home">{lastMatch.home_name}</div>
                </div>
                <div className="text-xs text-muted-foreground">vs</div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-away">{lastMatch.away_name}</div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <Link to={`/stats/${lastMatch.id}`}>Estatísticas</Link>
                </Button>
                <Button
                  size="sm"
                  className="flex-1 gap-1"
                  asChild
                >
                  <Link to={`/live/${lastMatch.id}`}>
                    <Play className="h-3 w-3" />
                    Continuar
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Trophy className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Bem-vindo ao VolleyStats!</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Comece por criar o seu primeiro jogo ou adicionar equipas.
              </p>
              <Button asChild>
                <Link to="/jogos" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Criar Jogo
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
