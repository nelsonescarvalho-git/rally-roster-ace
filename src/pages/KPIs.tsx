import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Target, Award } from 'lucide-react';

export default function KPIs() {
  return (
    <MainLayout title="KPIs">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Estatísticas globais agregadas de todos os jogos.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Target className="mb-1 h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">—</span>
              <span className="text-xs text-muted-foreground">% Ataque</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <TrendingUp className="mb-1 h-5 w-5 text-success" />
              <span className="text-2xl font-bold">—</span>
              <span className="text-xs text-muted-foreground">% Side-Out</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <Award className="mb-1 h-5 w-5 text-warning" />
              <span className="text-2xl font-bold">—</span>
              <span className="text-xs text-muted-foreground">Aces/Jogo</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col items-center py-4">
              <BarChart3 className="mb-1 h-5 w-5 text-away" />
              <span className="text-2xl font-bold">—</span>
              <span className="text-xs text-muted-foreground">Blocos/Jogo</span>
            </CardContent>
          </Card>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <BarChart3 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Em breve</h3>
            <p className="text-sm text-muted-foreground">
              Os KPIs globais serão calculados a partir dos dados de todos os jogos registados.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
