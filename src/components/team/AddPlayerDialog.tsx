import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Plus, Crown } from 'lucide-react';

const POSITIONS = [
  { value: 'OH', label: 'Ponta (OH)' },
  { value: 'OP', label: 'Oposto (OP)' },
  { value: 'MB', label: 'Central (MB)' },
  { value: 'S', label: 'Levantador (S)' },
  { value: 'L', label: 'Líbero (L)' },
];

interface AddPlayerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddPlayer: (data: {
    number: number;
    name: string;
    position: string | null;
    height_cm: number | null;
    birth_date: string | null;
    federation_id: string | null;
    is_captain: boolean;
  }) => Promise<boolean>;
}

export function AddPlayerDialog({ open, onOpenChange, onAddPlayer }: AddPlayerDialogProps) {
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState<string>('');
  const [isCaptain, setIsCaptain] = useState(false);
  const [heightCm, setHeightCm] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [federationId, setFederationId] = useState('');

  const resetForm = () => {
    setNumber('');
    setName('');
    setPosition('');
    setIsCaptain(false);
    setHeightCm('');
    setBirthDate('');
    setFederationId('');
  };

  const handleAdd = async () => {
    if (!number || !name.trim()) return;
    
    const success = await onAddPlayer({
      number: parseInt(number),
      name: name.trim(),
      position: position || null,
      height_cm: heightCm ? parseInt(heightCm) : null,
      birth_date: birthDate || null,
      federation_id: federationId.trim() || null,
      is_captain: isCaptain,
    });
    
    if (success) {
      onOpenChange(false);
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="7"
                min="0"
                max="99"
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
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
                  id="is-captain"
                  checked={isCaptain}
                  onCheckedChange={(checked) => setIsCaptain(checked === true)}
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
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
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
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="federation-id">Nº Licença Federativa</Label>
            <Input
              id="federation-id"
              value={federationId}
              onChange={(e) => setFederationId(e.target.value)}
              placeholder="Ex: FPV-12345"
            />
          </div>
          
          <Button 
            onClick={handleAdd} 
            className="w-full" 
            disabled={!number || !name.trim()}
          >
            Adicionar Jogador
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
