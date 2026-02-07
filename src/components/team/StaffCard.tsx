import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Users2 } from 'lucide-react';

interface StaffCardProps {
  coachName: string;
  assistantCoach: string;
  teamManager: string;
  onCoachNameChange: (value: string) => void;
  onAssistantCoachChange: (value: string) => void;
  onTeamManagerChange: (value: string) => void;
}

export function StaffCard({
  coachName,
  assistantCoach,
  teamManager,
  onCoachNameChange,
  onAssistantCoachChange,
  onTeamManagerChange,
}: StaffCardProps) {
  return (
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
              onChange={(e) => onCoachNameChange(e.target.value)}
              placeholder="Nome do treinador"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="assistant-coach" className="text-xs">Treinador Adjunto</Label>
            <Input
              id="assistant-coach"
              value={assistantCoach}
              onChange={(e) => onAssistantCoachChange(e.target.value)}
              placeholder="Nome do adjunto"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-manager" className="text-xs">Delegado</Label>
            <Input
              id="team-manager"
              value={teamManager}
              onChange={(e) => onTeamManagerChange(e.target.value)}
              placeholder="Nome do delegado"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
