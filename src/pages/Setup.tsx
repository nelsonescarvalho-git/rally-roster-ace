import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useMatch } from '@/hooks/useMatch';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, Trash2, Save, Play } from 'lucide-react';
import { Side, Player } from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';

export default function Setup() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { match, players, lineups, loading, loadMatch, getPlayersForSide, getLineupForSet } = useMatch(matchId || null);

  const [activeSide, setActiveSide] = useState<Side>('CASA');
  const [activeSet, setActiveSet] = useState(1);
  const [newPlayer, setNewPlayer] = useState({ number: '', name: '', position: '' });
  const [lineupSelections, setLineupSelections] = useState<Record<string, string>>({});

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId, loadMatch]);

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

  const addPlayer = async () => {
    if (!matchId || !newPlayer.number || !newPlayer.name) return;
    try {
      const { error } = await supabase.from('players').insert([{
        match_id: matchId,
        side: activeSide,
        jersey_number: parseInt(newPlayer.number),
        name: newPlayer.name.trim(),
        position: newPlayer.position.trim() || null,
      }]);
      if (error) throw error;
      setNewPlayer({ number: '', name: '', position: '' });
      loadMatch();
      toast({ title: 'Jogador adicionado' });
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
  };

  const deletePlayer = async (playerId: string) => {
    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId);
      if (error) throw error;
      loadMatch();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    }
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
            variant={activeSide === 'CASA' ? 'default' : 'outline'}
            onClick={() => setActiveSide('CASA')}
            className="flex-1"
          >
            {match.home_name}
          </Button>
          <Button
            variant={activeSide === 'FORA' ? 'default' : 'outline'}
            onClick={() => setActiveSide('FORA')}
            className="flex-1"
          >
            {match.away_name}
          </Button>
        </div>

        <Tabs defaultValue="players">
          <TabsList className="w-full">
            <TabsTrigger value="players" className="flex-1">Plantel</TabsTrigger>
            <TabsTrigger value="lineup" className="flex-1">Lineup</TabsTrigger>
          </TabsList>

          <TabsContent value="players" className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Adicionar Jogador</CardTitle>
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
                  <Button onClick={addPlayer} disabled={!newPlayer.number || !newPlayer.name}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {sidePlayers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  Adicione jogadores ao plantel
                </p>
              ) : (
                sidePlayers.map((player) => (
                  <Card key={player.id}>
                    <CardContent className="flex items-center justify-between py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                          {player.jersey_number}
                        </div>
                        <div>
                          <div className="font-medium">{player.name}</div>
                          {player.position && (
                            <div className="text-xs text-muted-foreground">{player.position}</div>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => deletePlayer(player.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="lineup" className="space-y-4">
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
                        {sidePlayers.map((p) => (
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
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
