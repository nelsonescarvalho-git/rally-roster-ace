import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { X, CircleDot, Shield, Target, Swords, Square, ShieldCheck, GripVertical } from 'lucide-react';
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

const CODE_EMOJI: Record<number, string> = {
  0: '✕',
  1: '−',
  2: '+',
  3: '★',
};

interface SortableActionProps {
  action: RallyAction;
  index: number;
  id: string;
  players: Player[];
  onRemove: (index: number) => void;
}

function SortableAction({ action, index, id, players, onRemove }: SortableActionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'touch-none',
        isDragging && 'z-50'
      )}
    >
      <Badge
        variant="outline"
        className={cn(
          'cursor-grab active:cursor-grabbing transition-all group relative pr-5 select-none',
          isHome ? 'border-home/50 bg-home/10' : 'border-away/50 bg-away/10',
          isDragging && 'opacity-80 shadow-lg scale-105 ring-2 ring-primary/50'
        )}
        {...attributes}
        {...listeners}
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
  homeName, 
  awayName 
}: RallyTimelineProps) {
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = actionIds.indexOf(active.id as string);
      const newIndex = actionIds.indexOf(over.id as string);
      
      const reorderedActions = arrayMove(actions, oldIndex, newIndex);
      onReorderActions(reorderedActions);
    }
  };

  return (
    <div className="p-3 bg-muted/30 rounded-lg space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-medium text-muted-foreground">
          Ações Registadas ({actions.length})
        </div>
        <div className="text-[10px] text-muted-foreground">
          Arraste para reordenar
        </div>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
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
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
