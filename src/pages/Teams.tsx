import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTeams } from '@/hooks/useTeams';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Users, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Teams() {
  const { teams, loading, createTeam } = useTeams();
  const [open, setOpen] = useState(false);
  const [teamName, setTeamName] = useState('');

  const handleCreate = async () => {
    if (!teamName.trim()) return;
    const result = await createTeam(teamName.trim());
    if (result) {
      setOpen(false);
      setTeamName('');
    }
  };

  return (
    <MainLayout title="Equipas">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {teams.length} {teams.length === 1 ? 'equipa' : 'equipas'}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Equipa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Nova Equipa</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="teamName">Nome da Equipa</Label>
                <Input
                  id="teamName"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ex: Amares SC"
                />
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!teamName.trim()}>
                Criar Equipa
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
          {teams.map((team) => (
            <Link key={team.id} to={`/equipas/${team.id}`}>
              <Card className="cursor-pointer transition-all hover:shadow-md">
                <CardContent className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{team.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        Clique para gerir plantel
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
