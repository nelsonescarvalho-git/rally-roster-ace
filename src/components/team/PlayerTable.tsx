import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, UserMinus, Crown } from 'lucide-react';
import { TeamPlayer } from '@/types/volleyball';
import { EditPlayerDialog } from './EditPlayerDialog';

interface PlayerTableProps {
  players: TeamPlayer[];
  onAddClick: () => void;
  onUpdatePlayer: (playerId: string, data: {
    name: string;
    position: string | null;
    is_captain: boolean;
    height_cm: number | null;
    birth_date: string | null;
    federation_id: string | null;
  }) => Promise<boolean>;
  onDeactivatePlayer: (playerId: string) => Promise<boolean>;
}

export function PlayerTable({
  players,
  onAddClick,
  onUpdatePlayer,
  onDeactivatePlayer,
}: PlayerTableProps) {
  const [editingPlayer, setEditingPlayer] = useState<TeamPlayer | null>(null);

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
    <>
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
                  <TableCell>{player.name}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">
                      {player.position || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingPlayer(player)}
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
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EditPlayerDialog
        player={editingPlayer}
        open={!!editingPlayer}
        onOpenChange={(open) => {
          if (!open) setEditingPlayer(null);
        }}
        onSave={onUpdatePlayer}
      />
    </>
  );
}
