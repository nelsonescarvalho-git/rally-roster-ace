import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMatch } from '@/hooks/useMatch';
import { useTeams } from '@/hooks/useTeams';
import { useMatchPlayers } from '@/hooks/useMatchPlayers';
import { useTeamColors } from '@/hooks/useTeamColors';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Trash2, Save, Play, Users, Download } from 'lucide-react';
import { Side, TeamPlayer } from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';

export default function Setup() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { match, lineups, loading, loadMatch, getLineupForSet } = useMatch(matchId || null);
  const { teams, getTeamPlayers, addTeamPlayer } = useTeams();
  const { matchPlayers, loadMatchPlayers, getPlayersForSide, importTeamPlayers, addMatchPlayer, removeMatchPlayer } = useMatchPlayers(matchId || null);

  const [activeSide, setActiveSide] = useState<Side>('CASA');
  const [activeSet, setActiveSet] = useState(1);
  const [activeTab, setActiveTab] = useState('team');
  
  // Team selection
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  
  const [teamPlayers, setTeamPlayers] = useState<TeamPlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  
  // New player form
  const [newPlayer, setNewPlayer] = useState({ number: '', name: '', position: '' });
  
  // Lineup selections
  const [lineupSelections, setLineupSelections] = useState<Record<string, string>>({});
  
  // Team colors state
  const [teamColors, setTeamColors] = useState<{
    home: { primary?: string; secondary?: string };
    away: { primary?: string; secondary?: string };
  }>({ home: {}, away: {} });
  
  // Apply team colors via CSS variables
  useTeamColors({ homeColors: teamColors.home, awayColors: teamColors.away });

  useEffect(() => {
    if (matchId) {
      loadMatch();
      loadMatchPlayers();
    }
  }, [matchId, loadMatch, loadMatchPlayers]);

  // Load team based on match team_id and fetch team colors
  useEffect(() => {
    if (match) {
      const teamId = activeSide === 'CASA' ? match.home_team_id : match.away_team_id;
      if (teamId) {
        setSelectedTeamId(teamId);
      } else {
        setSelectedTeamId('');
      }
      
      // Fetch team colors for both teams
      const fetchTeamColors = async () => {
        const teamIds = [match.home_team_id, match.away_team_id].filter(Boolean);
        if (teamIds.length === 0) return;
        
        const { data: teamsData } = await supabase
          .from('teams')
          .select('id, primary_color, secondary_color')
          .in('id', teamIds);
        
        if (teamsData) {
          const homeTeam = teamsData.find(t => t.id === match.home_team_id);
          const awayTeam = teamsData.find(t => t.id === match.away_team_id);
          
          setTeamColors({
            home: homeTeam ? { primary: homeTeam.primary_color || undefined, secondary: homeTeam.secondary_color || undefined } : {},
            away: awayTeam ? { primary: awayTeam.primary_color || undefined, secondary: awayTeam.secondary_color || undefined } : {},
          });
        }
      };
      
      fetchTeamColors();
    }
  }, [match, activeSide]);

  // Load team players when team is selected
  useEffect(() => {
    if (selectedTeamId) {
      loadTeamPlayers();
    } else {
      setTeamPlayers([]);
    }
  }, [selectedTeamId]);

  const loadTeamPlayers = async () => {
    if (!selectedTeamId) return;
    const players = await getTeamPlayers(selectedTeamId);
    setTeamPlayers(players);
    
    // Pre-select players that are already in match_players
    const matchPlayerTeamIds = matchPlayers
      .filter(mp => mp.side === activeSide && mp.team_player_id)
      .map(mp => mp.team_player_id);
    setSelectedPlayerIds(new Set(matchPlayerTeamIds.filter(Boolean) as string[]));
  };

  useEffect(() => {
    const lineup = getLineupForSet(activeSet, activeSide);
    if (lineup) {
      setLineupSelections({
        rot1: lineup.rot1 || '',
        rot2: lineup.rot2 || '',
        rot3: lineup.rot3 || '',
        rot4: lineup.rot4 || '',
        rot5: lineup.rot5 || '',
        rot6: lineup.rot6 || '',
      });
    } else {
      setLineupSelections({});
    }
  }, [activeSet, activeSide, getLineupForSet]);


  const handleSelectTeam = async (teamId: string) => {
    setSelectedTeamId(teamId);
    await updateMatchTeam(teamId);
  };

  const updateMatchTeam = async (teamId: string) => {
    if (!matchId) return;
    const field = activeSide === 'CASA' ? 'home_team_id' : 'away_team_id';
    try {
      await supabase
        .from('matches')
        .update({ [field]: teamId })
        .eq('id', matchId);
      await loadMatch();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddPlayerToTeam = async () => {
    if (!selectedTeamId || !newPlayer.number || !newPlayer.name) return;
    const player = await addTeamPlayer(
      selectedTeamId,
      parseInt(newPlayer.number),
      newPlayer.name,
      newPlayer.position || null
    );
    if (player) {
      setNewPlayer({ number: '', name: '', position: '' });
      await loadTeamPlayers();
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    const newSet = new Set(selectedPlayerIds);
    if (newSet.has(playerId)) {
      newSet.delete(playerId);
    } else {
      newSet.add(playerId);
    }
    setSelectedPlayerIds(newSet);
  };

  const handleImportSelectedPlayers = async () => {
    if (!selectedTeamId) return;
    const selectedPlayers = teamPlayers.filter(tp => selectedPlayerIds.has(tp.id));
    if (selectedPlayers.length === 0) {
      toast({ title: 'Aviso', description: 'Selecione pelo menos um jogador', variant: 'destructive' });
      return;
    }
    await importTeamPlayers(selectedTeamId, activeSide, selectedPlayers);
    setSelectedPlayerIds(new Set());
  };

  const handleImportAllPlayers = async () => {
    if (!selectedTeamId || teamPlayers.length === 0) {
      toast({ title: 'Aviso', description: 'Não há jogadores no plantel', variant: 'destructive' });
      return;
    }
    await importTeamPlayers(selectedTeamId, activeSide, teamPlayers);
    setSelectedPlayerIds(new Set());
  };

  const handleRemoveMatchPlayer = async (playerId: string) => {
    await removeMatchPlayer(playerId);
  };

  const saveLineup = async () => {
    if (!matchId) return;
    const existing = getLineupForSet(activeSet, activeSide);
    try {
      if (existing) {
        const { error } = await supabase.from('lineups').update({
          rot1: lineupSelections.rot1 || null,
          rot2: lineupSelections.rot2 || null,
          rot3: lineupSelections.rot3 || null,
          rot4: lineupSelections.rot4 || null,
          rot5: lineupSelections.rot5 || null,
          rot6: lineupSelections.rot6 || null,
        }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('lineups').insert([{
          match_id: matchId,
          set_no: activeSet,
          side: activeSide,
          rot1: lineupSelections.rot1 || null,
          rot2: lineupSelections.rot2 || null,
          rot3: lineupSelections.rot3 || null,
          rot4: lineupSelections.rot4 || null,
          rot5: lineupSelections.rot5 || null,
          rot6: lineupSelections.rot6 || null,
        }]);
        if (error) throw error;
      }
      loadMatch();
      toast({ title: 'Lineup guardado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const sidePlayers = getPlayersForSide(activeSide);
  const teamName = activeSide === 'CASA' ? match?.home_name : match?.away_name;

  if (loading || !match) {
    return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;
  }

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-semibold">{match.title}</h1>
            <p className="text-xs text-muted-foreground">Configuração</p>
          </div>
          <Button onClick={() => navigate(`/live/${matchId}`)} className="gap-1">
            <Play className="h-4 w-4" />
            Live
          </Button>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setActiveSide('CASA')}
            className="flex-1 font-semibold transition-all"
            style={activeSide === 'CASA' ? {
              backgroundColor: 'hsl(var(--home))',
              color: 'white',
              borderColor: 'hsl(var(--home))',
            } : {
              borderColor: 'hsl(var(--home) / 0.5)',
              color: 'hsl(var(--home))',
            }}
          >
            {match.home_name}
          </Button>
          <Button
            variant="outline"
            onClick={() => setActiveSide('FORA')}
            className="flex-1 font-semibold transition-all"
            style={activeSide === 'FORA' ? {
              backgroundColor: 'hsl(var(--away))',
              color: 'white',
              borderColor: 'hsl(var(--away))',
            } : {
              borderColor: 'hsl(var(--away) / 0.5)',
              color: 'hsl(var(--away))',
            }}
          >
            {match.away_name}
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} key={activeSide}>
          <TabsList className="w-full">
            <TabsTrigger value="team" className="flex-1">
              <Users className="h-4 w-4 mr-1" />
              Equipa
            </TabsTrigger>
            <TabsTrigger value="match" className="flex-1">Jogadores</TabsTrigger>
            <TabsTrigger value="lineup" className="flex-1">Lineup</TabsTrigger>
          </TabsList>

          {/* TEAM TAB - Select/Create team and manage roster */}
          <TabsContent value="team" className="space-y-4 animate-fade-in">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Selecionar Equipa</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={selectedTeamId} onValueChange={handleSelectTeam}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolher equipa existente" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedTeamId && (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Adicionar Jogador ao Plantel</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="number"
                        placeholder="Nº"
                        value={newPlayer.number}
                        onChange={(e) => setNewPlayer({ ...newPlayer, number: e.target.value })}
                      />
                      <Input
                        placeholder="Nome"
                        value={newPlayer.name}
                        onChange={(e) => setNewPlayer({ ...newPlayer, name: e.target.value })}
                        className="col-span-2"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Posição (opcional)"
                        value={newPlayer.position}
                        onChange={(e) => setNewPlayer({ ...newPlayer, position: e.target.value })}
                        className="flex-1"
                      />
                      <Button onClick={handleAddPlayerToTeam} disabled={!newPlayer.number || !newPlayer.name}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Plantel da Equipa</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleImportAllPlayers}
                      disabled={teamPlayers.length === 0}
                      className="gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Todos
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleImportSelectedPlayers}
                      disabled={selectedPlayerIds.size === 0}
                      className="gap-1"
                    >
                      <Download className="h-4 w-4" />
                      Importar ({selectedPlayerIds.size})
                    </Button>
                  </div>
                </div>
              </CardHeader>
                  <CardContent>
                    {teamPlayers.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground py-4">
                        Adicione jogadores ao plantel
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {teamPlayers.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center gap-3 p-2 rounded-lg border"
                          >
                            <Checkbox
                              checked={selectedPlayerIds.has(player.id)}
                              onCheckedChange={() => togglePlayerSelection(player.id)}
                            />
                            <div 
                              className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                              style={{ backgroundColor: activeSide === 'CASA' ? 'hsl(var(--home))' : 'hsl(var(--away))' }}
                            >
                              {player.jersey_number}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">{player.name}</div>
                              {player.position && (
                                <div className="text-xs text-muted-foreground">{player.position}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* MATCH TAB - Players in this match */}
          <TabsContent value="match" className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              {sidePlayers.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Nenhum jogador neste jogo.
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Vá ao separador "Equipa" para importar jogadores.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                sidePlayers.map((player) => (
                  <Card key={player.id}>
                    <CardContent className="flex items-center justify-between py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div 
                          className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                          style={{ backgroundColor: activeSide === 'CASA' ? 'hsl(var(--home))' : 'hsl(var(--away))' }}
                        >
                          {player.jersey_number}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          {player.position && (
                            <div className="text-xs text-muted-foreground">{player.position}</div>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleRemoveMatchPlayer(player.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* LINEUP TAB */}
          <TabsContent value="lineup" className="space-y-4 animate-fade-in">
            <div className="flex gap-1 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5].map((set) => (
                <Button
                  key={set}
                  variant={activeSet === set ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveSet(set)}
                >
                  Set {set}
                </Button>
              ))}
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lineup Set {activeSet} - {teamName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {sidePlayers.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    Importe jogadores primeiro no separador "Equipa"
                  </p>
                ) : (
                  <>
                    {[1, 2, 3, 4, 5, 6].map((rot) => (
                      <div key={rot} className="flex items-center gap-3">
                        <Label className="w-16 text-sm">Rot {rot}</Label>
                        <Select
                          value={lineupSelections[`rot${rot}`] || ''}
                          onValueChange={(v) => setLineupSelections({ ...lineupSelections, [`rot${rot}`]: v })}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecionar jogador" />
                          </SelectTrigger>
                          <SelectContent>
                            {sidePlayers
                              .filter((p) => {
                                // Allow the current selection for this rotation
                                const currentValue = lineupSelections[`rot${rot}`];
                                if (p.id === currentValue) return true;
                                
                                // Exclude players already selected in other rotations
                                const selectedInOther = Object.entries(lineupSelections)
                                  .filter(([key, value]) => key !== `rot${rot}` && value)
                                  .map(([_, value]) => value);
                                return !selectedInOther.includes(p.id);
                              })
                              .map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  #{p.jersey_number} {p.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                    <Button onClick={saveLineup} className="w-full gap-2">
                      <Save className="h-4 w-4" />
                      Guardar Lineup
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
