"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, EyeOff } from "lucide-react";
import { Bounty } from "@/hooks/useCampaignContent";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BountyCardProps {
  bounty: Bounty;
  isDm: boolean;
  onEdit?: (bounty: Bounty) => void;
  onDelete?: (bountyId: string) => void;
  onStatusChange?: (bountyId: string, status: 'available' | 'claimed' | 'completed') => void;
}

export function BountyCard({ bounty, isDm, onEdit, onDelete, onStatusChange }: BountyCardProps) {
  const getStatusBadge = (status: Bounty['status']) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-600 text-white">Available</Badge>;
      case 'claimed':
        return <Badge variant="default" className="bg-yellow-600 text-white">Claimed</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-blue-600 text-white">Completed</Badge>;
      default:
        return null;
    }
  };

  const getTargetTypeBadge = (type: Bounty['target_type']) => {
    switch (type) {
      case 'npc':
        return <Badge variant="outline">NPC</Badge>;
      case 'monster':
        return <Badge variant="outline">Monster</Badge>;
      case 'other':
        return <Badge variant="outline">Other</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="font-serif mb-2">{bounty.title}</CardTitle>
            <CardDescription className="line-clamp-1">
              Target: {bounty.target_name}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {getStatusBadge(bounty.status)}
            {isDm && bounty.hidden_from_players && (
              <EyeOff className="h-4 w-4 text-amber-600" title="Hidden from players" />
            )}
            {isDm && (
              <div className="flex gap-1">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(bounty);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(bounty.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {getTargetTypeBadge(bounty.target_type)}
          {(bounty.location || bounty.posted_by) && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {bounty.location && (
                <span>📍 {bounty.location}</span>
              )}
              {bounty.posted_by && (
                <span>📋 {bounty.posted_by}</span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {bounty.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
            {bounty.description}
          </p>
        )}
        
        {bounty.reward && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Reward:</p>
            <p className="text-sm font-medium text-foreground">{bounty.reward}</p>
          </div>
        )}

        {isDm && onStatusChange && (
          <div className="mt-auto pt-4 border-t">
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Status
            </label>
            <Select
              value={bounty.status}
              onValueChange={(value: 'available' | 'claimed' | 'completed') => {
                onStatusChange(bounty.id, value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="claimed">Claimed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

