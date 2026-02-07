import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { differenceInYears, parseISO } from 'date-fns';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Plus, Pencil, UserMinus, Check, X, Palette, Users2, Crown, BarChart3, Ruler, Calendar } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
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
  
  // Team state
  const [coachName, setCoachName] = useState('');
  const [assistantCoach, setAssistantCoach] = useState('');
  const [teamManager, setTeamManager] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS.primary);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_COLORS.secondary);
  const [teamSaving, setTeamSaving] = useState(false);
  
  // Add form state
  const [newNumber, setNewNumber] = useState('');
  const [newName, setNewName] = useState('');
  const [newPosition, setNewPosition] = useState<string>('');
  const [newIsCaptain, setNewIsCaptain] = useState(false);
  const [newHeightCm, setNewHeightCm] = useState('');
  const [newBirthDate, setNewBirthDate] = useState('');
  const [newFederationId, setNewFederationId] = useState('');
  
  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState<string>('');
  const [editIsCaptain, setEditIsCaptain] = useState(false);

  const team = teams.find(t => t.id === teamId);

  // Load team data when team changes
  useEffect(() => {
    if (team) {
      setCoachName(team.coach_name || '');
      setAssistantCoach(team.assistant_coach || '');
      setTeamManager(team.team_manager || '');
      setPrimaryColor(team.primary_color || DEFAULT_COLORS.primary);
      setSecondaryColor(team.secondary_color || DEFAULT_COLORS.secondary);
    }
  }, [team]);

  // Squad statistics calculation
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

  const handleSaveTeam = async () => {
    if (!teamId) return;
    setTeamSaving(true);
    await updateTeam(teamId, {
      coach_name: coachName.trim() || null,
      assistant_coach: assistantCoach.trim() || null,
      team_manager: teamManager.trim() || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    });
    setTeamSaving(false);
  };

  const resetAddForm = () => {
    setNewNumber('');
    setNewName('');
    setNewPosition('');
    setNewIsCaptain(false);
    setNewHeightCm('');
    setNewBirthDate('');
    setNewFederationId('');
  };

  const handleAdd = async () => {
    if (!teamId || !newNumber || !newName.trim()) return;
    const result = await addTeamPlayer(
      teamId,
      parseInt(newNumber),
      newName.trim(),
      newPosition || null,
      {
        height_cm: newHeightCm ? parseInt(newHeightCm) : null,
        birth_date: newBirthDate || null,
        federation_id: newFederationId.trim() || null,
        is_captain: newIsCaptain,
      }
    );
    if (result) {
      setAddOpen(false);
      resetAddForm();
      loadPlayers();
    }
  };

  const startEdit = (player: TeamPlayer) => {
    setEditingId(player.id);
    setEditName(player.name);
    setEditPosition(player.position || '');
    setEditIsCaptain(player.is_captain || false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPosition('');
    setEditIsCaptain(false);
  };

  const saveEdit = async (playerId: string) => {
    const success = await updateTeamPlayer(playerId, {
      name: editName.trim(),
      position: editPosition || null,
      is_captain: editIsCaptain,
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
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Adicionar Jogador</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="number">Número *</Label>
                    <Input
                      id="number"
                      type="number"
                      value={newNumber}
                      onChange={(e) => setNewNumber(e.target.value)}
                      placeholder="7"
                      min="0"
                      max="99"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="name">Nome *</Label>
                    <Input
                      id="name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nome do jogador"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Posição</Label>
                    <Select value={newPosition} onValueChange={setNewPosition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar" />
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
                  <div className="space-y-2">
                    <Label>&nbsp;</Label>
                    <div className="flex items-center gap-2 h-10">
                      <Checkbox 
                        id="is-captain"
                        checked={newIsCaptain}
                        onCheckedChange={(checked) => setNewIsCaptain(checked === true)}
                      />
                      <Label htmlFor="is-captain" className="flex items-center gap-1 cursor-pointer">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        Capitão
                      </Label>
                    </div>
                  </div>
                </div>

                <Separator />
                <p className="text-sm text-muted-foreground">Dados Adicionais (opcional)</p>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="height">Altura (cm)</Label>
                    <Input
                      id="height"
                      type="number"
                      value={newHeightCm}
                      onChange={(e) => setNewHeightCm(e.target.value)}
                      placeholder="180"
                      min="100"
                      max="250"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="birth-date">Data Nascimento</Label>
                    <Input
                      id="birth-date"
                      type="date"
                      value={newBirthDate}
                      onChange={(e) => setNewBirthDate(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="federation-id">Nº Licença Federativa</Label>
                  <Input
                    id="federation-id"
                    value={newFederationId}
                    onChange={(e) => setNewFederationId(e.target.value)}
                    placeholder="Ex: FPV-12345"
                  />
                </div>
                
                <Button 
                  onClick={handleAdd} 
                  className="w-full" 
                  disabled={!newNumber || !newName.trim()}
                >
                  Adicionar Jogador
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Staff Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users2 className="h-4 w-4" />
              Equipa Técnica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="coach-name" className="text-xs">Treinador Principal</Label>
                <Input
                  id="coach-name"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="Nome do treinador"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="assistant-coach" className="text-xs">Treinador Adjunto</Label>
                <Input
                  id="assistant-coach"
                  value={assistantCoach}
                  onChange={(e) => setAssistantCoach(e.target.value)}
                  placeholder="Nome do adjunto"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="team-manager" className="text-xs">Delegado</Label>
                <Input
                  id="team-manager"
                  value={teamManager}
                  onChange={(e) => setTeamManager(e.target.value)}
                  placeholder="Nome do delegado"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Team Colors Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Cores da Equipa
            </CardTitle>
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
              onClick={handleSaveTeam} 
              disabled={teamSaving}
              className="w-full"
              size="sm"
            >
              {teamSaving ? 'A guardar...' : 'Guardar Alterações'}
            </Button>
          </CardContent>
        </Card>

        {/* Squad Statistics Card */}
        {players.length > 0 && (
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
                    .sort(([a], [b]) => {
                      const order = ['OH', 'OP', 'MB', 'S', 'L', 'Sem posição'];
                      return order.indexOf(a) - order.indexOf(b);
                    })
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
        )}

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
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono font-bold">{player.jersey_number}</span>
                          {player.is_captain && (
                            <Crown className="h-3 w-3 text-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingId === player.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="h-8"
                            />
                            <div className="flex items-center gap-1">
                              <Checkbox 
                                checked={editIsCaptain}
                                onCheckedChange={(checked) => setEditIsCaptain(checked === true)}
                              />
                              <Crown className="h-3 w-3 text-yellow-500" />
                            </div>
                          </div>
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
