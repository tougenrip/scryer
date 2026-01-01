"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Character } from "@/hooks/useDndContent";

interface ExtrasTabProps {
  character: Character;
  editable?: boolean;
  onUpdate?: (updates: Partial<Character>) => Promise<void>;
}

export function ExtrasTab({
  character,
  editable = false,
  onUpdate,
}: ExtrasTabProps) {
  const extras = character.extras || {};
  const customActions = extras.custom_actions || [];
  const customFeatures = extras.custom_features || [];
  const notes = extras.notes || {};

  const handleAddAction = async () => {
    if (!onUpdate) return;
    await onUpdate({
      extras: {
        ...extras,
        custom_actions: [...customActions, {
          name: "",
          type: "action" as const,
          description: "",
        }],
      },
    });
  };

  const handleUpdateAction = async (index: number, field: string, value: string) => {
    if (!onUpdate) return;
    const updated = [...customActions];
    updated[index] = { ...updated[index], [field]: value };
    await onUpdate({
      extras: {
        ...extras,
        custom_actions: updated,
      },
    });
  };

  const handleDeleteAction = async (index: number) => {
    if (!onUpdate) return;
    const updated = customActions.filter((_, i) => i !== index);
    await onUpdate({
      extras: {
        ...extras,
        custom_actions: updated,
      },
    });
  };

  const handleAddFeature = async () => {
    if (!onUpdate) return;
    await onUpdate({
      extras: {
        ...extras,
        custom_features: [...customFeatures, {
          name: "",
          description: "",
        }],
      },
    });
  };

  const handleUpdateFeature = async (index: number, field: string, value: string) => {
    if (!onUpdate) return;
    const updated = [...customFeatures];
    updated[index] = { ...updated[index], [field]: value };
    await onUpdate({
      extras: {
        ...extras,
        custom_features: updated,
      },
    });
  };

  const handleDeleteFeature = async (index: number) => {
    if (!onUpdate) return;
    const updated = customFeatures.filter((_, i) => i !== index);
    await onUpdate({
      extras: {
        ...extras,
        custom_features: updated,
      },
    });
  };

  return (
    <div className="space-y-2">
      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Custom Actions</CardTitle>
              <CardDescription className="text-xs">Additional actions and abilities</CardDescription>
            </div>
            {editable && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddAction}
                className="text-xs"
              >
                + Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2">
            {customActions.length === 0 ? (
              <div className="text-xs text-muted-foreground">No custom actions</div>
            ) : (
              customActions.map((action, index) => (
                <div key={index} className="border rounded p-2 space-y-2">
                  {editable ? (
                    <>
                      <input
                        type="text"
                        value={action.name}
                        onChange={(e) => handleUpdateAction(index, 'name', e.target.value)}
                        placeholder="Action name"
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                      <select
                        value={action.type}
                        onChange={(e) => handleUpdateAction(index, 'type', e.target.value)}
                        className="w-full px-2 py-1 border rounded text-xs"
                      >
                        <option value="action">Action</option>
                        <option value="bonus-action">Bonus Action</option>
                        <option value="reaction">Reaction</option>
                        <option value="other">Other</option>
                      </select>
                      <textarea
                        value={action.description}
                        onChange={(e) => handleUpdateAction(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full min-h-[60px] px-2 py-1 border rounded text-xs"
                      />
                      {action.uses && (
                        <input
                          type="text"
                          value={action.uses}
                          onChange={(e) => handleUpdateAction(index, 'uses', e.target.value)}
                          placeholder="Uses (e.g., 2 / Long Rest)"
                          className="w-full px-2 py-1 border rounded text-xs"
                        />
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteAction(index)}
                        className="text-xs"
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <div className="text-xs">
                      <div className="font-medium">{action.name}</div>
                      <div className="text-muted-foreground capitalize">{action.type.replace('-', ' ')}</div>
                      <div className="mt-1">{action.description}</div>
                      {action.uses && (
                        <div className="text-muted-foreground mt-1">Uses: {action.uses}</div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Custom Features</CardTitle>
              <CardDescription className="text-xs">Additional features and abilities</CardDescription>
            </div>
            {editable && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddFeature}
                className="text-xs"
              >
                + Add
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-2">
            {customFeatures.length === 0 ? (
              <div className="text-xs text-muted-foreground">No custom features</div>
            ) : (
              customFeatures.map((feature, index) => (
                <div key={index} className="border rounded p-2 space-y-2">
                  {editable ? (
                    <>
                      <input
                        type="text"
                        value={feature.name}
                        onChange={(e) => handleUpdateFeature(index, 'name', e.target.value)}
                        placeholder="Feature name"
                        className="w-full px-2 py-1 border rounded text-xs"
                      />
                      <textarea
                        value={feature.description}
                        onChange={(e) => handleUpdateFeature(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="w-full min-h-[60px] px-2 py-1 border rounded text-xs"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteFeature(index)}
                        className="text-xs"
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <div className="text-xs">
                      <div className="font-medium">{feature.name}</div>
                      <div className="mt-1">{feature.description}</div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm">Additional Notes</CardTitle>
          <CardDescription className="text-xs">Custom notes and information</CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="text-xs text-muted-foreground">
            Notes section can be expanded as needed
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

