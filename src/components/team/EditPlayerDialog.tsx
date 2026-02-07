import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Crown } from 'lucide-react';
import { TeamPlayer } from '@/types/volleyball';

const POSITIONS = [
  { value: 'OH', label: 'Ponta (OH)' },
  { value: 'OP', label: 'Oposto (OP)' },
  { value: 'MB', label: 'Central (MB)' },
  { value: 'S', label: 'Levantador (S)' },
  { value: 'L', label: 'Líbero (L)' },
];

interface EditPlayerDialogProps {
  player: TeamPlayer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (playerId: string, data: {
    name: string;
    position: string | null;
    is_captain: boolean;
    height_cm: number | null;
    birth_date: string | null;
    federation_id: string | null;
  }) => Promise<boolean>;
}

export function EditPlayerDialog({ player, open, onOpenChange, onSave }: EditPlayerDialogProps) {
  const [name, setName] = useState('');
  const [position, setPosition] = useState<string>('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [federationId, setFederationId] = useState('');
  const [saving, setSaving] = useState(false);

  // Pré-preencher formulário quando jogador muda
  useEffect(() => {
    if (player) {
      setName(player.name);
      setPosition(player.position || '');
      setIsCaptain(player.is_captain || false);
      setHeightCm(player.height_cm?.toString() || '');
      setBirthDate(player.birth_date || '');
      setFederationId(player.federation_id || '');
    }
  }, [player]);

  const handleSave = async () => {
    if (!player || !name.trim()) return;
    
    setSaving(true);
    const success = await onSave(player.id, {
      name: name.trim(),
      position: position || null,
      is_captain: isCaptain,
      height_cm: heightCm ? parseInt(heightCm) : null,
      birth_date: birthDate || null,
      federation_id: federationId.trim() || null,
    });
    setSaving(false);
    
    if (success) {
      onOpenChange(false);
    }
  };

  if (!player) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Jogador</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Número</Label>
              <Input
                type="number"
                value={player.jersey_number}
                disabled
                className="font-mono font-bold"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome do jogador"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Posição</Label>
              <Select value={position} onValueChange={setPosition}>
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
                  id="edit-is-captain"
                  checked={isCaptain}
                  onCheckedChange={(checked) => setIsCaptain(checked === true)}
                />
                <Label htmlFor="edit-is-captain" className="flex items-center gap-1 cursor-pointer">
                  <Crown className="h-4 w-4 text-yellow-500" />
                  Capitão
                </Label>
              </div>
            </div>
          </div>

          <Separator />
          <p className="text-sm text-muted-foreground">Dados Adicionais</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="edit-height">Altura (cm)</Label>
              <Input
                id="edit-height"
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="180"
                min="100"
                max="250"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-birth-date">Data Nascimento</Label>
              <Input
                id="edit-birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="edit-federation-id">Nº Licença Federativa</Label>
            <Input
              id="edit-federation-id"
              value={federationId}
              onChange={(e) => setFederationId(e.target.value)}
              placeholder="Ex: FPV-12345"
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline"
              onClick={() => onOpenChange(false)} 
              className="flex-1"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              className="flex-1" 
              disabled={!name.trim() || saving}
            >
              {saving ? 'A guardar...' : 'Guardar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
