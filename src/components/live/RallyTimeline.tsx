import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, CircleDot, Shield, Target, Swords, Square, ShieldCheck, GripVertical, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RallyAction, RallyActionType, Player } from '@/types/volleyball';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface RallyTimelineProps {
  actions: RallyAction[];
  players: Player[];
  onRemoveAction: (index: number) => void;
  onReorderActions: (actions: RallyAction[]) => void;
  onUndo: () => void;
  onEditAction?: (index: number) => void;
  editingIndex?: number | null;
  homeName: string;
  awayName: string;
}

const ACTION_CONFIG: Record<RallyActionType, { 
  icon: React.ElementType; 
  label: string; 
  shortLabel: string;
  color: string;
}> = {
  serve: { icon: CircleDot, label: 'Serviço', shortLabel: 'S', color: 'bg-primary' },
  reception: { icon: Shield, label: 'Receção', shortLabel: 'R', color: 'bg-success' },
  setter: { icon: Target, label: 'Distribuição', shortLabel: 'D', color: 'bg-[hsl(280,68%,50%)]' },
  attack: { icon: Swords, label: 'Ataque', shortLabel: 'A', color: 'bg-destructive' },
  block: { icon: Square, label: 'Bloco', shortLabel: 'B', color: 'bg-warning' },
  defense: { icon: ShieldCheck, label: 'Defesa', shortLabel: 'Df', color: 'bg-accent' },
};

// Check if destination is missing for attack validation
const hasDestinationMissing = (actions: RallyAction[]) => {
  const attackAction = actions.find(a => a.type === 'attack');
  if (!attackAction) return false;
  
  const setterAction = actions.find(a => a.type === 'setter' && a.side === attackAction.side);
  // Attack exists but no setter destination for the same side
  return setterAction && !setterAction.passDestination;
};

const CODE_EMOJI: Record<number, string> = {
  0: '✕',
  1: '−',
  2: '+',
  3: '★',
};

interface ActionBadgeProps {
  action: RallyAction;
  players: Player[];
  isDragOverlay?: boolean;
  onRemove?: () => void;
}

function ActionBadge({ action, players, isDragOverlay, onRemove }: ActionBadgeProps) {
  const config = ACTION_CONFIG[action.type];
  const isHome = action.side === 'CASA';

  const getPlayerDisplay = () => {
    if (action.playerNo) {
      return `#${action.playerNo}`;
    }
    if (action.playerId) {
      const player = players.find(p => p.id === action.playerId);
      return player ? `#${player.jersey_number}` : '';
    }
    return '';
  };

  const getCodeDisplay = (code: number | null | undefined) => {
    if (code === null || code === undefined) return '';
    return CODE_EMOJI[code] || code.toString();
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'cursor-grab active:cursor-grabbing group relative pr-5 select-none',
        isHome ? 'border-home/50 bg-home/10' : 'border-away/50 bg-away/10',
        isDragOverlay && 'shadow-xl scale-105 ring-2 ring-primary/50 animate-scale-in'
      )}
    >
      <GripVertical className="h-3 w-3 mr-0.5 opacity-40 group-hover:opacity-70" />
      <span className={cn(
        'w-4 h-4 rounded-full flex items-center justify-center mr-1 text-[10px] text-white',
        config.color
      )}>
        {config.shortLabel}
      </span>
      <span className="font-medium">{getPlayerDisplay()}</span>
      {action.code !== null && action.code !== undefined && (
        <span className="ml-0.5 opacity-75">
          ({getCodeDisplay(action.code)})
        </span>
      )}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </Badge>
  );
}

interface SortableActionProps {
  action: RallyAction;
  index: number;
  id: string;
  players: Player[];
  onRemove: (index: number) => void;
  onEdit?: (index: number) => void;
  isDragging: boolean;
  isEditing?: boolean;
}

function SortableAction({ action, index, id, players, onRemove, onEdit, isDragging, isEditing }: SortableActionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isThisDragging,
  } = useSortable({ 
    id,
    transition: {
      duration: 250,
      easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const config = ACTION_CONFIG[action.type];
  const isHome = action.side === 'CASA';

  const getPlayerDisplay = () => {
    if (action.playerNo) {
      return `#${action.playerNo}`;
    }
    if (action.playerId) {
      const player = players.find(p => p.id === action.playerId);
      return player ? `#${player.jersey_number}` : '';
    }
    return '';
  };

  const getCodeDisplay = (code: number | null | undefined) => {
    if (code === null || code === undefined) return '';
    return CODE_EMOJI[code] || code.toString();
  };

  const handleClick = (e: React.MouseEvent) => {
    // Only trigger edit if not dragging and there's an edit handler
    if (!isDragging && onEdit) {
      e.stopPropagation();
      onEdit(index);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none transition-all duration-200',
        isThisDragging && 'opacity-40 scale-95'
      )}
      {...attributes}
      {...listeners}
    >
      <Badge
        variant="outline"
        onClick={handleClick}
        className={cn(
          'cursor-grab active:cursor-grabbing group relative pr-5 select-none transition-all duration-200',
          isHome ? 'border-home/50 bg-home/10' : 'border-away/50 bg-away/10',
          isDragging && !isThisDragging && 'hover:scale-105',
          isEditing && 'ring-2 ring-primary ring-offset-1',
          onEdit && !isDragging && 'cursor-pointer hover:ring-2 hover:ring-primary/50'
        )}
      >
        <GripVertical className="h-3 w-3 mr-0.5 opacity-40 group-hover:opacity-70 transition-opacity" />
        <span className={cn(
          'w-4 h-4 rounded-full flex items-center justify-center mr-1 text-[10px] text-white',
          config.color
        )}>
          {config.shortLabel}
        </span>
        <span className="font-medium">{getPlayerDisplay()}</span>
        {action.code !== null && action.code !== undefined && (
          <span className="ml-0.5 opacity-75">
            ({getCodeDisplay(action.code)})
          </span>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
        >
          <X className="h-3 w-3" />
        </button>
      </Badge>
    </div>
  );
}

export function RallyTimeline({ 
  actions, 
  players,
  onRemoveAction,
  onReorderActions,
  onUndo,
  onEditAction,
  editingIndex,
  homeName, 
  awayName 
}: RallyTimelineProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (actions.length === 0) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg text-center text-sm text-muted-foreground">
        Sem ações registadas
      </div>
    );
  }

  // Generate unique IDs for each action
  const actionIds = actions.map((_, index) => `action-${index}`);
  
  const activeIndex = activeId ? actionIds.indexOf(activeId) : -1;
  const activeAction = activeIndex >= 0 ? actions[activeIndex] : null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = actionIds.indexOf(active.id as string);
      const newIndex = actionIds.indexOf(over.id as string);
      
      const reorderedActions = arrayMove(actions, oldIndex, newIndex);
      onReorderActions(reorderedActions);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-muted-foreground">
          Ações Registadas ({actions.length})
        </div>
        <div className="flex items-center gap-2">
          {hasDestinationMissing(actions) && (
            <Badge variant="outline" className="text-[10px] border-warning text-warning">
              ⚠️ Destino em falta
            </Badge>
          )}
          <div className="text-[10px] text-muted-foreground">
            Arraste para reordenar
          </div>
          <Button
            variant="ghost"
            size="sm"
            disabled={actions.length === 0}
            onClick={onUndo}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Undo2 className="h-3 w-3 mr-1" />
            Undo
          </Button>
        </div>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={actionIds} strategy={horizontalListSortingStrategy}>
          <div className="flex flex-wrap gap-1.5">
            {actions.map((action, index) => (
              <SortableAction
                key={actionIds[index]}
                id={actionIds[index]}
                action={action}
                index={index}
                players={players}
                onRemove={onRemoveAction}
                onEdit={onEditAction}
                isDragging={!!activeId}
                isEditing={editingIndex === index}
              />
            ))}
          </div>
        </SortableContext>
        
        {/* Drag overlay for smooth animation */}
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}>
          {activeAction ? (
            <ActionBadge
              action={activeAction}
              players={players}
              isDragOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
