import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Rally, Player, MatchPlayer, Side, Reason, KillType, PassDestination } from '@/types/volleyball';
import { AlertTriangle } from 'lucide-react';

interface EditRallyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rally: Rally | null;
  players: (Player | MatchPlayer)[];
  onSave: (rallyId: string, updates: Partial<Rally>) => Promise<boolean>;
  homeName: string;
  awayName: string;
}

const CODES = [0, 1, 2, 3];
const REASONS: Reason[] = ['ACE', 'SE', 'KILL', 'AE', 'BLK', 'OP', 'DEF'];
const KILL_TYPES: KillType[] = ['FLOOR', 'BLOCKOUT'];
const DESTINATIONS: PassDestination[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK', 'OUTROS'];

export function EditRallyModal({
  open,
  onOpenChange,
  rally,
  players,
  onSave,
  homeName,
  awayName,
}: EditRallyModalProps) {
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Rally>>({});

  useEffect(() => {
    if (rally) {
      setEditData({
        s_player_id: rally.s_player_id,
        s_code: rally.s_code,
        r_player_id: rally.r_player_id,
        r_code: rally.r_code,
        setter_player_id: rally.setter_player_id,
        pass_destination: rally.pass_destination,
        pass_code: rally.pass_code,
        a_player_id: rally.a_player_id,
        a_code: rally.a_code,
        kill_type: rally.kill_type,
        b1_player_id: rally.b1_player_id,
        b2_player_id: rally.b2_player_id,
        b3_player_id: rally.b3_player_id,
        b_code: rally.b_code,
        d_player_id: rally.d_player_id,
        d_code: rally.d_code,
        point_won_by: rally.point_won_by,
        reason: rally.reason,
      });
    }
  }, [rally]);

  if (!rally) return null;

  const servePlayers = players.filter(p => p.side === rally.serve_side);
  const recvPlayers = players.filter(p => p.side === rally.recv_side);
  
  // For attack, we need to determine which side attacked based on phase
  const attackSide = rally.phase % 2 === 1 ? rally.recv_side : rally.serve_side;
  const defSide = attackSide === 'CASA' ? 'FORA' : 'CASA';
  const attackPlayers = players.filter(p => p.side === attackSide);
  const defPlayers = players.filter(p => p.side === defSide);

  const handleSave = async () => {
    if (!rally) return;
    setSaving(true);
    
    // Find player jersey numbers for updated player IDs
    const sPlayer = players.find(p => p.id === editData.s_player_id);
    const rPlayer = players.find(p => p.id === editData.r_player_id);
    const aPlayer = players.find(p => p.id === editData.a_player_id);
    const b1Player = players.find(p => p.id === editData.b1_player_id);
    const b2Player = players.find(p => p.id === editData.b2_player_id);
    const b3Player = players.find(p => p.id === editData.b3_player_id);
    const dPlayer = players.find(p => p.id === editData.d_player_id);

    const updates: Partial<Rally> = {
      ...editData,
      s_no: sPlayer?.jersey_number ?? null,
      r_no: rPlayer?.jersey_number ?? null,
      a_no: aPlayer?.jersey_number ?? null,
      b1_no: b1Player?.jersey_number ?? null,
      b2_no: b2Player?.jersey_number ?? null,
      b3_no: b3Player?.jersey_number ?? null,
      d_no: dPlayer?.jersey_number ?? null,
    };

    const success = await onSave(rally.id, updates);
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  const hasIssues = (rally.reason === 'KILL' && !editData.a_player_id) ||
                   (editData.a_code !== null && editData.a_code !== undefined && !editData.a_player_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar Rally #{rally.rally_no}
            {hasIssues && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Dados em falta
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rally Info */}
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>Set {rally.set_no}</span>
            <span>•</span>
            <span>Fase {rally.phase}</span>
            <span>•</span>
            <span>Serve: {rally.serve_side === 'CASA' ? homeName : awayName}</span>
          </div>

          {/* Serve */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Serviço ({rally.serve_side === 'CASA' ? homeName : awayName})</Label>
            <div className="flex gap-2">
              <Select
                value={editData.s_player_id || 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, s_player_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Jogador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {servePlayers.map(p => (
                    <SelectItem key={p.id} value={p.id}>#{p.jersey_number} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={editData.s_code?.toString() ?? 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, s_code: v === 'none' ? null : parseInt(v) }))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Cód" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {CODES.map(c => (
                    <SelectItem key={c} value={c.toString()}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reception */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Receção ({rally.recv_side === 'CASA' ? homeName : awayName})</Label>
            <div className="flex gap-2">
              <Select
                value={editData.r_player_id || 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, r_player_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Jogador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {recvPlayers.map(p => (
                    <SelectItem key={p.id} value={p.id}>#{p.jersey_number} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={editData.r_code?.toString() ?? 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, r_code: v === 'none' ? null : parseInt(v) }))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Cód" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {CODES.map(c => (
                    <SelectItem key={c} value={c.toString()}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Attack */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              Ataque ({attackSide === 'CASA' ? homeName : awayName})
              {hasIssues && !editData.a_player_id && (
                <Badge variant="destructive" className="text-xs">Necessário</Badge>
              )}
            </Label>
            <div className="flex gap-2">
              <Select
                value={editData.a_player_id || 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, a_player_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger className={`flex-1 ${hasIssues && !editData.a_player_id ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="Jogador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {attackPlayers.map(p => (
                    <SelectItem key={p.id} value={p.id}>#{p.jersey_number} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={editData.a_code?.toString() ?? 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, a_code: v === 'none' ? null : parseInt(v) }))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Cód" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {CODES.map(c => (
                    <SelectItem key={c} value={c.toString()}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editData.a_code === 3 && (
              <div className="flex gap-2">
                <Select
                  value={editData.kill_type || 'none'}
                  onValueChange={(v) => setEditData(prev => ({ ...prev, kill_type: v === 'none' ? null : v as KillType }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de Kill" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">-</SelectItem>
                    <SelectItem value="FLOOR">Chão</SelectItem>
                    <SelectItem value="BLOCKOUT">Block-out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Block */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Bloco ({defSide === 'CASA' ? homeName : awayName})</Label>
            <div className="flex gap-2">
              <Select
                value={editData.b1_player_id || 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, b1_player_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Bloq 1" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {defPlayers.map(p => (
                    <SelectItem key={p.id} value={p.id}>#{p.jersey_number} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={editData.b_code?.toString() ?? 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, b_code: v === 'none' ? null : parseInt(v) }))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Cód" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {CODES.map(c => (
                    <SelectItem key={c} value={c.toString()}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Defense */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Defesa ({defSide === 'CASA' ? homeName : awayName})</Label>
            <div className="flex gap-2">
              <Select
                value={editData.d_player_id || 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, d_player_id: v === 'none' ? null : v }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Jogador" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {defPlayers.map(p => (
                    <SelectItem key={p.id} value={p.id}>#{p.jersey_number} {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={editData.d_code?.toString() ?? 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, d_code: v === 'none' ? null : parseInt(v) }))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="Cód" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {CODES.map(c => (
                    <SelectItem key={c} value={c.toString()}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Outcome */}
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm font-medium">Resultado</Label>
            <div className="flex gap-2">
              <Select
                value={editData.point_won_by || 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, point_won_by: v === 'none' ? null : v as Side }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Vencedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="CASA">{homeName}</SelectItem>
                  <SelectItem value="FORA">{awayName}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={editData.reason || 'none'}
                onValueChange={(v) => setEditData(prev => ({ ...prev, reason: v === 'none' ? null : v as Reason }))}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Razão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-</SelectItem>
                  {REASONS.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'A guardar...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
