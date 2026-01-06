import React, { useState } from 'react';
import { useCombat, CombatParticipant } from '@/hooks/useCombat';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  SkipBack, 
  SkipForward, 
  Sword, 
  Skull, 
  X, 
  Plus, 
  Trash2,
  RefreshCw,
  ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface InitiativeTrackerProps {
  campaignId: string;
  mapId?: string;
  isDm?: boolean;
  className?: string;
}

export function InitiativeTracker({ campaignId, mapId, isDm = false, className }: InitiativeTrackerProps) {
  const { 
    activeEncounter, 
    participants, 
    loading, 
    startEncounter, 
    endEncounter, 
    nextTurn, 
    prevTurn,
    updateParticipant,
    removeParticipant,
    updateToken
  } = useCombat(campaignId, mapId);

  const [newEncounterName, setNewEncounterName] = useState('');

  if (loading) {
    return (
      <Card className={cn("w-full h-full flex items-center justify-center", className)}>
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  if (!activeEncounter) {
    if (!isDm) {
      return (
        <Card className={cn("w-full", className)}>
          <CardHeader>
            <CardTitle className="text-lg">Combat</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No active combat encounter.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <CardTitle className="text-lg">Start Combat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input 
            placeholder="Encounter Name (e.g. 'Goblin Ambush')" 
            value={newEncounterName}
            onChange={(e) => setNewEncounterName(e.target.value)}
          />
          <Button 
            className="w-full" 
            onClick={() => mapId && startEncounter(newEncounterName || 'New Encounter', mapId)}
            disabled={!mapId}
          >
            <Sword className="mr-2 h-4 w-4" />
            Begin Encounter
          </Button>
          {!mapId && <p className="text-xs text-destructive">Map required to start combat.</p>}
        </CardContent>
      </Card>
    );
  }

  // Sort participants by turn order for display
  const sortedParticipants = [...participants].sort((a, b) => a.turn_order - b.turn_order);
  const currentTurnId = sortedParticipants[activeEncounter.current_turn_index]?.id;

  const handleInitiativeChange = (id: string, value: string) => {
    const num = parseInt(value);
    if (!isNaN(num)) {
      updateParticipant(id, { initiative_roll: num });
    }
  };

  const handleHpChange = (id: string, current: number, change: number, max: number) => {
    const newHp = Math.min(Math.max(0, current + change), max);
    // Note: This updates the participant. But usually HP is on the token.
    // However, our useCombat updates combat_participants.
    // If HP is stored on the token, we should update the token table.
    // The participant just links to token.
    // Update: useCombat `updateParticipant` updates `combat_participants` table.
    // If we want to update HP, we might need a separate function to update the token.
    // For now, let's assume we can't update HP here directly unless we add a method to update token from useCombat.
    // Actually, let's verify if combat_participants has HP or if it's just on token.
    // Schema says `tokens` has hp_current/hp_max. `combat_participants` does NOT.
    // So we need to update the token.
    // I should add `updateToken` to useCombat or import a useToken hook.
    // For now, I'll disable HP editing here or mark it as TODO.
  };

  return (
    <Card className={cn("w-full flex flex-col", className)}>
      <CardHeader className="pb-3 space-y-1">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{activeEncounter.name}</CardTitle>
          <Badge variant="outline">Round {activeEncounter.round_number}</Badge>
        </div>
        {isDm && (
          <div className="flex justify-between items-center pt-2">
             <Button variant="ghost" size="sm" onClick={() => endEncounter()} className="text-destructive h-6 px-2">
               <X className="h-3 w-3 mr-1" /> End
             </Button>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[300px] w-full px-4">
          <div className="space-y-2 py-2">
            {sortedParticipants.map((participant, index) => {
              const isCurrentTurn = index === activeEncounter.current_turn_index;
              const token = participant.token;
              const character = token?.character;
              const name = token?.name || character?.name || "Unknown";
              const imageUrl = character?.image_url;
              
              return (
                <div 
                  key={participant.id} 
                  className={cn(
                    "flex items-center gap-3 p-2 rounded-lg border transition-colors",
                    isCurrentTurn ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
                  )}
                >
                  <div className="flex-shrink-0 relative">
                    <Avatar className="h-10 w-10 border border-border">
                      <AvatarImage src={imageUrl || undefined} />
                      <AvatarFallback>{name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-2 -left-2 bg-background border rounded-full h-5 w-5 flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {participant.initiative_roll}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn("text-sm font-medium truncate", isCurrentTurn && "text-primary")}>
                        {name}
                      </p>
                      {token && (
                        <div className="flex items-center gap-1">
                           <span className="text-xs text-muted-foreground">
                             {token.hp_current}/{token.hp_max} HP
                           </span>
                           {isDm && (
                             <Popover>
                               <PopoverTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-5 w-5 p-0 ml-1">
                                   <RefreshCw className="h-3 w-3" />
                                 </Button>
                               </PopoverTrigger>
                               <PopoverContent className="w-48 p-2">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                       <span className="text-xs font-medium">Hit Points</span>
                                       <span className="text-xs text-muted-foreground">{token.hp_current} / {token.hp_max}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateToken(token.id, { hp_current: Math.max(0, token.hp_current - 1) })}>-</Button>
                                       <Input 
                                          type="number" 
                                          className="h-8 text-center" 
                                          defaultValue={token.hp_current}
                                          onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) updateToken(token.id, { hp_current: Math.min(token.hp_max, Math.max(0, val)) });
                                          }}
                                       />
                                       <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => updateToken(token.id, { hp_current: Math.min(token.hp_max, token.hp_current + 1) })}>+</Button>
                                    </div>
                                  </div>
                               </PopoverContent>
                             </Popover>
                           )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {participant.conditions.map(c => (
                        <Badge key={c} variant="secondary" className="text-[10px] h-4 px-1">{c}</Badge>
                      ))}
                    </div>
                  </div>

                  {isDm && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ShieldAlert className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-40 p-2">
                        <Input 
                          type="number" 
                          placeholder="Init" 
                          defaultValue={participant.initiative_roll}
                          onBlur={(e) => handleInitiativeChange(participant.id, e.target.value)}
                          className="h-8 text-sm mb-2"
                        />
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full h-7 text-xs"
                          onClick={() => removeParticipant(participant.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" /> Remove
                        </Button>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              );
            })}
            
            {sortedParticipants.length === 0 && (
               <div className="text-center py-8 text-muted-foreground text-sm">
                 No participants.
               </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="pt-2 pb-4 flex gap-2 justify-between">
        {isDm ? (
          <>
            <Button variant="outline" size="sm" onClick={() => prevTurn()} disabled={participants.length === 0}>
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button className="flex-1" size="sm" onClick={() => nextTurn()} disabled={participants.length === 0}>
              Next Turn <SkipForward className="h-4 w-4 ml-2" />
            </Button>
          </>
        ) : (
          <div className="w-full text-center text-xs text-muted-foreground">
             Round {activeEncounter.round_number} • Waiting for DM
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
