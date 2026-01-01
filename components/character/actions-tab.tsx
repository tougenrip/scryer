"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAbilityModifierString } from "@/lib/utils/character";
import { Bludgeoning } from "dnd-icons/damage";
import type { Character } from "@/hooks/useDndContent";

interface ActionsTabProps {
  character: Character;
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
  };
  inventory: Array<{
    id: string;
    name: string;
    source: "srd" | "homebrew";
    quantity: number;
    equipped: boolean;
    attuned: boolean;
    notes?: string;
  }>;
  classFeatures?: Array<{
    level: number;
    name: string;
    description: string;
  }>;
}

export function ActionsTab({
  character,
  abilityScores,
  inventory,
  classFeatures = [],
}: ActionsTabProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");

  // Helper function to get damage type icon
  const getDamageIcon = (damageType: string) => {
    const type = damageType.toLowerCase();
    if (type === 'bludgeoning') {
      return <Bludgeoning size={14} className="inline-block mr-1" />;
    }
    return null;
  };

  // Get equipped weapons
  const equippedWeapons = inventory.filter(item => item.equipped);

  // Get actions from class features
  const actionFeatures = classFeatures.filter(f => 
    f.description.toLowerCase().includes('action') ||
    f.description.toLowerCase().includes('bonus action') ||
    f.description.toLowerCase().includes('reaction')
  );

  // Filter actions based on active filter
  const getFilteredActions = () => {
    switch (activeFilter) {
      case "attack":
        return [
          {
            name: "Unarmed Strike",
            type: "action",
            description: "Melee Weapon Attack",
            damage: "1 + " + getAbilityModifierString(abilityScores.strength) + " bludgeoning",
          },
          ...equippedWeapons.map(weapon => ({
            name: weapon.name,
            type: "action",
            description: "Weapon Attack",
            damage: "varies",
          })),
        ];
      case "action":
        return actionFeatures.filter(f => 
          f.description.toLowerCase().includes('action') &&
          !f.description.toLowerCase().includes('bonus') &&
          !f.description.toLowerCase().includes('reaction')
        );
      case "bonus-action":
        return actionFeatures.filter(f => 
          f.description.toLowerCase().includes('bonus action')
        );
      case "reaction":
        return actionFeatures.filter(f => 
          f.description.toLowerCase().includes('reaction')
        );
      case "other":
        return [];
      case "limited-use":
        return classFeatures.filter(f => 
          f.description.toLowerCase().includes('per') ||
          f.description.toLowerCase().includes('rest') ||
          f.description.toLowerCase().includes('uses')
        );
      default:
        return [
          {
            name: "Unarmed Strike",
            type: "action",
            description: "Melee Weapon Attack",
            damage: "1 + " + getAbilityModifierString(abilityScores.strength) + " bludgeoning",
          },
          ...equippedWeapons.map(weapon => ({
            name: weapon.name,
            type: "action",
            description: "Weapon Attack",
            damage: "varies",
          })),
          ...actionFeatures,
        ];
    }
  };

  const filteredActions = getFilteredActions();

  return (
    <div className="space-y-2">
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList className="grid w-full grid-cols-7 h-8">
          <TabsTrigger value="all" className="text-xs">ALL</TabsTrigger>
          <TabsTrigger value="attack" className="text-xs">ATTACK</TabsTrigger>
          <TabsTrigger value="action" className="text-xs">ACTION</TabsTrigger>
          <TabsTrigger value="bonus-action" className="text-xs">BONUS ACTION</TabsTrigger>
          <TabsTrigger value="reaction" className="text-xs">REACTION</TabsTrigger>
          <TabsTrigger value="other" className="text-xs">OTHER</TabsTrigger>
          <TabsTrigger value="limited-use" className="text-xs">LIMITED USE</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-2">
          <Card>
            <CardHeader className="pb-2 pt-3 px-3">
              <CardTitle className="text-sm">Actions</CardTitle>
              <CardDescription className="text-xs">Available actions and attacks</CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="space-y-2">
                {activeFilter === "all" || activeFilter === "attack" ? (
                  <div>
                    <h4 className="font-medium mb-1 text-sm">Unarmed Strike</h4>
                    <div className="text-xs text-muted-foreground space-y-0.5 mb-2">
                      <div>Melee Weapon Attack</div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow className="h-8">
                          <TableHead className="text-xs">Base</TableHead>
                          <TableHead className="text-xs">Modifier</TableHead>
                          <TableHead className="text-xs">Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="text-xs">1</TableCell>
                          <TableCell className="text-xs">{getAbilityModifierString(abilityScores.strength)}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center">
                              {getDamageIcon('bludgeoning')}
                              <span className="capitalize">bludgeoning</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                ) : null}

                {filteredActions.length > 0 && (
                  <div className="space-y-2">
                    {filteredActions.map((action, index) => (
                      <div key={index} className="pt-2 border-t">
                        <h4 className="font-medium mb-1 text-sm">{action.name}</h4>
                        <div className="text-xs text-muted-foreground">
                          {typeof action === 'object' && 'description' in action ? action.description : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {filteredActions.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    No actions found for this filter.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

