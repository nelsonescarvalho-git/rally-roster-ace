import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useTeams } from '@/hooks/useTeams';
import { Team } from '@/types/volleyball';

const DEFAULT_COLORS = {
  primary: '#3B82F6',
  secondary: '#1E40AF',
};

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTeamCreated?: (team: Team) => void;
}

export function CreateTeamDialog({ open, onOpenChange, onTeamCreated }: CreateTeamDialogProps) {
  const { createTeam } = useTeams();
  
  const [name, setName] = useState('');
  const [coachName, setCoachName] = useState('');
  const [assistantCoach, setAssistantCoach] = useState('');
  const [teamManager, setTeamManager] = useState('');
  const [primaryColor, setPrimaryColor] = useState(DEFAULT_COLORS.primary);
  const [secondaryColor, setSecondaryColor] = useState(DEFAULT_COLORS.secondary);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setName('');
    setCoachName('');
    setAssistantCoach('');
    setTeamManager('');
    setPrimaryColor(DEFAULT_COLORS.primary);
    setSecondaryColor(DEFAULT_COLORS.secondary);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    
    const team = await createTeam(name.trim(), {
      coach_name: coachName.trim() || null,
      assistant_coach: assistantCoach.trim() || null,
      team_manager: teamManager.trim() || null,
      primary_color: primaryColor,
      secondary_color: secondaryColor,
    });
    
    setLoading(false);
    
    if (team) {
      resetForm();
      onOpenChange(false);
      onTeamCreated?.(team);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Nova Equipa</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="team-name">Nome da Equipa *</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Amares SC"
            />
          </div>

          <Separator />
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Equipa Técnica (opcional)</p>
          </div>
          
          {/* Coach Name */}
          <div className="space-y-2">
            <Label htmlFor="coach-name">Treinador Principal</Label>
            <Input
              id="coach-name"
              value={coachName}
              onChange={(e) => setCoachName(e.target.value)}
              placeholder="Nome do treinador"
            />
          </div>
          
          {/* Assistant Coach */}
          <div className="space-y-2">
            <Label htmlFor="assistant-coach">Treinador Adjunto</Label>
            <Input
              id="assistant-coach"
              value={assistantCoach}
              onChange={(e) => setAssistantCoach(e.target.value)}
              placeholder="Nome do adjunto"
            />
          </div>
          
          {/* Team Manager */}
          <div className="space-y-2">
            <Label htmlFor="team-manager">Delegado</Label>
            <Input
              id="team-manager"
              value={teamManager}
              onChange={(e) => setTeamManager(e.target.value)}
              placeholder="Nome do delegado"
            />
          </div>

          <Separator />
          
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Cores da Equipa</p>
          </div>
          
          {/* Colors */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="primary-color" className="text-xs">Cor Primária</Label>
              <div className="flex items-center gap-2">
                <div 
                  className="h-10 w-10 rounded-lg border-2 border-border shadow-sm cursor-pointer overflow-hidden flex-shrink-0"
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
            
            <div className="space-y-2">
              <Label htmlFor="secondary-color" className="text-xs">Cor Secundária</Label>
              <div className="flex items-center gap-2">
                <div 
                  className="h-10 w-10 rounded-lg border-2 border-border shadow-sm cursor-pointer overflow-hidden flex-shrink-0"
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
                className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-md flex-shrink-0"
                style={{ 
                  backgroundColor: primaryColor, 
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                }}
              >
                #7
              </div>
              <div className="flex-1 min-w-0">
                <div 
                  className="h-2 rounded-full mb-1"
                  style={{ backgroundColor: primaryColor }}
                />
                <div 
                  className="h-2 rounded-full w-2/3"
                  style={{ backgroundColor: secondaryColor }}
                />
              </div>
              {name && (
                <div 
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold truncate max-w-[100px]"
                  style={{ 
                    backgroundColor: primaryColor, 
                    color: '#fff',
                  }}
                >
                  {name}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleCreate} 
            className="w-full" 
            disabled={!name.trim() || loading}
          >
            {loading ? 'A criar...' : 'Criar Equipa'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
