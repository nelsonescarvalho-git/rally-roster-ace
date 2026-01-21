import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMatch } from '@/hooks/useMatch';
import { useSetKPIs } from '@/hooks/useSetKPIs';
import { useTeamColors } from '@/hooks/useTeamColors';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart2, Undo2, Settings, Trophy, Lock, Check, Swords, Home, AlertCircle, ChevronLeft, ChevronRight, Zap, MoreVertical, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { WizardStepHelp } from '@/components/WizardStepHelp';
import { SetSummaryKPIs } from '@/components/live/SetSummaryKPIs';
import { WizardLegend } from '@/components/WizardLegend';
import { RecentPlays } from '@/components/RecentPlays';
import { SubstitutionModal } from '@/components/SubstitutionModal';
import { RallyTimeline } from '@/components/live/RallyTimeline';
import { ActionSelector } from '@/components/live/ActionSelector';
import { CompactActionSelector } from '@/components/live/CompactActionSelector';
import { ComboSetterAttack } from '@/components/live/ComboSetterAttack';
import { ActionEditor } from '@/components/live/ActionEditor';
import { PointFinisher } from '@/components/live/PointFinisher';
import { ColoredRatingButton } from '@/components/live/ColoredRatingButton';
import { PositionBadge } from '@/components/live/PositionBadge';
import { PlayerGrid } from '@/components/live/PlayerGrid';
import { QuickAttackBar } from '@/components/live/QuickAttackBar';
import { 
  Side, 
  Reason, 
  Player, 
  Rally, 
  Lineup,
  PassDestination, 
  KillType,
  RallyAction,
  RallyActionType 
} from '@/types/volleyball';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Wizard mode: 'fixed' uses S->R flow, 'modular' allows flexible action selection
type WizardMode = 'fixed' | 'modular';

interface PendingAction {
  type: RallyActionType;
  side: Side;
  // Temporary values while editing
  playerId: string | null;
  code: number | null;
  killType: KillType | null;
  setterId: string | null;
  passDestination: PassDestination | null;
  passCode: number | null;
  b1PlayerId: string | null;
  b2PlayerId: string | null;
  b3PlayerId: string | null;
  attackPassQuality: number | null;
  // Block result when a_code=1
  blockCode: number | null;
}

export default function Live() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { 
    match, rallies, lineups, matchPlayers, loading, loadMatch, getGameState, getServerPlayer, 
    saveRally, deleteLastRally, getPlayersForSide, getEffectivePlayers, 
    isSetComplete, getMatchStatus,
    getSubstitutionsForSet, getSubstitutionsUsed, getPlayersOnCourt, getPlayerZone, getPlayersOnBench, makeSubstitution, undoSubstitution,
    setFifthSetServe, needsFifthSetServeChoice
  } = useMatch(matchId || null);

  const [currentSet, setCurrentSet] = useState(1);
  const [detailedMode, setDetailedMode] = useState(false);
  const [subModalSide, setSubModalSide] = useState<Side | null>(null);
  const [showSet5ServeModal, setShowSet5ServeModal] = useState(false);
  
  // Modular wizard state (phases removed - always use phase 1)
  const [registeredActions, setRegisteredActions] = useState<RallyAction[]>([]);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [editingActionIndex, setEditingActionIndex] = useState<number | null>(null);
  
  // Combo D+A mode state
  const [comboMode, setComboMode] = useState<{ active: boolean; side: Side | null }>({ active: false, side: null });
  
  // UI Mode: compact (new fast UI) vs classic (old dropdown UI)
  const [useCompactUI, setUseCompactUI] = useState(true);
  
  // Delete confirmation modal state
  const [deleteTarget, setDeleteTarget] = useState<'set' | 'match' | null>(null);
  const [matchNameInput, setMatchNameInput] = useState('');
  
  // Last attacker for ultra-rapid mode
  const [lastAttacker, setLastAttacker] = useState<{
    playerId: string;
    playerNumber: number;
    playerName: string;
    side: Side;
  } | null>(null);
  
  // Team colors state
  const [teamColors, setTeamColors] = useState<{
    home: { primary?: string; secondary?: string };
    away: { primary?: string; secondary?: string };
  }>({ home: {}, away: {} });
  
  // Apply team colors via CSS variables
  useTeamColors({ homeColors: teamColors.home, awayColors: teamColors.away });
  
  // Fixed mode state for serve/reception
  const [serveCompleted, setServeCompleted] = useState(false);
  const [receptionCompleted, setReceptionCompleted] = useState(false);
  const [serveData, setServeData] = useState<{ playerId: string | null; code: number | null }>({ playerId: null, code: null });
  const [receptionData, setReceptionData] = useState<{ playerId: string | null; code: number | null }>({ playerId: null, code: null });
  
  // Load UI preference from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('live-compact-ui');
    if (saved !== null) setUseCompactUI(saved === 'true');
  }, []);

  // Save UI preference when it changes
  useEffect(() => {
    localStorage.setItem('live-compact-ui', String(useCompactUI));
  }, [useCompactUI]);
  
  // Cancel combo mode if switching to classic UI
  useEffect(() => {
    if (!useCompactUI && comboMode.active) {
      setComboMode({ active: false, side: null });
    }
  }, [useCompactUI, comboMode.active]);

  useEffect(() => {
    if (matchId) loadMatch();
  }, [matchId, loadMatch]);

  // Fetch team colors when match loads
  useEffect(() => {
    async function fetchTeamColors() {
      if (!match?.home_team_id && !match?.away_team_id) return;
      
      const promises = [];
      if (match.home_team_id) {
        promises.push(
          supabase
            .from('teams')
            .select('primary_color, secondary_color')
            .eq('id', match.home_team_id)
            .maybeSingle()
        );
      } else {
        promises.push(Promise.resolve({ data: null }));
      }
      
      if (match.away_team_id) {
        promises.push(
          supabase
            .from('teams')
            .select('primary_color, secondary_color')
            .eq('id', match.away_team_id)
            .maybeSingle()
        );
      } else {
        promises.push(Promise.resolve({ data: null }));
      }
      
      const [homeRes, awayRes] = await Promise.all(promises);
      
      setTeamColors({
        home: {
          primary: homeRes.data?.primary_color || undefined,
          secondary: homeRes.data?.secondary_color || undefined,
        },
        away: {
          primary: awayRes.data?.primary_color || undefined,
          secondary: awayRes.data?.secondary_color || undefined,
        },
      });
    }
    
    fetchTeamColors();
  }, [match?.home_team_id, match?.away_team_id]);

  useEffect(() => {
    if (currentSet === 5 && needsFifthSetServeChoice(5)) {
      setShowSet5ServeModal(true);
    }
  }, [currentSet, needsFifthSetServeChoice]);

  const handleSet5ServeChoice = async (side: Side) => {
    await setFifthSetServe(side);
    setShowSet5ServeModal(false);
    toast({
      title: 'Serviço definido',
      description: `${side === 'CASA' ? match?.home_name : match?.away_name} serve primeiro no 5º set`
    });
  };

  const gameState = getGameState(currentSet);
  const serverPlayer = gameState ? getServerPlayer(currentSet, gameState.serveSide, gameState.serveRot, gameState.currentRally) : null;

  // Auto-add serve action when rally starts
  useEffect(() => {
    if (serverPlayer && gameState && registeredActions.length === 0 && !serveCompleted) {
      const serveAction: RallyAction = {
        type: 'serve',
        side: gameState.serveSide,
        phase: 1,
        playerId: serverPlayer.id,
        playerNo: serverPlayer.jersey_number,
        code: null, // Code not yet defined
      };
      setRegisteredActions([serveAction]);
      setServeData({ playerId: serverPlayer.id, code: null });
    }
  }, [serverPlayer?.id, gameState?.serveSide, gameState?.currentRally]);

  const resetWizard = useCallback(() => {
    setRegisteredActions([]);
    setPendingAction(null);
    setEditingActionIndex(null);
    setComboMode({ active: false, side: null });
    setServeCompleted(false);
    setReceptionCompleted(false);
    setServeData({ playerId: serverPlayer?.id || null, code: null });
    setReceptionData({ playerId: null, code: null });
    // Don't reset lastAttacker - keep it for quick attacks across rallies
  }, [serverPlayer?.id]);
  
  // Reset lastAttacker when set changes
  useEffect(() => {
    setLastAttacker(null);
  }, [currentSet]);

  // Compute players currently on court for each side
  const servePlayers = gameState 
    ? getPlayersOnCourt(currentSet, gameState.serveSide, gameState.currentRally) 
    : [];
  
  // For reception, include players on court PLUS ALL Liberos from the team roster
  const recvPlayers = useMemo(() => {
    if (!gameState) return [];
    const onCourt = getPlayersOnCourt(currentSet, gameState.recvSide, gameState.currentRally);
    // Get ALL players from the receiving side to find Liberos
    const allTeamPlayers = getPlayersForSide(gameState.recvSide);
    // Filter for Liberos from the full roster
    const teamLiberos = allTeamPlayers.filter(p => 
      p.position?.toUpperCase() === 'L' || p.position?.toUpperCase() === 'LIBERO'
    );
    // Combine on court + liberos, removing duplicates by id
    const combined = [...onCourt];
    teamLiberos.forEach(libero => {
      if (!combined.some(p => p.id === libero.id)) {
        combined.push(libero);
      }
    });
    return combined;
  }, [gameState, currentSet, getPlayersOnCourt, getPlayersForSide]);

  // Calculate KPIs for current set (for WizardLegend insights)
  const previousSetRalliesForKPI = useMemo(() => 
    currentSet > 1 ? rallies.filter(r => r.set_no === currentSet - 1) : undefined,
    [rallies, currentSet]
  );
  const currentSetKPIs = useSetKPIs(rallies, currentSet, previousSetRalliesForKPI, matchPlayers);

  // Get players currently on court for a specific side
  const getPlayersForActionSide = (side: Side) => {
    if (!gameState) return [];
    return getPlayersOnCourt(currentSet, side, gameState.currentRally);
  };

  // Get players for an action type - includes liberos for reception, defense, setter, attack (NOT serve/block)
  const getPlayersForAction = (actionType: RallyActionType, side: Side): Player[] => {
    if (!gameState) return [];
    const onCourt = getPlayersOnCourt(currentSet, side, gameState.currentRally);
    
    // Serve and Block: only players on court (libero cannot serve or block)
    if (actionType === 'serve' || actionType === 'block') {
      return onCourt;
    }
    
    // Reception, Defense, Setter, Attack: include all liberos from the team
    const allTeamPlayers = getPlayersForSide(side);
    const teamLiberos = allTeamPlayers.filter(p => 
      p.position?.toUpperCase() === 'L' || p.position?.toUpperCase() === 'LIBERO'
    );
    
    // Combine on court + liberos, removing duplicates by id
    const combined = [...onCourt];
    teamLiberos.forEach(libero => {
      if (!combined.some(p => p.id === libero.id)) {
        combined.push(libero);
      }
    });
    return combined;
  };

  // Helper to get zone label for a player
  const getZoneLabel = (playerId: string, side: Side): string => {
    if (!gameState) return '';
    const rotation = side === gameState.serveSide ? gameState.serveRot : gameState.recvRot;
    const zone = getPlayerZone(currentSet, side, playerId, rotation, gameState.currentRally);
    return zone ? `Z${zone}` : '';
  };

  // Get the effective reception code for setter destination filtering
  const getEffectiveReceptionCode = (): number | null => {
    // First check reception data
    if (receptionData.code !== null) return receptionData.code;
    
    // Then check last defense action for quality
    const lastDefense = [...registeredActions]
      .filter(a => a.type === 'defense')
      .pop();
    if (lastDefense?.code !== null && lastDefense?.code !== undefined) {
      return lastDefense.code;
    }
    
    return null;
  };

  // Compute auto outcome based on registered actions and serve/reception
  const autoOutcome = useMemo((): { winner: Side; reason: Reason } | null => {
    if (!gameState) return null;
    const effectivePlayers = getEffectivePlayers();
    
    // Check serve outcomes
    if (serveData.code === 3) {
      return { winner: gameState.serveSide, reason: 'ACE' };
    }
    if (serveData.code === 0) {
      return { winner: gameState.recvSide, reason: 'SE' };
    }
    if (receptionData.code === 0) {
      return { winner: gameState.serveSide, reason: 'ACE' };
    }

    // Check registered actions for outcomes
    for (const action of registeredActions) {
      if (action.type === 'attack') {
        if (action.code === 3) {
          return { winner: action.side, reason: 'KILL' };
        }
        if (action.code === 0) {
          const oppSide: Side = action.side === 'CASA' ? 'FORA' : 'CASA';
          return { winner: oppSide, reason: 'AE' };
        }
        // a_code=1 (touched block) - check blockCode for outcome
        if (action.code === 1 && action.blockCode !== null && action.blockCode !== undefined) {
          const blockSide: Side = action.side === 'CASA' ? 'FORA' : 'CASA';
          if (action.blockCode === 3) {
            // Stuff block - point for blocker
            return { winner: blockSide, reason: 'BLK' };
          }
          if (action.blockCode === 0) {
            // Block fault - point for attacker
            return { winner: action.side, reason: 'OP' };
          }
          // blockCode 1 or 2 - rally continues (no outcome yet)
        }
      }
      if (action.type === 'block') {
        if (action.code === 3) {
          return { winner: action.side, reason: 'BLK' };
        }
        if (action.code === 0) {
          const oppSide: Side = action.side === 'CASA' ? 'FORA' : 'CASA';
          return { winner: oppSide, reason: 'OP' };
        }
      }
      if (action.type === 'defense' && action.code === 0) {
        // Defense failed - find the last attacker
        const lastAttack = [...registeredActions]
          .filter(a => a.type === 'attack')
          .pop();
        if (lastAttack) {
          return { winner: lastAttack.side, reason: 'KILL' };
        }
      }
    }
    
    return null;
  }, [gameState, serveData, receptionData, registeredActions, getEffectivePlayers]);

  // Handle serve code selection - upsert serve action and auto-completes
  const handleServeCodeSelect = (code: number) => {
    // Toggle off if same code clicked
    const newCode = serveData.code === code ? null : code;
    
    // Update serve data state
    setServeData(prev => ({ ...prev, code: newCode }));
    
    if (newCode !== null) {
      const serveAction: RallyAction = {
        type: 'serve',
        side: gameState!.serveSide,
        phase: 1,
        playerId: serveData.playerId,
        playerNo: serverPlayer?.jersey_number || null,
        code: newCode,
      };
      
      // Upsert: if serve exists, update; otherwise, add at beginning
      setRegisteredActions(prev => {
        const existingIndex = prev.findIndex(a => a.type === 'serve');
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = serveAction;
          return updated;
        }
        return [serveAction, ...prev];
      });
      
      setServeCompleted(true);
    } else {
      // If code deselected, remove the serve from timeline
      setRegisteredActions(prev => prev.filter(a => a.type !== 'serve'));
    }
  };

  // Handle reception code selection - auto-confirms like serve
  const handleReceptionCodeSelect = (code: number) => {
    // Toggle off if same code clicked
    const newCode = receptionData.code === code ? null : code;
    
    // Update reception data state
    setReceptionData(prev => ({ ...prev, code: newCode }));
    
    // Auto-complete when a code is selected - but require player selection
    if (newCode !== null) {
      // Require player to be selected before completing reception
      if (!receptionData.playerId) {
        toast({
          title: 'Seleciona o recetor',
          description: 'Escolhe o jogador que recebeu antes de definir o código',
          variant: 'destructive'
        });
        return;
      }
      
      const recAction: RallyAction = {
        type: 'reception',
        side: gameState!.recvSide,
        phase: 1,
        playerId: receptionData.playerId,
        code: newCode,
      };
      
      // Upsert: if reception already exists, replace it; otherwise add
      setRegisteredActions(prev => {
        const existingIndex = prev.findIndex(a => a.type === 'reception');
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = recAction;
          return updated;
        }
        return [...prev, recAction];
      });
      setReceptionCompleted(true);
    }
  };

  // Handle reception skip (continue without reception data)
  const handleReceptionSkip = () => {
    // Still register a reception action but with null values
    const recAction: RallyAction = {
      type: 'reception',
      side: gameState!.recvSide,
      phase: 1,
      playerId: null,
      code: null,
    };
    
    setRegisteredActions(prev => {
      const existingIndex = prev.findIndex(a => a.type === 'reception');
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = recAction;
        return updated;
      }
      return [...prev, recAction];
    });
    setReceptionCompleted(true);
  };

  // Handle action selection from ActionSelector (including reception edit)
  const handleSelectAction = (type: RallyActionType, side: Side) => {
    // Special handling for reception - if it exists, we'll edit it
    if (type === 'reception') {
      const existingReception = registeredActions.find(a => a.type === 'reception');
      if (existingReception) {
        // Pre-fill with existing data
        setReceptionData({ 
          playerId: existingReception.playerId || null, 
          code: existingReception.code ?? null 
        });
      }
      // Reset reception completed so the phase shows
      setReceptionCompleted(false);
      return;
    }
    
    setPendingAction({
      type,
      side,
      playerId: null,
      code: null,
      killType: null,
      setterId: null,
      passDestination: null,
      passCode: null,
      b1PlayerId: null,
      b2PlayerId: null,
      b3PlayerId: null,
      attackPassQuality: null,
      blockCode: null,
    });
  };

  // Handle combo D+A selection
  const handleSelectCombo = (side: Side) => {
    setComboMode({ active: true, side });
  };

  // Handle combo D+A completion
  const handleComboComplete = (setterAction: RallyAction, attackAction: RallyAction) => {
    setRegisteredActions(prev => [...prev, setterAction, attackAction]);
    setComboMode({ active: false, side: null });
  };

  // Cancel combo mode
  const handleComboCancel = () => {
    setComboMode({ active: false, side: null });
  };
  
  // Check if reception action exists but is incomplete (no player selected)
  const receptionAction = registeredActions.find(a => a.type === 'reception');
  const isReceptionIncomplete = receptionAction && !receptionAction.playerId;

  // Confirm pending action
  const handleConfirmAction = () => {
    if (!pendingAction) return;
    
    const effectivePlayers = getEffectivePlayers();
    const player = effectivePlayers.find(p => p.id === pendingAction.playerId);
    
    // Special handling for attack with a_code=1 (touched block) - create both attack and block actions
    if (pendingAction.type === 'attack' && pendingAction.code === 1 && pendingAction.blockCode !== null) {
      const blockSide: Side = pendingAction.side === 'CASA' ? 'FORA' : 'CASA';
      
      const attackAction: RallyAction = {
        type: 'attack',
        side: pendingAction.side,
        phase: 1,
        playerId: pendingAction.playerId,
        playerNo: player?.jersey_number || null,
        code: 1, // Touched block
        attackPassQuality: pendingAction.attackPassQuality,
        blockCode: pendingAction.blockCode,
      };
      
      const blockAction: RallyAction = {
        type: 'block',
        side: blockSide,
        phase: 1,
        playerId: null, // Blocker not identified in quick flow
        code: pendingAction.blockCode,
      };
      
      // Save last attacker for ultra-rapid mode
      if (pendingAction.playerId && player) {
        setLastAttacker({
          playerId: pendingAction.playerId,
          playerNumber: player.jersey_number,
          playerName: player.name,
          side: pendingAction.side,
        });
      }
      
      if (editingActionIndex !== null) {
        // When editing, replace attack and update/add block
        setRegisteredActions(prev => {
          const updated = [...prev];
          updated[editingActionIndex] = attackAction;
          // Find existing block or add new one
          const blockIdx = prev.findIndex(a => a.type === 'block');
          if (blockIdx >= 0) {
            updated[blockIdx] = blockAction;
          } else {
            updated.push(blockAction);
          }
          return updated;
        });
        setEditingActionIndex(null);
        setPendingAction(null);
        return;
      }
      
      setRegisteredActions(prev => [...prev, attackAction, blockAction]);
      setPendingAction(null);
      return;
    }
    
    const newAction: RallyAction = {
      type: pendingAction.type,
      side: pendingAction.side,
      phase: 1, // Always use phase 1 (phases removed)
      playerId: pendingAction.playerId,
      playerNo: player?.jersey_number || null,
      code: pendingAction.code,
      killType: pendingAction.killType,
      setterId: pendingAction.setterId,
      passDestination: pendingAction.passDestination,
      passCode: pendingAction.passCode,
      b1PlayerId: pendingAction.b1PlayerId,
      b2PlayerId: pendingAction.b2PlayerId,
      b3PlayerId: pendingAction.b3PlayerId,
      attackPassQuality: pendingAction.attackPassQuality,
    };
    
    // Save last attacker for ultra-rapid mode
    if (pendingAction.type === 'attack' && pendingAction.playerId && player) {
      setLastAttacker({
        playerId: pendingAction.playerId,
        playerNumber: player.jersey_number,
        playerName: player.name,
        side: pendingAction.side,
      });
    }
    
    // If editing an existing action, update it in place
    if (editingActionIndex !== null) {
      setRegisteredActions(prev => {
        const updated = [...prev];
        updated[editingActionIndex] = newAction;
        return updated;
      });
      setEditingActionIndex(null);
      setPendingAction(null);
      return;
    }
    
    setRegisteredActions(prev => [...prev, newAction]);
    setPendingAction(null);
  };

  // Quick attack using last attacker (ultra-rapid mode)
  const handleQuickAttack = (code: number) => {
    if (!lastAttacker || !gameState) return;
    
    // For kills (code 3), redirect to normal attack flow to select kill type
    if (code === 3) {
      handleSelectAction('attack', lastAttacker.side);
      // Pre-fill the player in pending action
      setTimeout(() => {
        setPendingAction(prev => prev ? {
          ...prev,
          playerId: lastAttacker.playerId,
        } : null);
      }, 0);
      return;
    }
    
    const effectivePlayers = getEffectivePlayers();
    const player = effectivePlayers.find(p => p.id === lastAttacker.playerId);
    if (!player) return;

    const attackAction: RallyAction = {
      type: 'attack',
      side: lastAttacker.side,
      phase: 1,
      playerId: lastAttacker.playerId,
      playerNo: player.jersey_number,
      code: code,
      killType: null, // Not applicable for codes 0, 1, 2
    };

    setRegisteredActions(prev => [...prev, attackAction]);
    
    // Feedback visual using the app's toast hook
    const codeLabel = code === 2 ? '+' : code === 1 ? '−' : '✕';
    toast({
      title: `Ataque #${player.jersey_number}: ${codeLabel}`,
      duration: 1500,
    });
  };

  // Change player for quick attack (revert to normal attack selection)
  const handleChangeQuickPlayer = () => {
    if (!lastAttacker) return;
    handleSelectAction('attack', lastAttacker.side);
  };

  // Cancel pending action
  const handleCancelAction = () => {
    setPendingAction(null);
    setEditingActionIndex(null);
  };

  // Edit action from timeline
  const handleEditAction = (index: number) => {
    const action = registeredActions[index];
    
    // Convert RallyAction to PendingAction for editing
    setPendingAction({
      type: action.type,
      side: action.side,
      playerId: action.playerId || null,
      code: action.code ?? null,
      killType: action.killType || null,
      setterId: action.setterId || null,
      passDestination: action.passDestination || null,
      passCode: action.passCode ?? null,
      b1PlayerId: action.b1PlayerId || null,
      b2PlayerId: action.b2PlayerId || null,
      b3PlayerId: action.b3PlayerId || null,
      attackPassQuality: action.attackPassQuality ?? null,
      blockCode: action.blockCode ?? null,
    });
    setEditingActionIndex(index);
  };

  // Navigate to previous action
  const handleNavigateToPrevAction = () => {
    if (editingActionIndex === null || editingActionIndex <= 0) return;
    
    // Save current action first
    if (pendingAction) {
      const effectivePlayers = getEffectivePlayers();
      const player = effectivePlayers.find(p => p.id === pendingAction.playerId);
      
      const updatedAction: RallyAction = {
        type: pendingAction.type,
        side: pendingAction.side,
        phase: 1,
        playerId: pendingAction.playerId,
        playerNo: player?.jersey_number || null,
        code: pendingAction.code,
        killType: pendingAction.killType,
        setterId: pendingAction.setterId,
        passDestination: pendingAction.passDestination,
        passCode: pendingAction.passCode,
        b1PlayerId: pendingAction.b1PlayerId,
        b2PlayerId: pendingAction.b2PlayerId,
        b3PlayerId: pendingAction.b3PlayerId,
        attackPassQuality: pendingAction.attackPassQuality,
      };
      
      setRegisteredActions(prev => {
        const updated = [...prev];
        updated[editingActionIndex] = updatedAction;
        return updated;
      });
    }
    
    // Navigate to previous
    const prevIndex = editingActionIndex - 1;
    const prevAction = registeredActions[prevIndex];
    setEditingActionIndex(prevIndex);
    setPendingAction({
      type: prevAction.type,
      side: prevAction.side,
      playerId: prevAction.playerId || null,
      code: prevAction.code ?? null,
      killType: prevAction.killType || null,
      setterId: prevAction.setterId || null,
      passDestination: prevAction.passDestination || null,
      passCode: prevAction.passCode ?? null,
      b1PlayerId: prevAction.b1PlayerId || null,
      b2PlayerId: prevAction.b2PlayerId || null,
      b3PlayerId: prevAction.b3PlayerId || null,
      attackPassQuality: prevAction.attackPassQuality ?? null,
      blockCode: prevAction.blockCode ?? null,
    });
  };

  // Navigate to next action
  const handleNavigateToNextAction = () => {
    if (editingActionIndex === null || editingActionIndex >= registeredActions.length - 1) return;
    
    // Save current action first
    if (pendingAction) {
      const effectivePlayers = getEffectivePlayers();
      const player = effectivePlayers.find(p => p.id === pendingAction.playerId);
      
      const updatedAction: RallyAction = {
        type: pendingAction.type,
        side: pendingAction.side,
        phase: 1,
        playerId: pendingAction.playerId,
        playerNo: player?.jersey_number || null,
        code: pendingAction.code,
        killType: pendingAction.killType,
        setterId: pendingAction.setterId,
        passDestination: pendingAction.passDestination,
        passCode: pendingAction.passCode,
        b1PlayerId: pendingAction.b1PlayerId,
        b2PlayerId: pendingAction.b2PlayerId,
        b3PlayerId: pendingAction.b3PlayerId,
        attackPassQuality: pendingAction.attackPassQuality,
      };
      
      setRegisteredActions(prev => {
        const updated = [...prev];
        updated[editingActionIndex] = updatedAction;
        return updated;
      });
    }
    
    // Navigate to next
    const nextIndex = editingActionIndex + 1;
    const nextAction = registeredActions[nextIndex];
    setEditingActionIndex(nextIndex);
    setPendingAction({
      type: nextAction.type,
      side: nextAction.side,
      playerId: nextAction.playerId || null,
      code: nextAction.code ?? null,
      killType: nextAction.killType || null,
      setterId: nextAction.setterId || null,
      passDestination: nextAction.passDestination || null,
      passCode: nextAction.passCode ?? null,
      b1PlayerId: nextAction.b1PlayerId || null,
      b2PlayerId: nextAction.b2PlayerId || null,
      b3PlayerId: nextAction.b3PlayerId || null,
      attackPassQuality: nextAction.attackPassQuality ?? null,
      blockCode: nextAction.blockCode ?? null,
    });
  };

  // Remove action from timeline
  const handleRemoveAction = (index: number) => {
    // Don't allow removing serve if reception is done
    const action = registeredActions[index];
    if (action.type === 'serve' && receptionCompleted) {
      toast({ title: 'Não pode remover o serviço após receção', variant: 'destructive' });
      return;
    }
    if (action.type === 'reception') {
      setReceptionCompleted(false);
      setReceptionData({ playerId: null, code: null });
    }
    if (action.type === 'serve') {
      setServeCompleted(false);
      setReceptionCompleted(false);
      setServeData({ playerId: serverPlayer?.id || null, code: null });
      setReceptionData({ playerId: null, code: null });
    }
    setRegisteredActions(prev => prev.filter((_, i) => i !== index));
  };

  // Undo last action from timeline
  const handleUndoAction = () => {
    if (registeredActions.length === 0) return;
    
    const lastAction = registeredActions[registeredActions.length - 1];
    
    // Reset state based on what's being undone
    if (lastAction.type === 'reception') {
      setReceptionCompleted(false);
      setReceptionData({ playerId: null, code: null });
    } else if (lastAction.type === 'serve') {
      setServeCompleted(false);
      setReceptionCompleted(false);
      setServeData({ playerId: serverPlayer?.id || null, code: null });
      setReceptionData({ playerId: null, code: null });
    }
    
    // Remove last action
    setRegisteredActions(prev => prev.slice(0, -1));
  };

  // Finish point
  const handleFinishPoint = async (winner: Side, reason: Reason) => {
    if (!gameState) return;
    
    const effectivePlayers = getEffectivePlayers();
    
    // Find relevant players from actions
    const serveAction = registeredActions.find(a => a.type === 'serve');
    const recAction = registeredActions.find(a => a.type === 'reception');
    const setterAction = registeredActions.find(a => a.type === 'setter');
    const attackAction = registeredActions.find(a => a.type === 'attack');
    const blockAction = registeredActions.find(a => a.type === 'block');
    const defenseAction = registeredActions.find(a => a.type === 'defense');
    
    // Get player numbers
    const getPlayerNo = (id: string | null | undefined) => {
      if (!id) return null;
      const player = effectivePlayers.find(p => p.id === id);
      return player?.jersey_number || null;
    };
    
    const rallyData: Partial<Rally> = {
      match_id: matchId,
      set_no: currentSet,
      rally_no: gameState.currentRally,
      phase: 1, // Always use phase 1 (phases removed)
      serve_side: gameState.serveSide,
      serve_rot: gameState.serveRot,
      recv_side: gameState.recvSide,
      recv_rot: gameState.recvRot,
      point_won_by: winner,
      reason: reason,
      // Serve - use serverPlayer.id as ultimate fallback to ensure s_player_id is always set
      s_player_id: serveAction?.playerId || serveData.playerId || serverPlayer?.id || null,
      s_no: getPlayerNo(serveAction?.playerId || serveData.playerId || serverPlayer?.id),
      s_code: serveAction?.code ?? serveData.code,
      // Reception
      r_player_id: recAction?.playerId || receptionData.playerId,
      r_no: getPlayerNo(recAction?.playerId || receptionData.playerId),
      r_code: recAction?.code ?? receptionData.code,
      // Setter
      setter_player_id: setterAction?.setterId || setterAction?.playerId || null,
      pass_destination: setterAction?.passDestination || null,
      pass_code: setterAction?.passCode || null,
      // Attack
      a_player_id: attackAction?.playerId || null,
      a_no: getPlayerNo(attackAction?.playerId),
      a_code: attackAction?.code ?? null,
      a_pass_quality: attackAction?.attackPassQuality ?? null,
      kill_type: attackAction?.code === 3 ? attackAction?.killType : null,
      // Block
      b1_player_id: blockAction?.b1PlayerId || blockAction?.playerId || null,
      b1_no: getPlayerNo(blockAction?.b1PlayerId || blockAction?.playerId),
      b2_player_id: blockAction?.b2PlayerId || null,
      b2_no: getPlayerNo(blockAction?.b2PlayerId),
      b3_player_id: blockAction?.b3PlayerId || null,
      b3_no: getPlayerNo(blockAction?.b3PlayerId),
      b_code: blockAction?.code ?? null,
      // Defense
      d_player_id: defenseAction?.playerId || null,
      d_no: getPlayerNo(defenseAction?.playerId),
      d_code: defenseAction?.code ?? null,
    };
    
    const success = await saveRally(rallyData);
    if (success) {
      toast({ title: 'Ponto registado' });
      resetWizard();
    }
  };

  const handleUndo = async () => {
    await deleteLastRally(currentSet);
    resetWizard();
  };

  // Determine current wizard stage
  const isServePhase = !serveCompleted;
  const isReceptionPhase = serveCompleted && !receptionCompleted && !autoOutcome;
  const isModularPhase = serveCompleted && receptionCompleted && !autoOutcome;
  const isTerminalServe = serveData.code === 3 || serveData.code === 0;
  const isTerminalReception = receptionData.code === 0;

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">A carregar...</div>;
  }

  if (!match) {
    return <div className="flex min-h-screen items-center justify-center">Jogo não encontrado</div>;
  }

  // Helper to check if lineup has all 6 positions filled
  const isLineupComplete = (lineup: Lineup | undefined): boolean => {
    if (!lineup) return false;
    return !!(lineup.rot1 && lineup.rot2 && lineup.rot3 && 
              lineup.rot4 && lineup.rot5 && lineup.rot6);
  };

  if (!gameState) {
    const homeLineup = lineups.find(l => l.set_no === currentSet && l.side === 'CASA');
    const awayLineup = lineups.find(l => l.set_no === currentSet && l.side === 'FORA');
    const missingLineups = !isLineupComplete(homeLineup) || !isLineupComplete(awayLineup);
    
    return (
      <div className="min-h-screen bg-background safe-bottom">
        <header className="sticky top-0 z-10 border-b bg-card px-4 py-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-sm font-semibold">{match.title}</h1>
            </div>
          </div>
        </header>
        
        <div className="flex flex-col items-center justify-center p-8 gap-6 min-h-[60vh]">
          <div className="flex gap-1 justify-center">
            {[1, 2, 3, 4, 5].map((set) => {
              const result = isSetComplete(set);
              const isPlayable = set === 1 || isSetComplete(set - 1).complete;
              const isCurrent = currentSet === set;
              
              return (
                <Button
                  key={set}
                  variant={isCurrent ? 'default' : result.complete ? 'secondary' : 'outline'}
                  size="sm"
                  disabled={!isPlayable && !result.complete}
                  onClick={() => { setCurrentSet(set); resetWizard(); }}
                  className="relative min-w-[48px]"
                >
                  {!isPlayable && !result.complete && <Lock className="h-3 w-3 mr-1" />}
                  S{set}
                  {result.complete && (
                    <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {missingLineups ? (
            <>
              <div className="text-center">
                <h2 className="text-xl font-semibold mb-2">Set {currentSet}</h2>
                <p className="text-muted-foreground">
                  É necessário configurar o lineup para este set.
                </p>
              </div>
              <Button onClick={() => navigate(`/setup/${matchId}?set=${currentSet}`)}>
                <Settings className="h-4 w-4 mr-2" />
                Configurar Lineup do Set {currentSet}
              </Button>
            </>
          ) : (
            <div className="text-center">
              <p className="text-muted-foreground">A carregar dados do set...</p>
            </div>
          )}
        </div>
      </div>
    );
  }
  
  // Delete set or match function
  const doDelete = async () => {
    if (!matchId) return;
    
    if (deleteTarget === 'set') {
      if (currentSet === null || currentSet === undefined) return;
      
      const { error } = await supabase.rpc('delete_set', { 
        p_match_id: matchId, 
        p_set_no: currentSet 
      });
      
      if (error) {
        toast({
          title: 'Erro ao apagar set',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({ title: `Set ${currentSet} apagado com sucesso` });
        window.location.reload();
      }
    } else if (deleteTarget === 'match') {
      // Extra safety check for match deletion
      if (matchNameInput !== match?.title) {
        toast({
          title: 'Nome do jogo incorreto',
          description: 'Por favor, digite o nome exato do jogo para confirmar.',
          variant: 'destructive'
        });
        return;
      }
      
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);
      
      if (error) {
        toast({
          title: 'Erro ao apagar jogo',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({ title: 'Jogo apagado com sucesso' });
        navigate('/');
      }
    }
    
    setDeleteTarget(null);
    setMatchNameInput('');
  };

  return (
    <div className="min-h-screen bg-background safe-bottom">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold">{match.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Detalhado</span>
            <Switch checked={detailedMode} onCheckedChange={setDetailedMode} />
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/setup/${matchId}`)}>
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate(`/stats/${matchId}`)}>
            <BarChart2 className="h-5 w-5" />
          </Button>
          
          {/* Delete Set Button */}
          <Button
            variant="ghost"
            size="icon"
            disabled={currentSet === null || currentSet === undefined}
            onClick={() => setDeleteTarget('set')}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
          
          {/* More Options Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem 
                onClick={() => setDeleteTarget('set')}
                disabled={currentSet === null || currentSet === undefined}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar Set {currentSet}
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setDeleteTarget('match')}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar Jogo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Set End Overlay */}
      {(() => {
        const setStatus = isSetComplete(currentSet);
        const matchStatus = getMatchStatus();
        
        // Get previous set rallies for delta calculation
        const previousSetRallies = currentSet > 1 
          ? rallies.filter(r => r.set_no === currentSet - 1)
          : undefined;
        
        if (setStatus.complete) {
          return (
            <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex flex-col items-center z-50 p-4 overflow-y-auto">
              <div className="text-center space-y-4 max-w-lg w-full py-6">
                <div className="flex justify-center">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Trophy className="h-8 w-8 text-primary" />
                  </div>
                </div>
                
                <h2 className="text-xl font-bold">Set {currentSet} Terminado!</h2>
                
                <div className="text-4xl font-bold flex items-center justify-center gap-3">
                  <span className={setStatus.winner === 'CASA' ? 'text-home' : 'text-muted-foreground'}>
                    {setStatus.homeScore}
                  </span>
                  <span className="text-muted-foreground text-2xl">-</span>
                  <span className={setStatus.winner === 'FORA' ? 'text-away' : 'text-muted-foreground'}>
                    {setStatus.awayScore}
                  </span>
                </div>
                
                <p className="text-base">
                  <span className={setStatus.winner === 'CASA' ? 'text-home font-semibold' : 'text-away font-semibold'}>
                    {setStatus.winner === 'CASA' ? match.home_name : match.away_name}
                  </span>
                  {' '}ganhou o set!
                </p>
                
                <div className="py-2 px-4 rounded-lg bg-muted/50 inline-block">
                  <div className="text-xs text-muted-foreground mb-1">Resultado por Sets</div>
                  <div className="text-2xl font-bold">
                    <span className={matchStatus.setsHome > matchStatus.setsAway ? 'text-home' : ''}>
                      {matchStatus.setsHome}
                    </span>
                    <span className="text-muted-foreground mx-2">-</span>
                    <span className={matchStatus.setsAway > matchStatus.setsHome ? 'text-away' : ''}>
                      {matchStatus.setsAway}
                    </span>
                  </div>
                </div>
                
                {/* KPI Dashboard */}
                <SetSummaryKPIs
                  rallies={rallies}
                  setNo={currentSet}
                  homeName={match.home_name}
                  awayName={match.away_name}
                  homeScore={setStatus.homeScore}
                  awayScore={setStatus.awayScore}
                  previousSetRallies={previousSetRallies}
                  players={matchPlayers}
                />
                
                {matchStatus.matchComplete ? (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-center gap-2 text-lg font-semibold text-primary">
                      <Trophy className="h-5 w-5" />
                      <span>
                        {matchStatus.matchWinner === 'CASA' ? match.home_name : match.away_name} vence o jogo!
                      </span>
                    </div>
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" size="lg" onClick={() => navigate('/')}>
                        <Home className="h-4 w-4 mr-2" />
                        Início
                      </Button>
                      <Button size="lg" onClick={() => navigate(`/stats/${matchId}`)}>
                        Ver Estatísticas
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-4 flex gap-3 justify-center">
                    <Button variant="outline" size="lg" onClick={() => navigate('/')}>
                      <Home className="h-4 w-4 mr-2" />
                      Início
                    </Button>
                    <Button size="lg" onClick={() => { setCurrentSet(currentSet + 1); resetWizard(); toast({ title: `Set ${currentSet + 1} iniciado` }); }}>
                      Iniciar Set {currentSet + 1}
                    </Button>
                  </div>
                )}
                
                {/* Legenda - também mostrada no ecrã de set terminado */}
                <div className="w-full max-w-lg mt-6">
                  <WizardLegend homeName={match.home_name} awayName={match.away_name} kpis={currentSetKPIs} />
                </div>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="p-4 space-y-4">
        {/* Set Selector */}
        <div className="flex gap-1 justify-center">
          {[1, 2, 3, 4, 5].map((set) => {
            const result = isSetComplete(set);
            const matchStatus = getMatchStatus();
            const isPlayable = set === 1 || isSetComplete(set - 1).complete;
            const isNeeded = !matchStatus.matchComplete || set <= matchStatus.setResults.filter(s => s.complete).length;
            const isCurrent = currentSet === set;
            
            if (!isNeeded && !result.complete) return null;
            
            return (
              <Button
                key={set}
                variant={isCurrent ? 'default' : result.complete ? 'secondary' : 'outline'}
                size="sm"
                disabled={!isPlayable}
                onClick={() => { setCurrentSet(set); resetWizard(); }}
                className="relative min-w-[48px]"
              >
                {!isPlayable && !result.complete && <Lock className="h-3 w-3 mr-1" />}
                S{set}
                {result.complete && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </Button>
            );
          })}
        </div>
        
        {/* UI Mode Toggle */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
            <Zap className={cn("h-4 w-4 transition-colors", useCompactUI ? "text-warning" : "text-muted-foreground")} />
            <Switch
              checked={useCompactUI}
              onCheckedChange={setUseCompactUI}
              className="h-5 w-9"
            />
            <span className="text-xs text-muted-foreground min-w-[52px]">
              {useCompactUI ? 'Rápida' : 'Clássica'}
            </span>
          </div>
        </div>

        {/* Match Sets Score */}
        {(() => {
          const matchStatus = getMatchStatus();
          return (
            <div className="text-center text-sm text-muted-foreground">
              Sets: <span className={matchStatus.setsHome > matchStatus.setsAway ? 'text-home font-semibold' : ''}>{matchStatus.setsHome}</span>
              {' - '}
              <span className={matchStatus.setsAway > matchStatus.setsHome ? 'text-away font-semibold' : ''}>{matchStatus.setsAway}</span>
            </div>
          );
        })()}

        {/* Score Display */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-stretch">
              {/* Home Team */}
              <div className="flex-1 bg-home/10 border-r border-home/20 p-4 text-center">
                <div className="text-sm font-semibold text-home">{match.home_name}</div>
                <div className="text-5xl font-bold text-home mt-1">{gameState.homeScore}</div>
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {(() => {
                    const homePlayers = getPlayersOnCourt(currentSet, 'CASA', gameState.currentRally);
                    const homeSubsForSet = getSubstitutionsForSet(currentSet, 'CASA');
                    
                    return homePlayers.map(player => {
                      const isLiberoIn = homeSubsForSet.some(
                        s => s.is_libero && s.player_in_id === player.id && s.rally_no <= gameState.currentRally
                      );
                      const isLibero = player.position === 'L' || isLiberoIn;
                      
                      return (
                        <Badge
                          key={player.id}
                          variant="secondary"
                          className={`text-xs ${isLibero ? 'bg-warning text-warning-foreground' : 'bg-home/20 text-home'}`}
                        >
                          #{player.jersey_number}
                          {isLibero && ' L'}
                        </Badge>
                      );
                    });
                  })()}
                </div>
              </div>
              
              {/* Divider */}
              <div className="flex flex-col items-center justify-center px-3 py-2 bg-muted/50">
                <div className="text-lg font-bold text-muted-foreground">—</div>
                <div className="text-[10px] text-muted-foreground text-center leading-tight mt-1">
                  <div>R{gameState.currentRally}</div>
                </div>
              </div>
              
              {/* Away Team */}
              <div className="flex-1 bg-away/10 border-l border-away/20 p-4 text-center">
                <div className="text-sm font-semibold text-away">{match.away_name}</div>
                <div className="text-5xl font-bold text-away mt-1">{gameState.awayScore}</div>
                <div className="flex flex-wrap gap-1 justify-center mt-2">
                  {(() => {
                    const awayPlayers = getPlayersOnCourt(currentSet, 'FORA', gameState.currentRally);
                    const awaySubsForSet = getSubstitutionsForSet(currentSet, 'FORA');
                    
                    return awayPlayers.map(player => {
                      const isLiberoIn = awaySubsForSet.some(
                        s => s.is_libero && s.player_in_id === player.id && s.rally_no <= gameState.currentRally
                      );
                      const isLibero = player.position === 'L' || isLiberoIn;
                      
                      return (
                        <Badge
                          key={player.id}
                          variant="secondary"
                          className={`text-xs ${isLibero ? 'bg-warning text-warning-foreground' : 'bg-away/20 text-away'}`}
                        >
                          #{player.jersey_number}
                          {isLibero && ' L'}
                        </Badge>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            
            {/* Server info bar */}
            <div className="px-4 py-2 bg-muted/30 text-center text-xs text-muted-foreground border-t">
              Serve: <span className={gameState.serveSide === 'CASA' ? 'text-home font-medium' : 'text-away font-medium'}>
                {gameState.serveSide === 'CASA' ? match.home_name : match.away_name}
              </span>
              {' '}(R{gameState.serveRot})
              {serverPlayer && <span className="font-medium"> • #{serverPlayer.jersey_number}</span>}
            </div>
          </CardContent>
        </Card>

        {/* Substitution Buttons & Cancel */}
        <div className="flex gap-2 items-center">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setSubModalSide('CASA')}
          >
            <Badge variant="secondary" className="bg-home/20 text-home">CASA</Badge>
            Subs ({getSubstitutionsUsed(currentSet, 'CASA')}/6)
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={() => setSubModalSide('FORA')}
          >
            <Badge variant="secondary" className="bg-away/20 text-away">FORA</Badge>
            Subs ({getSubstitutionsUsed(currentSet, 'FORA')}/6)
          </Button>
          
          {/* Cancel/Undo Button */}
          {(gameState.currentRally > 1 || registeredActions.length > 0) && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-destructive px-2">
                  <Undo2 className="h-3.5 w-3.5" />
                  {registeredActions.length > 0 ? 'Cancelar' : 'Anular'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {registeredActions.length > 0 ? 'Cancelar rally em curso?' : 'Anular último ponto?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {registeredActions.length > 0 
                      ? 'Esta ação vai apagar todas as ações deste rally e voltar ao início.'
                      : 'Esta ação vai apagar o último ponto registado.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Não</AlertDialogCancel>
                  <AlertDialogAction onClick={registeredActions.length > 0 ? resetWizard : handleUndo}>
                    Sim, {registeredActions.length > 0 ? 'cancelar' : 'anular'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Recent plays summary */}
        <RecentPlays 
          rallies={rallies} 
          players={getEffectivePlayers()} 
          homeName={match.home_name} 
          awayName={match.away_name}
          currentSet={currentSet}
        />

        {/* Rally Timeline - always show when there are actions */}
        <RallyTimeline
          actions={registeredActions}
          players={getEffectivePlayers()}
          onRemoveAction={handleRemoveAction}
          onReorderActions={setRegisteredActions}
          onUndo={handleUndoAction}
          onEditAction={handleEditAction}
          editingIndex={editingActionIndex}
          homeName={match.home_name}
          awayName={match.away_name}
        />

        {/* Wizard Content */}
        <div className="space-y-3">
          {/* SERVE PHASE */}
          {isServePhase && (
            <Card className={cn(
              "border-l-4 overflow-hidden",
              gameState.serveSide === 'CASA' ? 'border-l-home' : 'border-l-away'
            )}>
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 text-white",
                gameState.serveSide === 'CASA' ? 'bg-home' : 'bg-away'
              )}>
                <span className="font-semibold">Serviço</span>
                <div className="flex-1" />
                <span className="text-xs opacity-80">
                  {gameState.serveSide === 'CASA' ? match.home_name : match.away_name}
                </span>
              </div>
              <CardContent className="p-4 space-y-3">
                {/* Server info - read only, auto-selected */}
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-md">
                  <span className="text-sm text-muted-foreground">Servidor:</span>
                  <span className="font-medium">
                    {serverPlayer ? `#${serverPlayer.jersey_number} ${serverPlayer.name}` : 'A carregar...'}
                  </span>
                </div>
                
                {/* Code selection - clicking auto-confirms */}
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((code) => (
                    <ColoredRatingButton
                      key={code}
                      code={code}
                      selected={serveData.code === code}
                      onClick={() => handleServeCodeSelect(code)}
                    />
                  ))}
                </div>
                
                {/* Navigation footer - no back button for serve (first step) */}
                <div className="flex justify-end pt-3 border-t mt-3">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="gap-1 text-muted-foreground hover:text-foreground" 
                    onClick={() => setServeCompleted(true)}
                  >
                    Avançar
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* RECEPTION PHASE */}
          {isReceptionPhase && (
            <Card className={cn(
              "border-l-4 overflow-hidden",
              gameState.recvSide === 'CASA' ? 'border-l-home' : 'border-l-away'
            )}>
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 text-white",
                gameState.recvSide === 'CASA' ? 'bg-home' : 'bg-away'
              )}>
                <span className="font-semibold">Receção</span>
                <span className="text-xs opacity-80">(opcional)</span>
                <div className="flex-1" />
                <span className="text-xs opacity-80">
                  {gameState.recvSide === 'CASA' ? match.home_name : match.away_name}
                </span>
              </div>
              <CardContent className="p-4 space-y-3">
                {recvPlayers.length === 0 ? (
                  <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm text-destructive">
                      Sem jogadores disponíveis — verifique o lineup/substituições
                    </span>
                  </div>
                ) : (
                  <PlayerGrid
                    players={recvPlayers}
                    selectedPlayer={receptionData.playerId}
                    onSelect={(id) => setReceptionData(prev => ({ ...prev, playerId: id }))}
                    onDeselect={() => setReceptionData(prev => ({ ...prev, playerId: null }))}
                    side={gameState.recvSide}
                    getZoneLabel={(id) => getZoneLabel(id, gameState.recvSide)}
                    columns={6}
                    size="sm"
                  />
                )}
                {/* Code selection - clicking auto-confirms */}
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map((code) => (
                    <ColoredRatingButton
                      key={code}
                      code={code}
                      selected={receptionData.code === code}
                      onClick={() => handleReceptionCodeSelect(code)}
                    />
                  ))}
                </div>
                
                {/* Navigation footer - consistent with all phases */}
                <div className="flex justify-between pt-3 border-t mt-3">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="gap-1 text-muted-foreground hover:text-foreground" 
                    onClick={() => setServeCompleted(false)}
                  >
                    <ChevronLeft className="h-3 w-3" />
                    Voltar
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="gap-1 text-muted-foreground hover:text-foreground" 
                    onClick={handleReceptionSkip}
                  >
                    Avançar
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* QUICK ATTACK BAR - Ultra-Rapid Mode (only in compact UI) */}
          {isModularPhase && !pendingAction && !comboMode.active && useCompactUI && lastAttacker && (
            <QuickAttackBar
              lastAttacker={lastAttacker}
              onQuickAttack={handleQuickAttack}
              onChangePlayer={handleChangeQuickPlayer}
              teamColor={lastAttacker.side === 'CASA' ? 'home' : 'away'}
            />
          )}

          {/* MODULAR PHASE - Action Selector (Compact or Classic based on useCompactUI) */}
          {isModularPhase && !pendingAction && !comboMode.active && (
            useCompactUI ? (
              <CompactActionSelector
                actions={registeredActions}
                serveSide={gameState.serveSide}
                recvSide={gameState.recvSide}
                homeName={match.home_name}
                awayName={match.away_name}
                onSelectAction={handleSelectAction}
                onSelectCombo={handleSelectCombo}
                showReceptionOption={isReceptionIncomplete}
              />
            ) : (
              <ActionSelector
                actions={registeredActions}
                serveSide={gameState.serveSide}
                recvSide={gameState.recvSide}
                homeName={match.home_name}
                awayName={match.away_name}
                onSelectAction={handleSelectAction}
                showReceptionOption={isReceptionIncomplete}
              />
            )
          )}

          {/* COMBO D+A Mode (only in compact UI) */}
          {isModularPhase && comboMode.active && comboMode.side && useCompactUI && (
            <ComboSetterAttack
              players={getPlayersForAction('attack', comboMode.side)}
              side={comboMode.side}
              homeName={match.home_name}
              awayName={match.away_name}
              getZoneLabel={getZoneLabel}
              receptionCode={getEffectiveReceptionCode()}
              onComplete={handleComboComplete}
              onCancel={handleComboCancel}
            />
          )}

          {/* MODULAR PHASE - Action Editor (also shows when editing existing action) */}
          {((isModularPhase && pendingAction) || (editingActionIndex !== null && pendingAction)) && (
            <ActionEditor
              actionType={pendingAction.type}
              side={pendingAction.side}
              players={getPlayersForAction(pendingAction.type, pendingAction.side)}
              homeName={match.home_name}
              awayName={match.away_name}
              selectedPlayer={pendingAction.playerId}
              selectedCode={pendingAction.code}
              selectedKillType={pendingAction.killType}
              selectedSetter={pendingAction.setterId}
              selectedDestination={pendingAction.passDestination}
              selectedPassCode={pendingAction.passCode}
              selectedBlocker1={pendingAction.b1PlayerId}
              selectedBlocker2={pendingAction.b2PlayerId}
              selectedBlocker3={pendingAction.b3PlayerId}
              selectedBlockCode={pendingAction.blockCode}
              receptionCode={getEffectiveReceptionCode()}
              attackPassQuality={pendingAction.attackPassQuality}
              getZoneLabel={getZoneLabel}
              onPlayerChange={(id) => setPendingAction(prev => prev ? { ...prev, playerId: id } : null)}
              onCodeChange={(code) => setPendingAction(prev => prev ? { ...prev, code } : null)}
              onKillTypeChange={(type) => setPendingAction(prev => prev ? { ...prev, killType: type } : null)}
              onSetterChange={(id) => setPendingAction(prev => prev ? { ...prev, setterId: id } : null)}
              onDestinationChange={(dest) => setPendingAction(prev => prev ? { ...prev, passDestination: dest } : null)}
              onPassCodeChange={(code) => setPendingAction(prev => prev ? { ...prev, passCode: code } : null)}
              onBlocker1Change={(id) => setPendingAction(prev => prev ? { ...prev, b1PlayerId: id } : null)}
              onBlocker2Change={(id) => setPendingAction(prev => prev ? { ...prev, b2PlayerId: id } : null)}
              onBlocker3Change={(id) => setPendingAction(prev => prev ? { ...prev, b3PlayerId: id } : null)}
              onBlockCodeChange={(code) => setPendingAction(prev => prev ? { ...prev, blockCode: code } : null)}
              onAttackPassQualityChange={(quality) => setPendingAction(prev => prev ? { ...prev, attackPassQuality: quality } : null)}
              onConfirm={handleConfirmAction}
              onCancel={handleCancelAction}
              currentActionIndex={editingActionIndex ?? undefined}
              totalActions={registeredActions.length}
              onNavigatePrev={handleNavigateToPrevAction}
              onNavigateNext={handleNavigateToNextAction}
              isEditingExisting={editingActionIndex !== null}
            />
          )}

          {/* Point Finisher - Show when we have an outcome or in modular phase */}
          {(autoOutcome || (isModularPhase && !pendingAction && !comboMode.active && registeredActions.length > 0)) && (
            <PointFinisher
              actions={registeredActions}
              homeName={match.home_name}
              awayName={match.away_name}
              onFinishPoint={handleFinishPoint}
              suggestedOutcome={autoOutcome}
            />
          )}
        </div>

        {/* Legend for new users */}
        <WizardLegend homeName={match.home_name} awayName={match.away_name} kpis={currentSetKPIs} />
      </div>

      {/* Substitution Modal */}
      {subModalSide && gameState && (
        <SubstitutionModal
          open={!!subModalSide}
          onClose={() => setSubModalSide(null)}
          side={subModalSide}
          sideName={subModalSide === 'CASA' ? match.home_name : match.away_name}
          playersOnCourt={getPlayersOnCourt(currentSet, subModalSide, gameState.currentRally)}
          playersOnBench={getPlayersOnBench(currentSet, subModalSide, gameState.currentRally)}
          substitutionsUsed={getSubstitutionsUsed(currentSet, subModalSide)}
          maxSubstitutions={6}
          onSubstitute={async (playerOutId, playerInId, isLibero) => {
            await makeSubstitution(currentSet, subModalSide, gameState.currentRally, playerOutId, playerInId, isLibero);
          }}
          recentSubstitutions={getSubstitutionsForSet(currentSet, subModalSide)}
          onUndoSubstitution={undoSubstitution}
        />
      )}

      {/* 5th Set Serve Choice Modal */}
      <AlertDialog open={showSet5ServeModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-center text-xl">🏐 Sorteio do 5º Set</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Qual equipa ganhou o sorteio e vai servir primeiro no tie-break?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-4 justify-center py-4">
            <Button 
              className="flex-1 h-16 text-lg bg-blue-600 hover:bg-blue-700"
              onClick={() => handleSet5ServeChoice('CASA')}
            >
              {match?.home_name}
            </Button>
            <Button 
              className="flex-1 h-16 text-lg bg-orange-600 hover:bg-orange-700"
              onClick={() => handleSet5ServeChoice('FORA')}
            >
              {match?.away_name}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Delete Confirmation Modal */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setMatchNameInput(''); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget === 'set' ? `Apagar Set ${currentSet}?` : 'Apagar Jogo?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget === 'set' 
                ? `Esta ação é irreversível. Todos os rallies, substituições e lineup do Set ${currentSet} serão permanentemente apagados.`
                : `Esta ação é irreversível. Digite o nome do jogo "${match?.title}" para confirmar.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteTarget === 'match' && (
            <Input
              placeholder={`Digite "${match?.title}"`}
              value={matchNameInput}
              onChange={(e) => setMatchNameInput(e.target.value)}
              className="mt-2"
            />
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={doDelete}
              disabled={deleteTarget === 'match' && matchNameInput !== match?.title}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Apagar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
