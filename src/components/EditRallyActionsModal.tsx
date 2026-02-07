import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  AlertTriangle, 
  CircleDot, 
  Shield, 
  Target, 
  Swords, 
  Square, 
  ShieldCheck,
  Plus,
  Trash2,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Rally, Player, MatchPlayer, Side, Reason, KillType, PassDestination, ServeType } from '@/types/volleyball';
import type { RallyActionWithPlayer, RallyActionUpdate, ActionType } from '@/types/rallyActions';
import { ACTION_CODE_LABELS, ACTION_TYPE_INFO } from '@/types/rallyActions';

interface RallyMeta {
  set_no: number;
  rally_no: number;
  serve_side: Side;
  recv_side: Side;
  point_won_by: Side | null;
  reason: Reason | null;
}

interface EditRallyActionsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rallyId: string;
  rallyMeta: RallyMeta;
  actions: RallyActionWithPlayer[];
  players: (Player | MatchPlayer)[];
  homeName: string;
  awayName: string;
  onSave: (rallyId: string, actions: ActionEditState[], metaUpdates: { point_won_by: Side | null; reason: Reason | null }) => Promise<boolean>;
}

export interface ActionEditState {
  id: string;
  action_type: ActionType;
  side: Side;
  player_id: string | null;
  player_no: number | null;
  code: number | null;
  pass_destination: PassDestination | null;
  pass_code: number | null;
  kill_type: KillType | null;
  serve_type: ServeType | null;
  b2_player_id: string | null;
  b2_no: number | null;
  b3_player_id: string | null;
  b3_no: number | null;
  sequence_no: number;
}

const CODES = [0, 1, 2, 3];
const REASONS: Reason[] = ['ACE', 'SE', 'KILL', 'AE', 'BLK', 'OP', 'DEF'];
const KILL_TYPES: KillType[] = ['FLOOR', 'BLOCKOUT'];
const DESTINATIONS: PassDestination[] = ['P2', 'P3', 'P4', 'OP', 'PIPE', 'BACK', 'OUTROS'];
const SERVE_TYPES: ServeType[] = ['FLOAT', 'JUMP_FLOAT', 'POWER', 'OTHER'];

const ACTION_ICONS: Record<ActionType, typeof CircleDot> = {
  serve: CircleDot,
  reception: Shield,
  setter: Target,
  attack: Swords,
  block: Square,
  defense: ShieldCheck,
};

export function EditRallyActionsModal({
  open,
  onOpenChange,
  rallyId,
  rallyMeta,
  actions,
  players,
  homeName,
  awayName,
  onSave,
}: EditRallyActionsModalProps) {
  const [saving, setSaving] = useState(false);
  const [editActions, setEditActions] = useState<ActionEditState[]>([]);
  const [pointWonBy, setPointWonBy] = useState<Side | null>(null);
  const [reason, setReason] = useState<Reason | null>(null);

  // Initialize state from props
  useEffect(() => {
    if (actions && actions.length > 0) {
      const mapped: ActionEditState[] = actions.map(a => ({
        id: a.id,
        action_type: a.action_type as ActionType,
        side: a.side as Side,
        player_id: a.player_id,
        player_no: a.player_no,
        code: a.code,
        pass_destination: a.pass_destination as PassDestination | null,
        pass_code: a.pass_code,
        kill_type: a.kill_type as KillType | null,
        serve_type: a.serve_type as ServeType | null,
        b2_player_id: a.b2_player_id,
        b2_no: a.b2_no,
        b3_player_id: a.b3_player_id,
        b3_no: a.b3_no,
        sequence_no: a.sequence_no,
      }));
      setEditActions(mapped.sort((a, b) => a.sequence_no - b.sequence_no));
    } else {
      setEditActions([]);
    }
    setPointWonBy(rallyMeta.point_won_by);
    setReason(rallyMeta.reason);
  }, [actions, rallyMeta]);

  const getPlayersForSide = (side: Side) => players.filter(p => p.side === side);

  const updateAction = (index: number, updates: Partial<ActionEditState>) => {
    setEditActions(prev => {
      const newActions = [...prev];
      newActions[index] = { ...newActions[index], ...updates };
      
      // Update player_no if player_id changed
      if (updates.player_id !== undefined) {
        const player = players.find(p => p.id === updates.player_id);
        newActions[index].player_no = player?.jersey_number ?? null;
      }
      if (updates.b2_player_id !== undefined) {
        const player = players.find(p => p.id === updates.b2_player_id);
        newActions[index].b2_no = player?.jersey_number ?? null;
      }
      if (updates.b3_player_id !== undefined) {
        const player = players.find(p => p.id === updates.b3_player_id);
        newActions[index].b3_no = player?.jersey_number ?? null;
      }
      
      return newActions;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const success = await onSave(rallyId, editActions, { point_won_by: pointWonBy, reason });
    setSaving(false);
    if (success) {
      onOpenChange(false);
    }
  };

  // Issue detection per action
  const getActionIssues = (action: ActionEditState) => {
    const issues: string[] = [];
    
    // Player without code
    if (action.player_id && action.code === null && action.action_type !== 'block') {
      issues.push('Código em falta');
    }
    
    // Code without player (except blocks can have no player)
    if (action.code !== null && !action.player_id && action.action_type !== 'block' && action.action_type !== 'setter') {
      issues.push('Jogador em falta');
    }
    
    // Kill without kill_type
    if (action.action_type === 'attack' && action.code === 3 && !action.kill_type) {
      issues.push('Kill type em falta');
    }
    
    // Setter without destination
    if (action.action_type === 'setter' && action.player_id && !action.pass_destination) {
      issues.push('Destino em falta');
    }
    
    return issues;
  };

  const hasAnyIssues = editActions.some(a => getActionIssues(a).length > 0);

  const getSideName = (side: Side) => side === 'CASA' ? homeName : awayName;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Editar Rally #{rallyMeta.rally_no}
            <Badge variant="outline" className="text-[10px]">Set {rallyMeta.set_no}</Badge>
            {hasAnyIssues && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Dados incompletos
              </Badge>
            )}
          </DialogTitle>
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span>Serve: {getSideName(rallyMeta.serve_side)}</span>
            <span>•</span>
            <span>Receção: {getSideName(rallyMeta.recv_side)}</span>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="space-y-3 pb-4">
            {editActions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground text-sm">
                Sem ações detalhadas para este rally.
              </div>
            ) : (
              editActions.map((action, idx) => {
                const Icon = ACTION_ICONS[action.action_type];
                const actionInfo = ACTION_TYPE_INFO[action.action_type];
                const issues = getActionIssues(action);
                const sidePlayers = getPlayersForSide(action.side);
                const isKill = action.action_type === 'attack' && action.code === 3;
                
                return (
                  <div 
                    key={action.id} 
                    className={cn(
                      'border rounded-lg p-3 space-y-2',
                      issues.length > 0 && 'border-warning/50 bg-warning/5',
                      isKill && 'border-success/50 bg-success/5'
                    )}
                  >
                    {/* Action Header */}
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        'h-6 w-6 rounded-full flex items-center justify-center',
                        action.side === 'CASA' ? 'bg-home/20 text-home' : 'bg-away/20 text-away'
                      )}>
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="text-sm font-medium">{idx + 1}. {actionInfo.labelPt}</span>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-[10px]',
                          action.side === 'CASA' ? 'border-home/50 text-home' : 'border-away/50 text-away'
                        )}
                      >
                        {getSideName(action.side).slice(0, 3)}
                      </Badge>
                      {issues.map((issue, i) => (
                        <Badge key={i} variant="outline" className="text-[10px] border-warning text-warning">
                          ⚠️ {issue}
                        </Badge>
                      ))}
                    </div>

                    {/* Action Fields */}
                    <div className="flex gap-2 flex-wrap">
                      {/* Player Select */}
                      <Select
                        value={action.player_id || 'none'}
                        onValueChange={(v) => updateAction(idx, { player_id: v === 'none' ? null : v })}
                      >
                        <SelectTrigger className="flex-1 min-w-[140px] h-8 text-xs">
                          <SelectValue placeholder="Jogador" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {sidePlayers.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              #{p.jersey_number} {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {/* Code Select */}
                      <Select
                        value={action.code?.toString() ?? 'none'}
                        onValueChange={(v) => updateAction(idx, { code: v === 'none' ? null : parseInt(v) })}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs">
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">-</SelectItem>
                          {CODES.map(c => {
                            const label = ACTION_CODE_LABELS[action.action_type]?.[c];
                            return (
                              <SelectItem key={c} value={c.toString()}>
                                {c} {label?.emoji}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>

                      {/* Serve Type (for serve actions) */}
                      {action.action_type === 'serve' && (
                        <Select
                          value={action.serve_type || 'none'}
                          onValueChange={(v) => updateAction(idx, { serve_type: v === 'none' ? null : v as ServeType })}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue placeholder="Tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {SERVE_TYPES.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Pass Destination (for setter actions) */}
                      {action.action_type === 'setter' && (
                        <Select
                          value={action.pass_destination || 'none'}
                          onValueChange={(v) => updateAction(idx, { pass_destination: v === 'none' ? null : v as PassDestination })}
                        >
                          <SelectTrigger className="w-20 h-8 text-xs">
                            <SelectValue placeholder="Dest" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {DESTINATIONS.map(d => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}

                      {/* Kill Type (for attack with code 3) */}
                      {action.action_type === 'attack' && action.code === 3 && (
                        <Select
                          value={action.kill_type || 'none'}
                          onValueChange={(v) => updateAction(idx, { kill_type: v === 'none' ? null : v as KillType })}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue placeholder="Kill type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            <SelectItem value="FLOOR">Chão</SelectItem>
                            <SelectItem value="BLOCKOUT">Block-out</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Block extra players */}
                    {action.action_type === 'block' && (
                      <div className="flex gap-2 flex-wrap">
                        <Select
                          value={action.b2_player_id || 'none'}
                          onValueChange={(v) => updateAction(idx, { b2_player_id: v === 'none' ? null : v })}
                        >
                          <SelectTrigger className="flex-1 min-w-[120px] h-8 text-xs">
                            <SelectValue placeholder="+Bloq 2" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {sidePlayers.filter(p => p.id !== action.player_id).map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                #{p.jersey_number} {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={action.b3_player_id || 'none'}
                          onValueChange={(v) => updateAction(idx, { b3_player_id: v === 'none' ? null : v })}
                        >
                          <SelectTrigger className="flex-1 min-w-[120px] h-8 text-xs">
                            <SelectValue placeholder="+Bloq 3" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-</SelectItem>
                            {sidePlayers.filter(p => p.id !== action.player_id && p.id !== action.b2_player_id).map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                #{p.jersey_number} {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <Separator />

        {/* Outcome Section */}
        <div className="px-6 py-3 space-y-3">
          <Label className="text-sm font-medium">Resultado do Rally</Label>
          <div className="flex gap-2">
            <Select
              value={pointWonBy || 'none'}
              onValueChange={(v) => setPointWonBy(v === 'none' ? null : v as Side)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Ponto para..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">-</SelectItem>
                <SelectItem value="CASA">{homeName}</SelectItem>
                <SelectItem value="FORA">{awayName}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={reason || 'none'}
              onValueChange={(v) => setReason(v === 'none' ? null : v as Reason)}
            >
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Motivo" />
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

        <DialogFooter className="px-6 py-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
