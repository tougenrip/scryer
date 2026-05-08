import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useCombat } from '@/hooks/useCombat';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  SkipBack,
  SkipForward,
  Sword,
  X,
  Plus,
  RefreshCw,
  Check,
  Coins,
} from 'lucide-react';
import { EndWithLootDialog } from '@/components/vtt/loot/end-with-loot-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useVttStore } from '@/lib/store/vtt-store';
import { cleanVttDisplayName } from '@/lib/vtt/display-name';
import type { Token } from '@/types/vtt';

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
    addParticipant,
    addParticipants
  } = useCombat(campaignId, mapId);

  const tableTokens = useVttStore((s) => s.tokens);
  const setSelectedTokenId = useVttStore((s) => s.setSelectedTokenId);

  const [isStarting, setIsStarting] = useState(false);
  const [endLootOpen, setEndLootOpen] = useState(false);
  const [addingTokenIds, setAddingTokenIds] = useState<Set<string>>(() => new Set());
  const [apiTableTokens, setApiTableTokens] = useState<Token[]>([]);
  const [selectedStartTokenIds, setSelectedStartTokenIds] = useState<Set<string>>(() => new Set());
  const [startSelectionInitialized, setStartSelectionInitialized] = useState(false);

  const rollInitiative = () => Math.floor(Math.random() * 20) + 1;

  const fetchMapTokens = useCallback(async () => {
    if (!mapId) return [];
    const params = new URLSearchParams({ campaignId, mapId });
    const response = await fetch(`/api/vtt/tokens?${params.toString()}`);
    const payload = (await response.json().catch(() => null)) as {
      tokens?: Token[];
      error?: string;
    } | null;

    if (!response.ok) {
      throw new Error(payload?.error || "Could not load table tokens.");
    }

    const tokens = payload?.tokens ?? [];
    setApiTableTokens(tokens);
    return tokens;
  }, [campaignId, mapId]);

  useEffect(() => {
    if (!mapId) {
      setApiTableTokens([]);
      return;
    }
    void fetchMapTokens().catch((error) => {
      console.error(error);
    });
  }, [fetchMapTokens, mapId]);

  useEffect(() => {
    const handleTokensChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ mapId?: string | null }>).detail;
      if (detail?.mapId && detail.mapId !== mapId) return;
      void fetchMapTokens().catch((error) => {
        console.error(error);
      });
    };

    window.addEventListener('vtt:tokens-changed', handleTokensChanged);
    return () => window.removeEventListener('vtt:tokens-changed', handleTokensChanged);
  }, [fetchMapTokens, mapId]);

  useEffect(() => {
    setSelectedStartTokenIds(new Set());
    setStartSelectionInitialized(false);
  }, [mapId]);

  const participantTokenIds = useMemo(
    () => new Set(participants.map((participant) => participant.token_id)),
    [participants]
  );

  const combinedTableTokens = useMemo(() => {
    const byId = new Map<string, Token>();
    apiTableTokens.forEach((token) => byId.set(token.id, token));
    tableTokens.forEach((token) => byId.set(token.id, token));
    return Array.from(byId.values());
  }, [apiTableTokens, tableTokens]);

  const availableTableTokens = useMemo(
    () =>
      combinedTableTokens
        .filter((token) => token.map_id === mapId && !participantTokenIds.has(token.id))
        .sort((a, b) => cleanVttDisplayName(a.name).localeCompare(cleanVttDisplayName(b.name))),
    [combinedTableTokens, mapId, participantTokenIds]
  );

  const selectedStartTokens = useMemo(
    () => availableTableTokens.filter((token) => selectedStartTokenIds.has(token.id)),
    [availableTableTokens, selectedStartTokenIds]
  );

  useEffect(() => {
    if (activeEncounter || startSelectionInitialized || availableTableTokens.length === 0) return;

    setSelectedStartTokenIds(new Set(availableTableTokens.map((token) => token.id)));
    setStartSelectionInitialized(true);
  }, [activeEncounter, availableTableTokens, startSelectionInitialized]);

  const toggleStartToken = (token: Token) => {
    setSelectedTokenId(token.id);
    setStartSelectionInitialized(true);
    setSelectedStartTokenIds((prev) => {
      const next = new Set(prev);
      if (next.has(token.id)) next.delete(token.id);
      else next.add(token.id);
      return next;
    });
  };

  const handleStartCombat = async () => {
    if (!mapId) return;
    if (selectedStartTokens.length === 0) {
      toast.error("Select at least one token to start combat.");
      return;
    }

    setIsStarting(true);
    try {
      const enc = await startEncounter("Combat", mapId);
      if (!enc) throw new Error("Could not create encounter.");

      await addParticipants(
        enc.id,
        selectedStartTokens.map((token) => ({
          token_id: token.id,
          initiative_roll: rollInitiative(),
        }))
      );

      setSelectedStartTokenIds(new Set());
      setStartSelectionInitialized(false);
      void fetchMapTokens().catch((error) => console.error(error));
      toast.success("Combat started!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start combat.";
      console.error("Failed to start combat:", message);
      toast.error(message);
    } finally {
      setIsStarting(false);
    }
  };

  const setTokenAdding = (tokenId: string, isAdding: boolean) => {
    setAddingTokenIds((prev) => {
      const next = new Set(prev);
      if (isAdding) next.add(tokenId);
      else next.delete(tokenId);
      return next;
    });
  };

  const handleAddTableToken = async (tokenId: string) => {
    if (!activeEncounter || participantTokenIds.has(tokenId)) return;
    setTokenAdding(tokenId, true);
    try {
      await addParticipant(tokenId, rollInitiative());
      void fetchMapTokens().catch((error) => console.error(error));
      toast.success("Token added to combat.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add token to combat.";
      console.error("Failed to add token to combat:", message);
      toast.error(message);
    } finally {
      setTokenAdding(tokenId, false);
    }
  };

  const handleAddAllTableTokens = async () => {
    if (!activeEncounter || availableTableTokens.length === 0) return;
    const tokenIds = availableTableTokens.map((token) => token.id);
    setAddingTokenIds(new Set(tokenIds));
    try {
      await addParticipants(
        activeEncounter.id,
        availableTableTokens.map((token) => ({
          token_id: token.id,
          initiative_roll: rollInitiative(),
        }))
      );
      void fetchMapTokens().catch((error) => console.error(error));
      toast.success(`${availableTableTokens.length} token${availableTableTokens.length === 1 ? "" : "s"} added to combat.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to add table tokens to combat.";
      console.error("Failed to add table tokens to combat:", message);
      toast.error(message);
    } finally {
      setAddingTokenIds(new Set());
    }
  };

  if (loading) {
    return (
      <Card className={cn("w-full h-full flex items-center justify-center", className)}>
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  // --- IDLE STATE ---
  if (!activeEncounter) {
    if (!isDm) {
      return (
        <Card className={cn("w-full", className)}>
        <CardHeader className="p-3">
            <CardTitle className="text-base">Combat</CardTitle>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            <p className="text-xs text-muted-foreground">No active combat encounter.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className={cn("w-full flex flex-col", className)}>
        <CardHeader className="space-y-0.5 p-3 pb-2">
          <CardTitle className="text-base">Start Combat</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Choose the table tokens that should roll initiative.
          </p>
        </CardHeader>
        <CardContent className="flex-1 space-y-2 p-0">
          <div className="px-3">
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-2 py-1.5">
              <span className="text-[11px] text-muted-foreground">
                {selectedStartTokens.length}/{availableTableTokens.length} selected
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px]"
                  disabled={availableTableTokens.length === 0}
                  onClick={() => {
                    setStartSelectionInitialized(true);
                    setSelectedStartTokenIds(new Set(availableTableTokens.map((token) => token.id)));
                  }}
                >
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-1.5 text-[11px]"
                  disabled={selectedStartTokenIds.size === 0}
                  onClick={() => {
                    setStartSelectionInitialized(true);
                    setSelectedStartTokenIds(new Set());
                  }}
                >
                  Clear
                </Button>
              </div>
            </div>
          </div>

          <ScrollArea className="h-[230px] w-full px-3">
            {availableTableTokens.length > 0 ? (
              <div className="space-y-1.5 pb-2">
                {availableTableTokens.map((token) => {
                  const name = cleanVttDisplayName(token.name || token.character?.name);
                  const isSelected = selectedStartTokenIds.has(token.id);

                  return (
                    <button
                      key={token.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md border p-1.5 text-left transition-colors",
                        isSelected
                          ? "border-amber-500/70 bg-amber-500/10"
                          : "border-border bg-background/70 hover:bg-muted/50"
                      )}
                      onClick={() => toggleStartToken(token)}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          isSelected
                            ? "border-amber-500 bg-amber-500 text-black"
                            : "border-muted-foreground/40"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                      <Avatar className="h-7 w-7 shrink-0 border border-border">
                        <AvatarImage src={token.image_url || token.character?.image_url || undefined} />
                        <AvatarFallback className="text-[10px]">{name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium leading-tight">{name}</p>
                        <p className="truncate text-[10px] leading-tight text-muted-foreground">
                          HP {token.hp_current ?? "-"} / {token.hp_max ?? "-"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-border bg-background/50 px-3 py-4 text-center text-xs text-muted-foreground">
                No tokens are on this map yet.
              </p>
            )}
          </ScrollArea>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-1.5 p-3 pt-2">
          <Button 
            className="h-8 w-full text-xs" 
            onClick={handleStartCombat}
            disabled={!mapId || selectedStartTokens.length === 0 || isStarting}
          >
            {isStarting ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sword className="mr-1.5 h-3.5 w-3.5" />
            )}
            Begin Combat
          </Button>
          {!mapId && <p className="text-xs text-destructive">Map required to start combat.</p>}
        </CardFooter>
      </Card>
    );
  }

  // --- ACTIVE COMBAT STATE ---
  // Sort participants by turn order for display
  const sortedParticipants = [...participants].sort((a, b) => a.turn_order - b.turn_order);

  return (
    <Card className={cn("w-full flex flex-col", className)}>
      <CardHeader className="space-y-1 p-3 pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base">{activeEncounter.name}</CardTitle>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px]">Round {activeEncounter.round_number}</Badge>
        </div>
        {isDm && (
          <div className="flex items-center gap-1 pt-0.5">
            <Button variant="ghost" size="sm" onClick={() => endEncounter()} className="text-destructive h-6 px-2">
              <X className="h-3 w-3 mr-1" /> End
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEndLootOpen(true)}
              className="text-amber-400 h-6 px-2"
              title="Roll loot, review, then end the encounter"
            >
              <Coins className="h-3 w-3 mr-1" /> End with Loot
            </Button>
          </div>
        )}
      </CardHeader>

      {isDm && (
        <div className="border-y border-border bg-muted/20 px-3 py-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Table Tokens
              </p>
              <p className="text-[10px] text-muted-foreground">
                Inspect or add tokens.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="h-7 shrink-0 gap-1 text-[11px]"
              disabled={availableTableTokens.length === 0 || addingTokenIds.size > 0}
              onClick={handleAddAllTableTokens}
            >
              <Plus className="h-3 w-3" />
              Add All
            </Button>
          </div>

          {availableTableTokens.length > 0 ? (
            <div className="grid max-h-28 grid-cols-1 gap-1 overflow-y-auto pr-1 custom-scrollbar">
              {availableTableTokens.map((token) => {
                const name = cleanVttDisplayName(token.name);
                const isAdding = addingTokenIds.has(token.id);

                return (
                  <div
                    key={token.id}
                    className="flex items-center gap-1.5 rounded-md border border-border bg-background/70 p-1"
                  >
                    <button
                      type="button"
                      className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                      onClick={() => setSelectedTokenId(token.id)}
                      title="Select token on table"
                    >
                      <Avatar className="h-6 w-6 shrink-0 border border-border">
                        <AvatarImage src={token.image_url || undefined} />
                        <AvatarFallback className="text-[9px]">{name.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium leading-tight">{name}</p>
                        <p className="truncate text-[9px] leading-tight text-muted-foreground">
                          HP {token.hp_current ?? "-"} / {token.hp_max ?? "-"}
                        </p>
                      </div>
                    </button>
                    <Button
                      size="sm"
                      className="h-6 shrink-0 px-1.5 text-[10px]"
                      disabled={isAdding}
                      onClick={() => handleAddTableToken(token.id)}
                    >
                      {isAdding ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Plus className="mr-1 h-3 w-3" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="rounded-md border border-dashed border-border bg-background/50 px-2 py-2 text-center text-[11px] text-muted-foreground">
              All current table tokens are already in combat.
            </p>
          )}
        </div>
      )}
      
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[240px] w-full px-3">
          <div className="space-y-1.5 py-1.5">
            {sortedParticipants.map((participant, index) => {
              const isCurrentTurn = index === activeEncounter.current_turn_index;
              const token = participant.token;
              const character = token?.character;
              const name = cleanVttDisplayName(token?.name || character?.name || token?.monster?.name);
              const imageUrl = token?.image_url || character?.image_url;
              
              return (
                <button 
                  key={participant.id} 
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border p-1.5 text-left transition-colors",
                    isCurrentTurn ? "border-primary bg-primary/5" : "border-transparent hover:bg-muted/50"
                  )}
                  onClick={() => {
                    if (token?.id) setSelectedTokenId(token.id);
                  }}
                >
                  <div className="flex-shrink-0 relative">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={imageUrl || undefined} />
                      <AvatarFallback className="text-[10px]">{name.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -left-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full border bg-background text-[9px] font-bold shadow-sm">
                      {participant.initiative_roll}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={cn("truncate text-xs font-medium leading-tight", isCurrentTurn && "text-primary")}>
                        {name}
                      </p>
                      {token && (
                        <div className="ml-2 shrink-0">
                           <span className="text-[10px] text-muted-foreground">
                             {token.hp_current}/{token.hp_max} HP
                           </span>
                        </div>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1">
                      {participant.conditions.map(c => (
                        <Badge key={c} variant="secondary" className="h-4 px-1 text-[9px]">{c}</Badge>
                      ))}
                    </div>
                  </div>

                </button>
              );
            })}
            
            {sortedParticipants.length === 0 && (
               <div className="py-6 text-center text-xs text-muted-foreground">
                 No participants.
               </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      <CardFooter className="flex gap-1.5 justify-between p-3 pt-2">
        {isDm ? (
          <>
            <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => prevTurn()} disabled={participants.length === 0}>
              <SkipBack className="h-3.5 w-3.5" />
            </Button>
            <Button className="h-8 flex-1 text-xs" size="sm" onClick={() => nextTurn()} disabled={participants.length === 0}>
              Next <SkipForward className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <div className="w-full text-center text-xs text-muted-foreground">
             Round {activeEncounter.round_number} • Waiting for DM
          </div>
        )}
      </CardFooter>

      <EndWithLootDialog
        open={endLootOpen}
        onOpenChange={setEndLootOpen}
        campaignId={campaignId}
        encounterId={activeEncounter.id ?? null}
        encounterName={activeEncounter.name ?? null}
        monsters={participants
          .map((p) => p.token?.monster?.challenge_rating)
          .filter((cr): cr is number => typeof cr === "number")
          .map((cr) => ({ challenge_rating: cr }))}
        onCommitted={async () => {
          await endEncounter();
        }}
      />
    </Card>
  );
}
