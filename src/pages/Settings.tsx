import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Info, Trash2 } from 'lucide-react';

export default function Settings() {
  return (
    <MainLayout title="Definições">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              Exportar Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Exporte todos os dados dos jogos para análise externa.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                Exportar CSV
              </Button>
              <Button variant="outline" size="sm" disabled>
                Exportar JSON
              </Button>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Em breve
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Info className="h-4 w-4" />
              Sobre a App
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Versão</span>
                <span>1.0.0</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Desenvolvido por</span>
                <span>VolleyStats Team</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <Trash2 className="h-4 w-4" />
              Zona de Perigo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ações irreversíveis que afetam todos os dados.
            </p>
            <Button variant="destructive" size="sm" disabled>
              Limpar Todos os Dados
            </Button>
            <p className="text-xs text-muted-foreground italic">
              Funcionalidade desativada por segurança
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
