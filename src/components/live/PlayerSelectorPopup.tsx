import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Player, MatchPlayer } from '@/types/volleyball';

interface PlayerSelectorPopupProps {
  open: boolean;
  onClose: () => void;
  onSelectPlayer: (player: Player | MatchPlayer) => void;
  playersOnCourt: (Player | MatchPlayer)[];
  playersOnBench: (Player | MatchPlayer)[];
  teamColor?: string;
  title?: string;
}

const POSITION_FILTERS = ['S', 'OH', 'MB', 'OP', 'L'];

export function PlayerSelectorPopup({
  open,
  onClose,
  onSelectPlayer,
  playersOnCourt,
  playersOnBench,
  teamColor,
  title = 'Selecionar Jogador',
}: PlayerSelectorPopupProps) {
  const [search, setSearch] = useState('');
  const [filterPos, setFilterPos] = useState<string | null>(null);

  const filterPlayers = (players: (Player | MatchPlayer)[]) => {
    return players.filter(p => {
      // Search filter
      const matchesSearch = !search || 
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.jersey_number.toString().includes(search);
      
      // Position filter
      const matchesPos = !filterPos || 
        (p.position?.toUpperCase().includes(filterPos));
      
      return matchesSearch && matchesPos;
    });
  };

  const filteredCourt = useMemo(() => filterPlayers(playersOnCourt), [playersOnCourt, search, filterPos]);
  const filteredBench = useMemo(() => filterPlayers(playersOnBench), [playersOnBench, search, filterPos]);

  const handleSelect = (player: Player | MatchPlayer) => {
    onSelectPlayer(player);
    setSearch('');
    setFilterPos(null);
    onClose();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSearch('');
      setFilterPos(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <Input
          placeholder="Pesquisar por nome ou #..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-2"
        />

        {/* Position chips */}
        <div className="flex gap-1 flex-wrap mb-3">
          {POSITION_FILTERS.map(pos => (
            <Badge
              key={pos}
              variant={filterPos === pos ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilterPos(filterPos === pos ? null : pos)}
            >
              {pos}
            </Badge>
          ))}
          {filterPos && (
            <Badge
              variant="secondary"
              className="cursor-pointer"
              onClick={() => setFilterPos(null)}
            >
              Limpar
            </Badge>
          )}
        </div>

        {/* Tabs: Em Campo / Banco */}
        <Tabs defaultValue="court" className="flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="court">Em Campo ({filteredCourt.length})</TabsTrigger>
            <TabsTrigger value="bench">Banco ({filteredBench.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="court" className="flex-1 mt-3">
            <div className="grid grid-cols-3 gap-2">
              {filteredCourt.map(player => (
                <Button
                  key={player.id}
                  variant="outline"
                  className={cn(
                    "h-auto py-3 flex flex-col items-center hover:ring-2",
                    teamColor && `hover:ring-[${teamColor}]`
                  )}
                  style={{ borderColor: teamColor }}
                  onClick={() => handleSelect(player)}
                >
                  <span className="text-xl font-bold">#{player.jersey_number}</span>
                  <span className="text-xs truncate max-w-full">{player.name}</span>
                  {player.position && (
                    <Badge variant="secondary" className="text-[10px] mt-1">
                      {player.position}
                    </Badge>
                  )}
                </Button>
              ))}
              {filteredCourt.length === 0 && (
                <div className="col-span-3 text-center text-muted-foreground py-4">
                  Nenhum jogador encontrado
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="bench" className="flex-1 mt-3 min-h-0">
            <ScrollArea className="h-[200px]">
              <div className="space-y-2 pr-4">
                {filteredBench.map(player => (
                  <Button
                    key={player.id}
                    variant="outline"
                    className="w-full justify-start gap-3 h-auto py-2"
                    style={{ borderColor: teamColor }}
                    onClick={() => handleSelect(player)}
                  >
                    <span className="text-lg font-bold min-w-[40px]">#{player.jersey_number}</span>
                    <span className="flex-1 text-left truncate">{player.name}</span>
                    {player.position && (
                      <Badge variant="secondary" className="text-[10px]">
                        {player.position}
                      </Badge>
                    )}
                  </Button>
                ))}
                {filteredBench.length === 0 && (
                  <div className="text-center text-muted-foreground py-4">
                    Nenhum jogador no banco
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
