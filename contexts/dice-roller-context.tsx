"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { parseDiceExpression, toDiceBoxFormat, calculateRollResult, type ParsedDiceExpression } from "@/lib/utils/dice-parser";
import { toast } from "sonner";

export interface RollResult {
  id: string;
  expression: string;
  result: number;
  breakdown: {
    rolls: number[];
    modifier: number;
    total: number;
  };
  label?: string;
  characterId?: string;
  characterName?: string;
  userId?: string;
  userName?: string;
  campaignId?: string;
  advantage?: boolean;
  disadvantage?: boolean;
  timestamp: Date;
}

export interface RollOptions {
  label?: string;
  characterId?: string;
  characterName?: string;
  campaignId?: string;
  shareWithCampaign?: boolean;
  advantage?: boolean;
  disadvantage?: boolean;
}

interface DiceRollerContextType {
  rollDice: (expression: string, options?: RollOptions) => Promise<RollResult | null>;
  rollWithAdvantage: (modifier: number, options?: RollOptions) => Promise<RollResult | null>;
  rollWithDisadvantage: (modifier: number, options?: RollOptions) => Promise<RollResult | null>;
  rollHitDice: (expression: string, options?: RollOptions) => Promise<RollResult | null>;
  rollHistory: RollResult[];
  isRolling: boolean;
  diceBox: any | null;
  initializeDiceBox: (diceBoxInstance: any) => void;
}

const DiceRollerContext = createContext<DiceRollerContextType | undefined>(undefined);

export function useDiceRoller() {
  const context = useContext(DiceRollerContext);
  if (!context) {
    throw new Error("useDiceRoller must be used within a DiceRollerProvider");
  }
  return context;
}

export function DiceRollerProvider({ 
  children, 
  diceBoxInstance 
}: { 
  children: React.ReactNode;
  diceBoxInstance?: any;
}) {
  const [rollHistory, setRollHistory] = useState<RollResult[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [diceBox, setDiceBox] = useState<any | null>(diceBoxInstance || null);
  const supabase = createClient();
  const diceClearTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Timeout duration in milliseconds (3 seconds)
  const DICE_CLEAR_DELAY = 3000;

  // Update diceBox when instance changes
  useEffect(() => {
    if (diceBoxInstance) {
      setDiceBox(diceBoxInstance);
    }
  }, [diceBoxInstance]);

  const initializeDiceBox = useCallback((diceBoxInstance: any) => {
    setDiceBox(diceBoxInstance);
  }, []);

  /**
   * Executes a dice roll using DiceBox
   */
  const executeRoll = useCallback(
    async (
      parsed: ParsedDiceExpression,
      options: RollOptions = {}
    ): Promise<RollResult | null> => {
      if (!parsed.isValid) {
        toast.error("Invalid dice expression");
        return null;
      }

      if (!diceBox) {
        toast.error("Dice roller not initialized");
        return null;
      }

      setIsRolling(true);

      try {
        if (!diceBox) {
          console.error("DiceBox not initialized");
          toast.error("Dice roller not ready. Please wait a moment and try again.");
          setIsRolling(false);
          return null;
        }
        
        const diceFormat = toDiceBoxFormat(parsed);
        console.log("Parsed dice format:", diceFormat, "Expression:", parsed.expression);
        
        // Handle advantage/disadvantage for d20 rolls
        // For DiceBox, we roll without modifier first, then add it after
        let rollExpression = parsed.dice.map(d => `${d.count}d${d.sides}`).join("+");
        let useAdvantage = false;
        let useDisadvantage = false;

        if (options.advantage && diceFormat.length === 1 && diceFormat[0].sides === 20 && diceFormat[0].qty === 1) {
          // Roll 2d20, take highest
          rollExpression = "2d20";
          useAdvantage = true;
        } else if (options.disadvantage && diceFormat.length === 1 && diceFormat[0].sides === 20 && diceFormat[0].qty === 1) {
          // Roll 2d20, take lowest
          rollExpression = "2d20";
          useDisadvantage = true;
        }

        // Roll dice using DiceBox (returns a Promise)
        // DiceBox.roll() accepts string notation like "1d20" or "2d6"
        console.log("Rolling dice with expression:", rollExpression, "DiceBox instance:", diceBox);
        
        // Verify canvas exists before rolling
        const canvasContainer = document.getElementById("dice-canvas-container");
        const canvas = document.getElementById("dice-canvas") as HTMLCanvasElement;
        if (!canvas) {
          console.warn("Dice canvas not found, dice may not be visible");
        } else {
          console.log("Dice canvas found, dimensions:", canvas.width, "x", canvas.height);
          // Ensure canvas has proper dimensions before rolling
          if (canvas.width === 0 || canvas.height === 0) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            console.log("Fixed canvas dimensions to:", canvas.width, "x", canvas.height);
          }
        }
        
        let results: any;
        try {
          // DiceBox.roll() returns a promise that resolves with the roll results
          // The dice will animate on screen during this time
          // Pass options to position dice in center of viewport
          const rollOptions = {
            position: { x: 0, y: 0, z: 0 }, // Center of screen
          };
          
          results = await diceBox.roll(rollExpression, rollOptions);
          console.log("DiceBox roll results:", results);
          
          // After rolling, check if dice are visible
          setTimeout(() => {
            const diceMeshes = canvasContainer?.querySelectorAll("[class*='dice'], [class*='mesh']");
            console.log("Dice meshes found after roll:", diceMeshes?.length || 0);
            // Also check canvas visibility
            if (canvas) {
              const canvasStyle = window.getComputedStyle(canvas);
              console.log("Canvas visibility:", canvasStyle.visibility, "Display:", canvasStyle.display, "Opacity:", canvasStyle.opacity);
              console.log("Canvas dimensions after roll:", canvas.width, "x", canvas.height);
            }
          }, 100);
        } catch (error) {
          console.error("DiceBox roll error:", error);
          // Even if there's an error, try to continue with fallback
          results = null;
        }
        
        // Extract individual die results from DiceBox response
        // Results format: [{ sides: 20, dieType: 'd20', groupId: 0, rollId: 0, value: 15, ... }]
        const rolls: number[] = [];
        
        if (results && Array.isArray(results)) {
          results.forEach((result: any) => {
            // Log full object to see all properties (for debugging)
            const allKeys = Object.keys(result);
            console.log("Result keys:", allKeys);
            console.log("Result object:", JSON.stringify(result, null, 2));
            
            // Based on DiceBox documentation, results have a structure like:
            // { sides: 20, dieType: 'd20', groupId: 0, rollId: 0, value: <number>, ... }
            // The value property should contain the actual roll result
            
            // Check for value property directly on the result object (most common)
            if (typeof result.value === 'number') {
              console.log("Found value property:", result.value);
              rolls.push(result.value);
            }
            // Check for roll property (alternative name)
            else if (typeof result.roll === 'number') {
              console.log("Found roll property:", result.roll);
              rolls.push(result.roll);
            }
            // Check if result has a rolls array (for grouped rolls)
            else if (result.rolls && Array.isArray(result.rolls)) {
              result.rolls.forEach((roll: any) => {
                if (typeof roll.value === 'number') {
                  rolls.push(roll.value);
                } else if (typeof roll.roll === 'number') {
                  rolls.push(roll.roll);
                }
              });
            }
            // Check for values array
            else if (result.values && Array.isArray(result.values)) {
              rolls.push(...result.values.filter((v: any) => typeof v === 'number'));
            }
            // Last resort: try to find any numeric property in valid die range
            else {
              const numericProps = allKeys.filter(key => {
                const val = result[key];
                return typeof val === 'number' && 
                       key !== 'sides' && 
                       key !== 'groupId' && 
                       key !== 'rollId' &&
                       val > 0 && 
                       val <= result.sides; // Value should be within die range
              });
              if (numericProps.length > 0) {
                console.log("Found numeric properties:", numericProps.map(p => `${p}: ${result[p]}`));
                // Prefer properties named 'value', 'roll', 'result', or similar
                const preferredProp = numericProps.find(p => 
                  p.toLowerCase().includes('value') || 
                  p.toLowerCase().includes('roll') || 
                  p.toLowerCase().includes('result')
                );
                if (preferredProp) {
                  rolls.push(result[preferredProp]);
                } else {
                  // Use first numeric property that's in valid range
                  rolls.push(result[numericProps[0]]);
                }
              } else {
                console.warn("Could not find roll value in result object:", result);
              }
            }
          });
        }
        
        console.log("Extracted rolls:", rolls);
        
        // If no rolls extracted, fallback to calculating from expression
        if (rolls.length === 0) {
          console.warn("No rolls extracted from DiceBox results, using fallback");
          const match = rollExpression.match(/(\d+)d(\d+)/);
          if (match) {
            const count = parseInt(match[1], 10);
            const sides = parseInt(match[2], 10);
            // Generate random rolls as fallback
            for (let i = 0; i < count; i++) {
              rolls.push(Math.floor(Math.random() * sides) + 1);
            }
          }
        }
        
        const rollResult = { rolls };

        let finalRolls = rollResult.rolls;
        let finalResult: number;

        // Handle advantage/disadvantage
        if (useAdvantage && finalRolls.length === 2) {
          finalRolls = [Math.max(finalRolls[0], finalRolls[1])];
          finalResult = calculateRollResult(finalRolls, parsed.modifier);
        } else if (useDisadvantage && finalRolls.length === 2) {
          finalRolls = [Math.min(finalRolls[0], finalRolls[1])];
          finalResult = calculateRollResult(finalRolls, parsed.modifier);
        } else {
          finalResult = calculateRollResult(finalRolls, parsed.modifier);
        }

        const rollResultObj: RollResult = {
          id: crypto.randomUUID(),
          expression: parsed.expression,
          result: finalResult,
          breakdown: {
            rolls: finalRolls,
            modifier: parsed.modifier,
            total: finalResult,
          },
          label: options.label,
          characterId: options.characterId,
          characterName: options.characterName,
          campaignId: options.campaignId,
          advantage: useAdvantage,
          disadvantage: useDisadvantage,
          timestamp: new Date(),
        };

        // Add to local history
        setRollHistory((prev) => {
          const updated = [rollResultObj, ...prev].slice(0, 20);
          return updated;
        });

        // Share with campaign if enabled
        if (options.shareWithCampaign !== false && options.campaignId) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              await supabase.from("dice_rolls").insert({
                campaign_id: options.campaignId,
                user_id: user.id,
                character_id: options.characterId || null,
                expression: parsed.expression,
                result: finalResult,
                breakdown: rollResultObj.breakdown,
                label: options.label || null,
                advantage: useAdvantage,
                disadvantage: useDisadvantage,
              });
            }
          } catch (error) {
            console.error("Failed to share roll:", error);
            // Don't show error to user, roll still succeeded locally
          }
        }

        // Clear any existing timeout
        if (diceClearTimeoutRef.current) {
          clearTimeout(diceClearTimeoutRef.current);
          diceClearTimeoutRef.current = null;
        }

        // Set a new timeout to clear dice after delay
        diceClearTimeoutRef.current = setTimeout(() => {
          if (diceBox && typeof diceBox.clear === 'function') {
            try {
              diceBox.clear();
              console.log("Dice cleared after timeout");
            } catch (error) {
              console.error("Error clearing dice:", error);
            }
          }
          diceClearTimeoutRef.current = null;
        }, DICE_CLEAR_DELAY);

        return rollResultObj;
      } catch (error) {
        console.error("Dice roll error:", error);
        toast.error("Failed to roll dice");
        return null;
      } finally {
        setIsRolling(false);
      }
    },
    [diceBox, supabase]
  );

  /**
   * Roll dice from an expression string
   */
  const rollDice = useCallback(
    async (expression: string, options: RollOptions = {}): Promise<RollResult | null> => {
      const parsed = parseDiceExpression(expression);
      return executeRoll(parsed, options);
    },
    [executeRoll]
  );

  /**
   * Roll with advantage (roll 2d20, take highest)
   */
  const rollWithAdvantage = useCallback(
    async (modifier: number, options: RollOptions = {}): Promise<RollResult | null> => {
      const parsed = parseDiceExpression(`1d20${modifier >= 0 ? '+' : ''}${modifier}`);
      return executeRoll(parsed, { ...options, advantage: true });
    },
    [executeRoll]
  );

  /**
   * Roll with disadvantage (roll 2d20, take lowest)
   */
  const rollWithDisadvantage = useCallback(
    async (modifier: number, options: RollOptions = {}): Promise<RollResult | null> => {
      const parsed = parseDiceExpression(`1d20${modifier >= 0 ? '+' : ''}${modifier}`);
      return executeRoll(parsed, { ...options, disadvantage: true });
    },
    [executeRoll]
  );

  /**
   * Roll hit dice
   */
  const rollHitDice = useCallback(
    async (expression: string, options: RollOptions = {}): Promise<RollResult | null> => {
      const parsed = parseDiceExpression(expression);
      if (!parsed.isValid) {
        toast.error("Invalid hit dice expression");
        return null;
      }
      return executeRoll(parsed, { ...options, label: options.label || "Hit Dice Recovery" });
    },
    [executeRoll]
  );

  // Subscribe to real-time dice rolls from other players
  useEffect(() => {
    if (!supabase) return;

    // Get current user's campaigns
    const subscribeToRolls = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's campaigns
      const { data: campaigns } = await supabase
        .from("campaign_members")
        .select("campaign_id")
        .eq("user_id", user.id);

      if (!campaigns || campaigns.length === 0) return;

      const campaignIds = campaigns.map((c) => c.campaign_id);

      // Subscribe to dice_rolls table changes for each campaign
      // Note: Supabase doesn't support IN filters in postgres_changes, so we subscribe to all and filter in the callback
      const channel = supabase
        .channel("dice_rolls_changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "dice_rolls",
          },
          async (payload) => {
            const roll = payload.new as any;
            
            // Filter to only show rolls from user's campaigns
            if (!campaignIds.includes(roll.campaign_id)) {
              return;
            }
            
            // Don't show own rolls (they're already in local history)
            if (roll.user_id === user.id) {
              return;
            }

            // Fetch character name if character_id exists
            let characterName = roll.character_id ? null : undefined;
            if (roll.character_id) {
              const { data: character } = await supabase
                .from("characters")
                .select("name")
                .eq("id", roll.character_id)
                .single();
              characterName = character?.name;
            }

            // Fetch user name
            const { data: userData } = await supabase
              .from("profiles")
              .select("display_name")
              .eq("id", roll.user_id)
              .single();

            const rollResult: RollResult = {
              id: roll.id,
              expression: roll.expression,
              result: roll.result,
              breakdown: roll.breakdown || { rolls: [], modifier: 0, total: roll.result },
              label: roll.label,
              characterId: roll.character_id,
              characterName: characterName || undefined,
              userId: roll.user_id,
              userName: userData?.display_name || undefined,
              campaignId: roll.campaign_id,
              advantage: roll.advantage,
              disadvantage: roll.disadvantage,
              timestamp: new Date(roll.created_at),
            };

            setRollHistory((prev) => {
              // Avoid duplicates
              if (prev.some((r) => r.id === rollResult.id)) {
                return prev;
              }
              return [rollResult, ...prev].slice(0, 20);
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanup = subscribeToRolls();

    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [supabase]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (diceClearTimeoutRef.current) {
        clearTimeout(diceClearTimeoutRef.current);
        diceClearTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <DiceRollerContext.Provider
      value={{
        rollDice,
        rollWithAdvantage,
        rollWithDisadvantage,
        rollHitDice,
        rollHistory,
        isRolling,
        diceBox,
        initializeDiceBox,
      }}
    >
      {children}
    </DiceRollerContext.Provider>
  );
}
