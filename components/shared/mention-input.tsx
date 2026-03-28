"use client";

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { useMentionables } from '@/hooks/useMentionables';
import {
  getCurrentMentionQuery,
  insertMention,
  type MentionableEntity,
  type MentionMetadata,
  resolveMentions,
  groupMentionsByType,
} from '@/lib/utils/mention-parser';
import { User, MapPin, ScrollText, Users, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MentionInputProps {
  value: string;
  onChange: (value: string, metadata?: MentionMetadata) => void;
  placeholder?: string;
  campaignId: string | null;
  className?: string;
  disabled?: boolean;
  rows?: number;
  id?: string;
}

const MENTION_ICONS = {
  npc: User,
  location: MapPin,
  quest: ScrollText,
  faction: Users,
};

export function MentionInput({
  value,
  onChange,
  placeholder,
  campaignId,
  className,
  disabled = false,
  rows = 3,
  id,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [popoverPosition, setPopoverPosition] = useState<{ top: number; left: number } | null>(null);

  const { mentionables, loading, searchMentionables } = useMentionables(campaignId);

  // Debug: Log mentionables data
  useEffect(() => {
    console.log('[MentionInput] Campaign ID:', campaignId);
    console.log('[MentionInput] Mentionables count:', mentionables.length);
    console.log('[MentionInput] Loading:', loading);
    if (mentionables.length > 0) {
      console.log('[MentionInput] Sample:', mentionables.slice(0, 3));
    }
  }, [campaignId, mentionables, loading]);

  // Filter mentionables based on autocomplete query
  // Show all entities when query is empty (just typed @)
  const filteredMentionables = autocompleteQuery
    ? searchMentionables(autocompleteQuery)
    : mentionables.slice(0, 10); // Show first 10 entities when no query

  // Check for @ trigger and update autocomplete
  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;

    // Check if we're in a mention context
    const mentionQuery = getCurrentMentionQuery(newValue, cursorPosition);

    console.log('[MentionInput] Query:', mentionQuery, 'Cursor:', cursorPosition);

    if (mentionQuery !== null) {
      setAutocompleteQuery(mentionQuery);
      setShowAutocomplete(true);
      setSelectedIndex(0);

      // Calculate popover position (below cursor)
      updatePopoverPosition(e.target, cursorPosition);
    } else {
      setShowAutocomplete(false);
      setAutocompleteQuery('');
    }

    // Update value and metadata
    const resolvedEntities = resolveMentions(newValue, mentionables);
    const metadata = groupMentionsByType(resolvedEntities);
    onChange(newValue, metadata);
  };

  // Calculate popover position relative to cursor
  const updatePopoverPosition = (textarea: HTMLTextAreaElement, cursorPos: number) => {
    try {
      // Simple and reliable position calculation
      const rect = textarea.getBoundingClientRect();
      const textBeforeCursor = textarea.value.substring(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLineIndex = lines.length - 1;
      
      // Use computed styles for accurate measurements
      const styles = window.getComputedStyle(textarea);
      const lineHeight = parseFloat(styles.lineHeight) || 20;
      const paddingTop = parseFloat(styles.paddingTop) || 8;
      
      // Calculate position
      const top = paddingTop + (currentLineIndex * lineHeight) + lineHeight + 5;
      const left = 0; // Align to left of textarea for simplicity
      
      setPopoverPosition({ top, left });
    } catch (error) {
      console.error('Error calculating popover position:', error);
      // Fallback position
      setPopoverPosition({ top: 30, left: 0 });
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showAutocomplete || filteredMentionables.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredMentionables.length - 1 ? prev + 1 : 0
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredMentionables.length - 1
        );
        break;

      case 'Enter':
        if (showAutocomplete) {
          e.preventDefault();
          handleSelectMention(filteredMentionables[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        break;
    }
  };

  // Insert selected mention
  const handleSelectMention = (entity: MentionableEntity) => {
    if (!textareaRef.current) return;

    const cursorPosition = textareaRef.current.selectionStart || 0;
    const { text: newText, newCursorPosition } = insertMention(
      value,
      cursorPosition,
      entity.name
    );

    // Update value and metadata
    const resolvedEntities = resolveMentions(newText, mentionables);
    const metadata = groupMentionsByType(resolvedEntities);
    onChange(newText, metadata);

    // Close autocomplete
    setShowAutocomplete(false);
    setAutocompleteQuery('');

    // Restore focus and cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
      }
    }, 0);
  };

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [autocompleteQuery]);

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={cn(
          'font-mono text-sm',
          '[&_@[\\w\\-]+]:text-primary [&_@[\\w\\-]+]:font-semibold',
          className
        )}
        style={{
          // Syntax highlighting for @mentions via CSS
          background: 'transparent',
        }}
      />

      {/* Autocomplete Popover */}
      {showAutocomplete && (
        <div
          className="absolute z-[100] w-80 max-h-64 overflow-auto bg-popover border border-border rounded-md shadow-lg"
          style={{
            top: `${popoverPosition?.top || 30}px`,
            left: `${popoverPosition?.left || 0}px`,
          }}
        >
          <Command>
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Loading...</span>
                </div>
              ) : filteredMentionables.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {autocompleteQuery ? `No entities found matching "${autocompleteQuery}"` : 'No entities available'}
                </div>
              ) : (
                <CommandGroup>
                  {filteredMentionables.slice(0, 10).map((entity, index) => {
                    const Icon = MENTION_ICONS[entity.type];
                    const isSelected = index === selectedIndex;

                    return (
                      <CommandItem
                        key={`${entity.type}-${entity.id}`}
                        value={entity.name}
                        onSelect={() => handleSelectMention(entity)}
                        className={cn(
                          'cursor-pointer',
                          isSelected && 'bg-accent'
                        )}
                      >
                        <Icon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div className="flex-1">
                          <div className="font-medium">{entity.name}</div>
                          {entity.description && (
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {entity.description}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground ml-2 capitalize">
                          {entity.type}
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
