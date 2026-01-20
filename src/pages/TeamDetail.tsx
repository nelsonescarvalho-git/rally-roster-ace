import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTeams } from '@/hooks/useTeams';
import { TeamPlayer } from '@/types/volleyball';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Pencil, UserMinus, Check, X, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

const POSITIONS = [
  { value: 'OH', label: 'Ponta (OH)' },
  { value: 'OP', label: 'Oposto (OP)' },
  { value: 'MB', label: 'Central (MB)' },
  { value: 'S', label: 'Levantador (S)' },
  { value: 'L', label: 'Líbero (L)' },
];

const DEFAULT_COLORS = {
  primary: '#3B82F6',
  secondary: '#1E40AF',
};

export default function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const { teams, getTeamPlayers, addTeamPlayer, updateTeamPlayer, deactivateTeamPlayer, updateTeam } = useTeams();
  const [players, setPlayers] = useState<TeamPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Team color state
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS.primary);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_COLORS.secondary);
  const [colorsSaving, setColorsSaving] = useState(false);
  
  // Add form state
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState<string>('');
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState<string>('');

  const team = teams.find(t => t.id === teamId);

  // Load team colors when team changes
  useEffect(() => {
    if (team) {
      setPrimaryColor(team.primary_color || DEFAULT_COLORS.primary);
      setSecondaryColor(team.secondary_color || DEFAULT_COLORS.secondary);
    }
  }, [team]);

  const loadPlayers = async () => {
    if (!teamId) return;
    setLoading(true);
    const data = await getTeamPlayers(teamId);
    setPlayers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPlayers();
  }, [teamId]);

  const handleSaveColors = async () => {
    if (!teamId) return;
    setColorsSaving(true);
    await updateTeam(teamId, {
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    });
    setColorsSaving(false);
  };

  const handleAdd = async () => {
    if (!teamId || !newNumber || !newName.trim()) return;
    const result = await addTeamPlayer(
      teamId,
      parseInt(newNumber),
      newName.trim(),
      newPosition || null
    );
    if (result) {
      setAddOpen(false);
      setNewNumber('');
      setNewName('');
      setNewPosition('');
      loadPlayers();
    }
  };

  const startEdit = (player: TeamPlayer) => {
    setEditingId(player.id);
    setEditName(player.name);
    setEditPosition(player.position || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPosition('');
  };

  const saveEdit = async (playerId: string) => {
    const success = await updateTeamPlayer(playerId, {
      name: editName.trim(),
      position: editPosition || null,
    });
    if (success) {
      cancelEdit();
      loadPlayers();
    }
  };

  const handleDeactivate = async (playerId: string) => {
    const success = await deactivateTeamPlayer(playerId);
    if (success) {
      loadPlayers();
    }
  };

  if (!team) {
    return (
      <MainLayout title="Equipa">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Equipa não encontrada</p>
          <Button asChild className="mt-4">
            <Link to="/equipas">Voltar</Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={team.name}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/equipas" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Jogador
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Jogador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="number">Número</Label>
                  <Input
                    id="number"
                    type="number"
                    value={newNumber}
                    onChange={(e) => setNewNumber(e.target.value)}
                    placeholder="Ex: 7"
                    min="0"
                    max="99"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome do jogador"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Posição (opcional)</Label>
                  <Select value={newPosition} onValueChange={setNewPosition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar posição" />
                    </SelectTrigger>
                    <SelectContent>
                      {POSITIONS.map((pos) => (
                        <SelectItem key={pos.value} value={pos.value}>
                          {pos.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleAdd} 
                  className="w-full" 
                  disabled={!newNumber || !newName.trim()}
                >
                  Adicionar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Team Colors Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Cores da Equipa
            </CardTitle>
            <CardDescription className="text-xs">
              Personalize as cores para identificar esta equipa nos jogos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Primary Color */}
              <div className="space-y-2">
                <Label htmlFor="primary-color" className="text-xs">Cor Primária</Label>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-10 w-10 rounded-lg border-2 border-border shadow-sm cursor-pointer overflow-hidden"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <input
                      type="color"
                      id="primary-color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3B82F6"
                    className="font-mono text-xs h-10"
                  />
                </div>
              </div>
              
              {/* Secondary Color */}
              <div className="space-y-2">
                <Label htmlFor="secondary-color" className="text-xs">Cor Secundária</Label>
                <div className="flex items-center gap-2">
                  <div 
                    className="h-10 w-10 rounded-lg border-2 border-border shadow-sm cursor-pointer overflow-hidden"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <input
                      type="color"
                      id="secondary-color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#1E40AF"
                    className="font-mono text-xs h-10"
                  />
                </div>
              </div>
            </div>

            {/* Color Preview */}
            <div className="p-3 rounded-lg border bg-muted/30">
              <div className="text-xs text-muted-foreground mb-2">Pré-visualização</div>
              <div className="flex items-center gap-3">
                <div 
                  className="h-12 w-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-md"
                  style={{ 
                    backgroundColor: primaryColor, 
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                  }}
                >
                  #7
                </div>
                <div className="flex-1">
                  <div 
                    className="h-2 rounded-full mb-1"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <div 
                    className="h-2 rounded-full w-2/3"
                    style={{ backgroundColor: secondaryColor }}
                  />
                </div>
                <div 
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ 
                    backgroundColor: primaryColor, 
                    color: '#fff',
                  }}
                >
                  {team.name}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <Button 
              onClick={handleSaveColors} 
              disabled={colorsSaving}
              className="w-full"
              size="sm"
            >
              {colorsSaving ? 'A guardar...' : 'Guardar Cores'}
            </Button>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-pulse text-muted-foreground">A carregar...</div>
          </div>
        ) : players.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <h3 className="mb-2 text-lg font-semibold">Plantel vazio</h3>
              <p className="mb-4 text-sm text-muted-foreground">
                Adicione jogadores a esta equipa.
              </p>
              <Button onClick={() => setAddOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Jogador
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Plantel ({players.length} jogadores)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">#</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="w-20">Pos.</TableHead>
                    <TableHead className="w-24 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="text-center font-mono font-bold">
                        {player.jersey_number}
                      </TableCell>
                      <TableCell>
                        {editingId === player.id ? (
                          <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-8"
                          />
                        ) : (
                          player.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === player.id ? (
                          <Select value={editPosition} onValueChange={setEditPosition}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="-" />
                            </SelectTrigger>
                            <SelectContent>
                              {POSITIONS.map((pos) => (
                                <SelectItem key={pos.value} value={pos.value}>
                                  {pos.value}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-muted-foreground">
                            {player.position || '-'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {editingId === player.id ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => saveEdit(player.id)}
                            >
                              <Check className="h-4 w-4 text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={cancelEdit}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEdit(player)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeactivate(player.id)}
                            >
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
