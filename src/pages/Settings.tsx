import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Download, Info, Trash2, BookOpen, Loader2, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  const { toast } = useToast();
  const [isPurging, setIsPurging] = useState(false);

  const handlePurgeDeleted = async () => {
    setIsPurging(true);
    try {
      const { error } = await supabase.rpc('purge_deleted');
      
      if (error) {
        toast({
          title: 'Erro ao purgar dados',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Purge concluído',
          description: 'Dados eliminados há mais de 15 dias foram permanentemente removidos.'
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <MainLayout title="Definições">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4" />
              Documentação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Consulte o guia completo do sistema de lançamento, códigos e lógicas de jogo.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link to="/guia">
                <BookOpen className="h-4 w-4 mr-2" />
                Abrir Guia do Sistema
              </Link>
            </Button>
          </CardContent>
        </Card>

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
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ações irreversíveis que afetam todos os dados.
              </p>
              <Button variant="destructive" size="sm" disabled>
                Limpar Todos os Dados
              </Button>
              <p className="text-xs text-muted-foreground italic">
                Funcionalidade desativada por segurança
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-warning mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Purge de Dados Eliminados</p>
                  <p className="text-xs text-muted-foreground">
                    Remove permanentemente jogos e dados marcados como eliminados há mais de 15 dias.
                  </p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                    disabled={isPurging}
                  >
                    {isPurging ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        A purgar...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Executar Purge
                      </>
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Executar Purge?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação irá remover permanentemente todos os jogos, rallies, lineups e substituições 
                      que foram eliminados há mais de 15 dias. Esta ação não pode ser revertida.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handlePurgeDeleted}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Executar Purge
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
