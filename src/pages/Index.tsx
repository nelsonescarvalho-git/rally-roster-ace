import { useState } from 'react';
import { useMatches } from '@/hooks/useMatches';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Plus, Play, Trash2, Calendar, Users } from 'lucide-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Side } from '@/types/volleyball';

const Index = () => {
  const { matches, loading, createMatch, deleteMatch } = useMatches();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [homeName, setHomeName] = useState('CASA');
  const [awayName, setAwayName] = useState('FORA');
  const [firstServe, setFirstServe] = useState<Side>('CASA');

  const handleCreate = async () => {
    if (!title.trim()) return;
    const result = await createMatch({
      title: title.trim(),
      home_name: homeName.trim() || 'CASA',
      away_name: awayName.trim() || 'FORA',
      first_serve_side: firstServe,
    });
    if (result) {
      setOpen(false);
      setTitle('');
      setHomeName('CASA');
      setAwayName('FORA');
      window.location.href = `/setup/${result.id}`;
    }
  };

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">🏐</span>
            </div>
            <h1 className="text-xl font-bold">VolleyStats</h1>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Jogo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Jogo</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Jogo</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Final Campeonato"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="home">Equipa Casa</Label>
                    <Input
                      id="home"
                      value={homeName}
                      onChange={(e) => setHomeName(e.target.value)}
                      placeholder="CASA"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="away">Equipa Fora</Label>
                    <Input
                      id="away"
                      value={awayName}
                      onChange={(e) => setAwayName(e.target.value)}
                      placeholder="FORA"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Primeiro Serviço</Label>
                  <Select value={firstServe} onValueChange={(v) => setFirstServe(v as Side)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASA">{homeName || 'CASA'}</SelectItem>
                      <SelectItem value="FORA">{awayName || 'FORA'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full" disabled={!title.trim()}>
                  Criar e Configurar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container py-4">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-pulse text-muted-foreground">A carregar...</div>
          </div>
        ) : matches.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-lg font-semibold">Sem jogos</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Crie o seu primeiro jogo para começar a registar estatísticas.
              </p>
              <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Jogo
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {matches.map((match) => (
              <Card key={match.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{match.title}</CardTitle>
                      <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(match.match_date), "d 'de' MMMM", { locale: pt })}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="mb-3 flex items-center justify-center gap-4 text-center">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-home">{match.home_name}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">vs</div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-away">{match.away_name}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.location.href = `/setup/${match.id}`}
                    >
                      Configurar
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => window.location.href = `/live/${match.id}`}
                    >
                      <Play className="h-3 w-3" />
                      Live
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar Jogo?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta ação não pode ser revertida. Todos os dados do jogo "{match.title}" serão permanentemente eliminados, incluindo jogadores, lineups e rallies registados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteMatch(match.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
