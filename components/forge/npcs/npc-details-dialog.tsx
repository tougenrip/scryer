import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { NPC } from "@/hooks/useCampaignContent";
import { RichTextDisplay } from "@/components/shared/rich-text-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CombatStatBlockDisplay } from "@/components/campaign/combat-stat-block-display";
import { User, EyeOff } from "lucide-react";

interface NPCDetailsDialogProps {
  npc: NPC | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classNameLabel?: string;
  speciesLabel?: string;
}

export function NPCDetailsDialog({
  npc,
  open,
  onOpenChange,
  classNameLabel,
  speciesLabel,
}: NPCDetailsDialogProps) {
  if (!npc) return null;

  const hasCombatStats = !!npc.metadata?.combatStats;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-0 border-none bg-transparent shadow-none">
        <DialogTitle className="sr-only">{npc.name} Details</DialogTitle>
        <div className="bg-background rounded-lg shadow-lg border border-border overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header section with optional background image */}
          <div className="relative p-6 border-b border-border bg-muted/20">
            {npc.image_url && (
              <div 
                className="absolute inset-0 opacity-10 blur-sm bg-cover bg-center pointer-events-none" 
                style={{ backgroundImage: `url(${npc.image_url})` }} 
              />
            )}
            <div className="relative flex items-start gap-4">
              <div className="w-24 h-24 rounded-md overflow-hidden bg-background border border-border shadow-sm flex-shrink-0">
                {npc.image_url ? (
                  <img src={npc.image_url} alt={npc.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <User className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
              </div>
              
              <div className="pt-1">
                <h2 className="text-3xl font-serif font-bold leading-tight flex items-center gap-2">
                  {npc.name}
                  {npc.hidden_from_players && (
                    <span title="Hidden from players">
                      <EyeOff className="h-5 w-5 text-yellow-500" />
                    </span>
                  )}
                </h2>
                <div className="text-muted-foreground mt-1 text-sm font-medium flex flex-wrap gap-x-3 gap-y-1">
                  {speciesLabel && (
                    <span>{speciesLabel}</span>
                  )}
                  {classNameLabel && speciesLabel && (
                    <span className="text-muted-foreground/50">•</span>
                  )}
                  {classNameLabel && (
                    <span>{classNameLabel}</span>
                  )}
                  {npc.location && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span>{npc.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 overflow-y-auto w-full">
            {hasCombatStats ? (
              <Tabs defaultValue="lore" className="w-full">
                <TabsList className="w-full grid border-b border-border grid-cols-2 rounded-none bg-transparent h-auto p-0 mb-6">
                  <TabsTrigger 
                    value="lore" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none shadow-none py-2 text-base font-medium"
                  >
                    Lore & Details
                  </TabsTrigger>
                  <TabsTrigger 
                    value="combat" 
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none shadow-none py-2 text-base font-medium"
                  >
                    Combat Stats
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="lore" className="space-y-6 mt-0">
                  {renderLore(npc)}
                </TabsContent>
                
                <TabsContent value="combat" className="mt-0">
                  {npc.metadata?.combatStats && (
                    <div className="flex justify-center -mx-2 md:mx-0">
                      <div className="w-full max-w-2xl">
                        <CombatStatBlockDisplay stats={npc.metadata.combatStats} />
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            ) : (
              <div className="space-y-6">
                {renderLore(npc)}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function renderLore(npc: NPC) {
  const hasLore = npc.description || npc.appearance || npc.personality || npc.background;
  
  if (!hasLore) {
    return <p className="text-muted-foreground italic text-center py-8">No details have been added for this NPC yet.</p>;
  }

  return (
    <>
      {npc.description && (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold border-b pb-1 font-serif">Description</h3>
          <RichTextDisplay content={npc.description} />
        </section>
      )}
      {npc.appearance && (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold border-b pb-1 font-serif">Appearance</h3>
          <RichTextDisplay content={npc.appearance} />
        </section>
      )}
      {npc.personality && (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold border-b pb-1 font-serif">Personality</h3>
          <RichTextDisplay content={npc.personality} />
        </section>
      )}
      {npc.background && (
        <section className="space-y-2">
          <h3 className="text-lg font-semibold border-b pb-1 font-serif">Background</h3>
          <RichTextDisplay content={npc.background} />
        </section>
      )}
      {npc.notes && (
        <section className="space-y-2 pt-4">
          <h3 className="text-lg font-semibold border-b border-warning/30 text-warning pb-1 font-serif">DM Notes</h3>
          <div className="bg-warning/10 p-4 rounded-md">
            <RichTextDisplay content={npc.notes} />
          </div>
        </section>
      )}
    </>
  );
}
