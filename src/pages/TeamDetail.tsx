import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { useTeams } from '@/hooks/useTeams';
import { TeamPlayer } from '@/types/volleyball';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';

import { StaffCard } from '@/components/team/StaffCard';
import { ColorsCard } from '@/components/team/ColorsCard';
import { SquadStatsCard } from '@/components/team/SquadStatsCard';
import { PlayerTable } from '@/components/team/PlayerTable';
import { AddPlayerDialog } from '@/components/team/AddPlayerDialog';

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
  
  // Team state
  const [coachName, setCoachName] = useState('');
  const [assistantCoach, setAssistantCoach] = useState('');
  const [teamManager, setTeamManager] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS.primary);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_COLORS.secondary);
  const [teamSaving, setTeamSaving] = useState(false);

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

  const handleAddPlayer = async (data: {
    number: number;
    name: string;
    position: string | null;
    height_cm: number | null;
    birth_date: string | null;
    federation_id: string | null;
    is_captain: boolean;
  }) => {
    if (!teamId) return false;
    const result = await addTeamPlayer(
      teamId,
      data.number,
      data.name,
      data.position,
      {
        height_cm: data.height_cm,
        birth_date: data.birth_date,
        federation_id: data.federation_id,
        is_captain: data.is_captain,
      }
    );
    if (result) {
      loadPlayers();
      return true;
    }
    return false;
  };

  const handleUpdatePlayer = async (playerId: string, data: { name: string; position: string | null; is_captain: boolean }) => {
    const success = await updateTeamPlayer(playerId, data);
    if (success) {
      loadPlayers();
    }
    return success;
  };

  const handleDeactivatePlayer = async (playerId: string) => {
    const success = await deactivateTeamPlayer(playerId);
    if (success) {
      loadPlayers();
    }
    return success;
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
          <AddPlayerDialog 
            open={addOpen} 
            onOpenChange={setAddOpen} 
            onAddPlayer={handleAddPlayer}
          />
        </div>

        <StaffCard
          coachName={coachName}
          assistantCoach={assistantCoach}
          teamManager={teamManager}
          onCoachNameChange={setCoachName}
          onAssistantCoachChange={setAssistantCoach}
          onTeamManagerChange={setTeamManager}
        />

        <ColorsCard
          teamName={team.name}
          primaryColor={primaryColor}
          secondaryColor={secondaryColor}
          saving={teamSaving}
          onPrimaryColorChange={setPrimaryColor}
          onSecondaryColorChange={setSecondaryColor}
          onSave={handleSaveTeam}
        />

        <SquadStatsCard players={players} />

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-pulse text-muted-foreground">A carregar...</div>
          </div>
        ) : (
          <PlayerTable
            players={players}
            onAddClick={() => setAddOpen(true)}
            onUpdatePlayer={handleUpdatePlayer}
            onDeactivatePlayer={handleDeactivatePlayer}
          />
        )}
      </div>
    </MainLayout>
  );
}
