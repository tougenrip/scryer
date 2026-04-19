"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, GripVertical } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextEditor } from "@/components/shared/rich-text-editor";

export interface CombatAction {
  name: string;
  description: string;
}

export interface CombatStats {
  hp: number;
  maxHp: number;
  ac: number;
  speed: string;
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  savingThrows?: string;
  skills?: string;
  senses?: string;
  languages?: string;
  challengeRating?: string;
  traits: CombatAction[];
  actions: CombatAction[];
  bonusActions?: CombatAction[];
  reactions?: CombatAction[];
  legendaryActions?: CombatAction[];
}

interface CombatStatBlockEditorProps {
  stats: CombatStats | null;
  onChange: (stats: CombatStats | null) => void;
  campaignId: string;
}

const DEFAULT_STATS: CombatStats = {
  hp: 10,
  maxHp: 10,
  ac: 10,
  speed: "30 ft.",
  str: 10,
  dex: 10,
  con: 10,
  int: 10,
  wis: 10,
  cha: 10,
  traits: [],
  actions: [],
};

export function CombatStatBlockEditor({ stats, onChange, campaignId }: CombatStatBlockEditorProps) {
  const [localStats, setLocalStats] = useState<CombatStats>(stats || DEFAULT_STATS);

  const updateField = (field: keyof CombatStats, value: any) => {
    const updated = { ...localStats, [field]: value };
    setLocalStats(updated);
    onChange(updated);
  };

  const updateActionList = (listName: 'traits' | 'actions' | 'bonusActions' | 'reactions' | 'legendaryActions', newList: CombatAction[]) => {
    const updated = { ...localStats, [listName]: newList };
    setLocalStats(updated);
    onChange(updated);
  };

  const addAction = (listName: 'traits' | 'actions' | 'bonusActions' | 'reactions' | 'legendaryActions') => {
    const list = localStats[listName] || [];
    updateActionList(listName, [...list, { name: "", description: "" }]);
  };

  const updateAction = (listName: 'traits' | 'actions' | 'bonusActions' | 'reactions' | 'legendaryActions', index: number, field: keyof CombatAction, value: string) => {
    const list = [...(localStats[listName] || [])];
    list[index] = { ...list[index], [field]: value };
    updateActionList(listName, list);
  };

  const removeAction = (listName: 'traits' | 'actions' | 'bonusActions' | 'reactions' | 'legendaryActions', index: number) => {
    const list = [...(localStats[listName] || [])];
    list.splice(index, 1);
    updateActionList(listName, list);
  };

  const renderActionList = (title: string, listName: 'traits' | 'actions' | 'bonusActions' | 'reactions' | 'legendaryActions') => {
    const actions = localStats[listName] || [];
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Label className="text-sm font-semibold">{title}</Label>
          <Button type="button" variant="outline" size="sm" onClick={() => addAction(listName)}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        {actions.map((action, idx) => (
          <Card key={idx} className="p-4 space-y-3 relative group">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeAction(listName, idx)}
            >
              <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
            </Button>
            <div className="space-y-1 pr-8">
              <Label>Name</Label>
              <Input
                value={action.name}
                onChange={(e) => updateAction(listName, idx, "name", e.target.value)}
                placeholder="e.g., Multiattack"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <RichTextEditor
                value={action.description}
                onChange={(html) => updateAction(listName, idx, "description", html)}
                placeholder="Description of the ability..."
                campaignId={campaignId}
              />
            </div>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Basic Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-1">
          <Label>Armor Class</Label>
          <Input type="number" value={localStats.ac} onChange={(e) => updateField("ac", parseInt(e.target.value) || 0)} />
        </div>
        <div className="space-y-1">
          <Label>Hit Points</Label>
          <Input type="number" value={localStats.maxHp} onChange={(e) => {
            const hp = parseInt(e.target.value) || 0;
            setLocalStats(prev => {
              const updated = { ...prev, maxHp: hp, hp: hp };
              onChange(updated);
              return updated;
            });
          }} />
        </div>
        <div className="space-y-1">
          <Label>Speed</Label>
          <Input value={localStats.speed} onChange={(e) => updateField("speed", e.target.value)} placeholder="30 ft." />
        </div>
        <div className="space-y-1">
          <Label>Challenge Rating</Label>
          <Input value={localStats.challengeRating || ""} onChange={(e) => updateField("challengeRating", e.target.value)} placeholder="1 (200 XP)" />
        </div>
      </div>

      {/* Ability Scores */}
      <Card>
        <CardContent className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-6 flex justify-between">
          {['str', 'dex', 'con', 'int', 'wis', 'cha'].map((stat) => {
            const val = localStats[stat as keyof CombatStats] as number;
            const mod = Math.floor((val - 10) / 2);
            return (
              <div key={stat} className="flex flex-col items-center space-y-1 w-full max-w-[80px] mx-auto">
                <Label className="uppercase text-xs font-bold">{stat}</Label>
                <Input
                  type="number"
                  className="w-full text-center"
                  value={val}
                  onChange={(e) => updateField(stat as keyof CombatStats, parseInt(e.target.value) || 0)}
                />
                <span className="text-xs text-muted-foreground font-semibold">
                  {mod >= 0 ? "+" : ""}{mod}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Saving Throws</Label>
          <Input value={localStats.savingThrows || ""} onChange={(e) => updateField("savingThrows", e.target.value)} placeholder="Str +3, Con +4" />
        </div>
        <div className="space-y-1">
          <Label>Skills</Label>
          <Input value={localStats.skills || ""} onChange={(e) => updateField("skills", e.target.value)} placeholder="Perception +4, Stealth +3" />
        </div>
        <div className="space-y-1">
          <Label>Senses</Label>
          <Input value={localStats.senses || ""} onChange={(e) => updateField("senses", e.target.value)} placeholder="darkvision 60 ft., passive Perception 14" />
        </div>
        <div className="space-y-1">
          <Label>Languages</Label>
          <Input value={localStats.languages || ""} onChange={(e) => updateField("languages", e.target.value)} placeholder="Common, Goblin" />
        </div>
      </div>

      {/* Lists */}
      <div className="space-y-8">
        {renderActionList("Traits", "traits")}
        {renderActionList("Actions", "actions")}
        {renderActionList("Bonus Actions", "bonusActions")}
        {renderActionList("Reactions", "reactions")}
        {renderActionList("Legendary Actions", "legendaryActions")}
      </div>
    </div>
  );
}
