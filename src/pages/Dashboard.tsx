import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Users, 
  BarChart3, 
  Play, 
  Plus, 
  Calendar,
  Sun,
  Moon,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { VolleyballBackground } from '@/components/ui/VolleyballBackground';
import { BottomNav } from '@/components/layout/BottomNav';
import { useTeamColors } from '@/hooks/useTeamColors';
import { cn } from '@/lib/utils';

// KPI Chip component
function KPIChip({ icon: Icon, value, label }: { icon: any; value: number | string; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 backdrop-blur-sm border border-border/50 transition-all duration-200 hover:bg-muted/70">
      <Icon className="h-4 w-4 text-primary" />
      <span className="font-semibold text-sm">{value}</span>
      <span className="text-xs text-muted-foreground hidden sm:inline">{label}</span>
    </div>
  );
}

// Action Card component
function ActionCard({ 
  icon: Icon, 
  title, 
  subtitle, 
  gradientClass, 
  href, 
  disabled = false 
}: { 
  icon: any; 
  title: string; 
  subtitle: string; 
  gradientClass: string; 
  href: string; 
  disabled?: boolean;
}) {
  const content = (
    <Card className={cn(
      "group relative overflow-hidden rounded-2xl border-0 transition-all duration-200",
      "hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]",
      disabled && "opacity-50 pointer-events-none"
    )}>
      <div className={cn("absolute inset-0", gradientClass)} />
      <CardContent className="relative z-10 p-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-xl bg-background/20 backdrop-blur-sm flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <Icon className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-primary-foreground">{title}</h3>
            <p className="text-sm text-primary-foreground/70">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (disabled) return content;
  
  return <Link to={href}>{content}</Link>;
}

// Scoreboard Card component
function ScoreboardCard({ 
  match, 
  scores, 
  homeSetsWon, 
  awaySetsWon 
}: { 
  match: any; 
  scores: any[]; 
  homeSetsWon: number; 
  awaySetsWon: number;
}) {
  if (!match) {
    return (
      <Card className="overflow-hidden rounded-2xl border-0 shadow-xl bg-card/80 backdrop-blur-md h-full">
        <CardContent className="flex flex-col items-center justify-center h-full py-12 text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Trophy className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mb-2 text-xl font-semibold">Bem-vindo ao VolleyStats!</h3>
          <p className="mb-6 text-sm text-muted-foreground max-w-xs">
            Comece por criar o seu primeiro jogo para acompanhar estatísticas em tempo real.
          </p>
          <Button asChild className="rounded-xl">
            <Link to="/jogos" className="gap-2">
              <Plus className="h-4 w-4" />
              Criar Primeiro Jogo
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden rounded-2xl border-0 shadow-xl bg-card/80 backdrop-blur-md">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-primary to-primary/80 p-4">
        <div className="flex items-center gap-2 text-primary-foreground/80">
          <Calendar className="h-4 w-4" />
          <span className="text-sm font-medium">Último Jogo</span>
        </div>
        <h3 className="mt-1 text-lg font-bold text-primary-foreground">{match.title || 'Partida'}</h3>
        <p className="text-sm text-primary-foreground/70">
          {format(new Date(match.match_date), "d 'de' MMMM, yyyy", { locale: pt })}
        </p>
      </div>
      
      {/* Scoreboard content */}
      <CardContent className="p-6">
        {/* Teams and Score */}
        <div className="flex items-center justify-between">
          {/* Home Team */}
          <div className="text-center flex-1">
            <div className="text-xl lg:text-2xl font-black text-home">{match.home_name}</div>
            <Badge variant="outline" className="mt-2 bg-home/10 border-home/30 text-home">
              Casa
            </Badge>
          </div>
          
          {/* Score Central */}
          <div className="px-4 lg:px-8 text-center">
            <div className="text-4xl lg:text-5xl font-black tracking-tight">
              <span className="text-home">{homeSetsWon}</span>
              <span className="text-muted-foreground mx-2">-</span>
              <span className="text-away">{awaySetsWon}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground uppercase tracking-wider">Sets</p>
          </div>
          
          {/* Away Team */}
          <div className="text-center flex-1">
            <div className="text-xl lg:text-2xl font-black text-away">{match.away_name}</div>
            <Badge variant="outline" className="mt-2 bg-away/10 border-away/30 text-away">
              Fora
            </Badge>
          </div>
        </div>
        
        {/* Sets Detail */}
        <div className="mt-6 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map(setNo => {
            const setScore = scores?.find(s => s.set_no === setNo);
            const hasData = setScore && (setScore.home_score > 0 || setScore.away_score > 0);
            return (
              <div key={setNo} className={cn(
                "rounded-xl p-3 text-center border transition-all duration-200",
                hasData ? "bg-muted/50 border-border" : "bg-muted/20 border-border/30 opacity-40"
              )}>
                <div className="text-xs text-muted-foreground mb-1">Set {setNo}</div>
                <div className="font-bold text-sm">
                  {hasData ? (
                    <>
                      <span className="text-home">{setScore.home_score}</span>
                      <span className="text-muted-foreground mx-1">-</span>
                      <span className="text-away">{setScore.away_score}</span>
                    </>
                  ) : '-'}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <Button variant="outline" className="flex-1 rounded-xl" asChild>
            <Link to={`/stats/${match.id}`}>
              <BarChart3 className="h-4 w-4 mr-2" />
              Estatísticas
            </Link>
          </Button>
          <Button className="flex-1 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" asChild>
            <Link to={`/live/${match.id}`}>
              <Play className="h-4 w-4 mr-2" />
              Continuar
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const { 
    totalMatches, 
    teamsCount, 
    totalRallies, 
    lastMatch, 
    lastMatchScores,
    homeSetsWon,
    awaySetsWon,
    teamColors,
    loading 
  } = useDashboardStats();

  // Apply dynamic team colors
  useTeamColors({
    homeColors: teamColors?.homePrimary ? {
      primary: teamColors.homePrimary,
      secondary: teamColors.homeSecondary || undefined,
    } : undefined,
    awayColors: teamColors?.awayPrimary ? {
      primary: teamColors.awayPrimary,
      secondary: teamColors.awaySecondary || undefined,
    } : undefined,
  });

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div className="min-h-screen relative">
      <VolleyballBackground />
      
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                <span className="text-xl">🏐</span>
              </div>
              <span className="text-xl font-bold hidden sm:inline">VolleyStats</span>
            </div>
            
            {/* KPI Chips */}
            <div className="flex items-center gap-2">
              <KPIChip icon={Trophy} value={totalMatches} label="Jogos" />
              <KPIChip icon={Users} value={teamsCount} label="Equipas" />
              <KPIChip icon={Activity} value={totalRallies} label="Rallies" />
            </div>
            
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleTheme}
              className="rounded-xl transition-all duration-200 hover:bg-muted"
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-24">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-pulse text-muted-foreground">A carregar...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column - Actions */}
            <div className="lg:col-span-4 space-y-4">
              <ActionCard 
                icon={Plus}
                title="Novo Jogo"
                subtitle="Criar nova partida"
                gradientClass="bg-gradient-to-br from-success to-success/80"
                href="/jogos"
              />
              <ActionCard 
                icon={Play}
                title="Continuar"
                subtitle="Retomar último jogo"
                gradientClass="bg-gradient-to-br from-warning to-warning/80"
                href={lastMatch ? `/live/${lastMatch.id}` : '/jogos'}
                disabled={!lastMatch}
              />
            </div>
            
            {/* Right Column - Last Match Scoreboard */}
            <div className="lg:col-span-8">
              <ScoreboardCard 
                match={lastMatch} 
                scores={lastMatchScores}
                homeSetsWon={homeSetsWon}
                awaySetsWon={awaySetsWon}
              />
            </div>
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
