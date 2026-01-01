"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { Character } from "@/hooks/useDndContent";
import { useBackgrounds } from "@/hooks/useDndContent";

interface BackgroundTabProps {
  character: Character;
  editable?: boolean;
  onUpdate?: (updates: Partial<Character>) => Promise<void>;
}

export function BackgroundTab({
  character,
  editable = false,
  onUpdate,
}: BackgroundTabProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const { backgrounds, loading } = useBackgrounds();

  const backgroundDetails = character.background_details || {};
  const selectedBackground = backgrounds.find(bg => bg.index === character.background?.toLowerCase().replace(/\s+/g, '-'));

  const characteristics = backgroundDetails.characteristics || {};
  const personalityTraits = backgroundDetails.personality_traits || [];
  const ideals = backgroundDetails.ideals || [];
  const bonds = backgroundDetails.bonds || [];
  const flaws = backgroundDetails.flaws || [];
  const appearance = backgroundDetails.appearance || "";

  const handleAddTrait = async (type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws') => {
    if (!onUpdate) return;
    const current = backgroundDetails[type] || [];
    await onUpdate({
      background_details: {
        ...backgroundDetails,
        [type]: [...current, ""],
      },
    });
  };

  const handleUpdateTrait = async (type: 'personality_traits' | 'ideals' | 'bonds' | 'flaws', index: number, value: string) => {
    if (!onUpdate) return;
    const current = backgroundDetails[type] || [];
    const updated = [...current];
    updated[index] = value;
    await onUpdate({
      background_details: {
        ...backgroundDetails,
        [type]: updated,
      },
    });
  };

  const handleUpdateCharacteristic = async (key: string, value: string) => {
    if (!onUpdate) return;
    await onUpdate({
      background_details: {
        ...backgroundDetails,
        characteristics: {
          ...characteristics,
          [key]: value,
        },
      },
    });
  };

  const handleUpdateAppearance = async (value: string) => {
    if (!onUpdate) return;
    await onUpdate({
      background_details: {
        ...backgroundDetails,
        appearance: value,
      },
    });
  };

  return (
    <div className="space-y-2">
      <Tabs value={activeFilter} onValueChange={setActiveFilter}>
        <TabsList className="grid w-full grid-cols-4 h-8">
          <TabsTrigger value="all" className="text-xs">ALL</TabsTrigger>
          <TabsTrigger value="background" className="text-xs">BACKGROUND</TabsTrigger>
          <TabsTrigger value="characteristics" className="text-xs">CHARACTERISTICS</TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs">APPEARANCE</TabsTrigger>
        </TabsList>

        <TabsContent value={activeFilter} className="mt-2">
          {(activeFilter === "all" || activeFilter === "background") && (
            <Card className="mb-2">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm">Background</CardTitle>
                <CardDescription className="text-xs">Background information and benefits</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {selectedBackground ? (
                  <div className="space-y-2 text-xs">
                    <div>
                      <strong>{selectedBackground.name}</strong>
                    </div>
                    {selectedBackground.description && (
                      <div className="text-muted-foreground">
                        {selectedBackground.description}
                      </div>
                    )}
                    {selectedBackground.skill_proficiencies && (
                      <div>
                        <strong>Skill Proficiencies:</strong> {selectedBackground.skill_proficiencies}
                      </div>
                    )}
                    {selectedBackground.tool_proficiencies && (
                      <div>
                        <strong>Tool Proficiencies:</strong> {selectedBackground.tool_proficiencies}
                      </div>
                    )}
                    {selectedBackground.languages && (
                      <div>
                        <strong>Languages:</strong> {selectedBackground.languages}
                      </div>
                    )}
                    {selectedBackground.equipment && (
                      <div>
                        <strong>Equipment:</strong> {selectedBackground.equipment}
                      </div>
                    )}
                    {selectedBackground.feature && (
                      <div>
                        <strong>Feature:</strong> {selectedBackground.feature}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {character.background || "No background selected"}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {(activeFilter === "all" || activeFilter === "characteristics") && (
            <Card className="mb-2">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm">Characteristics</CardTitle>
                <CardDescription className="text-xs">Physical and personal characteristics</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-muted-foreground">Alignment</label>
                    {editable ? (
                      <input
                        type="text"
                        value={characteristics.alignment || ""}
                        onChange={(e) => handleUpdateCharacteristic('alignment', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>{characteristics.alignment || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-muted-foreground">Gender</label>
                    {editable ? (
                      <input
                        type="text"
                        value={characteristics.gender || ""}
                        onChange={(e) => handleUpdateCharacteristic('gender', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>{characteristics.gender || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-muted-foreground">Eyes</label>
                    {editable ? (
                      <input
                        type="text"
                        value={characteristics.eyes || ""}
                        onChange={(e) => handleUpdateCharacteristic('eyes', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>{characteristics.eyes || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-muted-foreground">Size</label>
                    {editable ? (
                      <input
                        type="text"
                        value={characteristics.size || ""}
                        onChange={(e) => handleUpdateCharacteristic('size', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>{characteristics.size || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-muted-foreground">Height</label>
                    {editable ? (
                      <input
                        type="text"
                        value={characteristics.height || ""}
                        onChange={(e) => handleUpdateCharacteristic('height', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>{characteristics.height || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-muted-foreground">Faith</label>
                    {editable ? (
                      <input
                        type="text"
                        value={characteristics.faith || ""}
                        onChange={(e) => handleUpdateCharacteristic('faith', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>{characteristics.faith || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-muted-foreground">Hair</label>
                    {editable ? (
                      <input
                        type="text"
                        value={characteristics.hair || ""}
                        onChange={(e) => handleUpdateCharacteristic('hair', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>{characteristics.hair || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-muted-foreground">Skin</label>
                    {editable ? (
                      <input
                        type="text"
                        value={characteristics.skin || ""}
                        onChange={(e) => handleUpdateCharacteristic('skin', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>{characteristics.skin || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-muted-foreground">Age</label>
                    {editable ? (
                      <input
                        type="text"
                        value={characteristics.age || ""}
                        onChange={(e) => handleUpdateCharacteristic('age', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>{characteristics.age || "-"}</div>
                    )}
                  </div>
                  <div>
                    <label className="text-muted-foreground">Weight</label>
                    {editable ? (
                      <input
                        type="text"
                        value={characteristics.weight || ""}
                        onChange={(e) => handleUpdateCharacteristic('weight', e.target.value)}
                        className="w-full mt-1 px-2 py-1 border rounded"
                      />
                    ) : (
                      <div>{characteristics.weight || "-"}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {(activeFilter === "all" || activeFilter === "characteristics") && (
            <>
              <Card className="mb-2">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm">Personality Traits</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="space-y-2">
                    {personalityTraits.map((trait, index) => (
                      <div key={index} className="text-xs">
                        {editable ? (
                          <input
                            type="text"
                            value={trait}
                            onChange={(e) => handleUpdateTrait('personality_traits', index, e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <div>{trait}</div>
                        )}
                      </div>
                    ))}
                    {editable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddTrait('personality_traits')}
                        className="text-xs"
                      >
                        + Add
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-2">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm">Ideals</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="space-y-2">
                    {ideals.map((ideal, index) => (
                      <div key={index} className="text-xs">
                        {editable ? (
                          <input
                            type="text"
                            value={ideal}
                            onChange={(e) => handleUpdateTrait('ideals', index, e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <div>{ideal}</div>
                        )}
                      </div>
                    ))}
                    {editable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddTrait('ideals')}
                        className="text-xs"
                      >
                        + Add
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-2">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm">Bonds</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="space-y-2">
                    {bonds.map((bond, index) => (
                      <div key={index} className="text-xs">
                        {editable ? (
                          <input
                            type="text"
                            value={bond}
                            onChange={(e) => handleUpdateTrait('bonds', index, e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <div>{bond}</div>
                        )}
                      </div>
                    ))}
                    {editable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddTrait('bonds')}
                        className="text-xs"
                      >
                        + Add
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="mb-2">
                <CardHeader className="pb-2 pt-3 px-3">
                  <CardTitle className="text-sm">Flaws</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <div className="space-y-2">
                    {flaws.map((flaw, index) => (
                      <div key={index} className="text-xs">
                        {editable ? (
                          <input
                            type="text"
                            value={flaw}
                            onChange={(e) => handleUpdateTrait('flaws', index, e.target.value)}
                            className="w-full px-2 py-1 border rounded"
                          />
                        ) : (
                          <div>{flaw}</div>
                        )}
                      </div>
                    ))}
                    {editable && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddTrait('flaws')}
                        className="text-xs"
                      >
                        + Add
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {(activeFilter === "all" || activeFilter === "appearance") && (
            <Card>
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-sm">Appearance</CardTitle>
                <CardDescription className="text-xs">Character description</CardDescription>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {editable ? (
                  <textarea
                    value={appearance}
                    onChange={(e) => handleUpdateAppearance(e.target.value)}
                    className="w-full min-h-[100px] px-2 py-1 border rounded text-xs"
                    placeholder="Describe your character's appearance..."
                  />
                ) : (
                  <div className="text-xs text-muted-foreground">
                    {appearance || "No appearance description"}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

