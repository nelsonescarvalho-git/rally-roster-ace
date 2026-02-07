import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, UserMinus, Check, X, Crown } from 'lucide-react';
import { TeamPlayer } from '@/types/volleyball';

const POSITIONS = [
  { value: 'OH', label: 'Ponta (OH)' },
  { value: 'OP', label: 'Oposto (OP)' },
  { value: 'MB', label: 'Central (MB)' },
  { value: 'S', label: 'Levantador (S)' },
  { value: 'L', label: 'Líbero (L)' },
];

interface PlayerTableProps {
  players: TeamPlayer[];
  onAddClick: () => void;
  onUpdatePlayer: (playerId: string, data: { name: string; position: string | null; is_captain: boolean }) => Promise<boolean>;
  onDeactivatePlayer: (playerId: string) => Promise<boolean>;
}

export function PlayerTable({
  players,
  onAddClick,
  onUpdatePlayer,
  onDeactivatePlayer,
}: PlayerTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPosition, setEditPosition] = useState<string>('');
  const [editIsCaptain, setEditIsCaptain] = useState(false);

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
    const success = await onUpdatePlayer(playerId, {
      name: editName.trim(),
      position: editPosition || null,
      is_captain: editIsCaptain,
    });
    if (success) {
      cancelEdit();
    }
  };

  const handleDeactivate = async (playerId: string) => {
    await onDeactivatePlayer(playerId);
  };

  if (players.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="mb-2 text-lg font-semibold">Plantel vazio</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Adicione jogadores a esta equipa.
          </p>
          <Button onClick={onAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Jogador
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
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
  );
}
