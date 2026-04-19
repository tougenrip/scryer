"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Link } from "@tiptap/extension-link";
import { Mention } from "@tiptap/extension-mention";
import { useMentionables } from "@/hooks/useMentionables";
import { cn } from "@/lib/utils";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import {
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Minus,
  Undo,
  Redo,
  Link as LinkIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";

// ============================================
// MENTION SUGGESTION LIST
// ============================================

interface MentionSuggestionProps {
  items: Array<{ id: string; type: string; name: string; description: string | null }>;
  command: (item: { id: string; label: string }) => void;
  selectedIndex: number;
}

function MentionSuggestionList({
  items,
  command,
  selectedIndex,
}: MentionSuggestionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selected = containerRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`
    );
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (items.length === 0) {
    return (
      <div className="bg-popover border border-border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
        No results found
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-auto w-72"
    >
      {items.map((item, index) => {
        const typeIcon =
          item.type === "npc"
            ? "👤"
            : item.type === "location"
            ? "📍"
            : item.type === "quest"
            ? "📜"
            : "⚔️";

        return (
          <button
            key={`${item.type}-${item.id}`}
            data-index={index}
            className={cn(
              "flex items-center gap-2 w-full text-left px-3 py-2 text-sm transition-colors",
              index === selectedIndex
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted"
            )}
            onClick={() => command({ id: item.id, label: item.name })}
          >
            <span className="text-base flex-shrink-0">{typeIcon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{item.name}</div>
              {item.description && (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {item.description}
                </div>
              )}
            </div>
            <span className="text-xs text-muted-foreground capitalize flex-shrink-0">
              {item.type}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ============================================
// RICH TEXT EDITOR
// ============================================

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  campaignId?: string | null;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
  minHeight?: string;
  id?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  campaignId = null,
  className,
  disabled = false,
  compact = false,
  minHeight = "120px",
  id,
}: RichTextEditorProps) {
  const { mentionables, searchMentionables } = useMentionables(campaignId);
  const mentionablesRef = useRef(mentionables);
  const searchRef = useRef(searchMentionables);
  const [isFocused, setIsFocused] = useState(false);

  // Keep refs updated
  useEffect(() => {
    mentionablesRef.current = mentionables;
    searchRef.current = searchMentionables;
  }, [mentionables, searchMentionables]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline cursor-pointer" },
      }),
      Mention.configure({
        HTMLAttributes: {
          class:
            "mention bg-primary/10 text-primary rounded px-1 py-0.5 font-medium cursor-pointer",
        },
        suggestion: {
          items: ({ query }: { query: string }) => {
            const results = query
              ? searchRef.current(query)
              : mentionablesRef.current.slice(0, 10);
            return results.slice(0, 8);
          },
          render: () => {
            let component: ReactRenderer<any> | null = null;
            let popup: TippyInstance[] | null = null;

            return {
              onStart: (props: any) => {
                component = new ReactRenderer(MentionSuggestionList, {
                  props: { ...props, selectedIndex: 0 },
                  editor: props.editor,
                });

                if (!props.clientRect) return;

                popup = tippy("body", {
                  getReferenceClientRect: props.clientRect,
                  appendTo: () => document.body,
                  content: component.element,
                  showOnCreate: true,
                  interactive: true,
                  trigger: "manual",
                  placement: "bottom-start",
                });
              },
              onUpdate: (props: any) => {
                component?.updateProps(props);
                if (popup?.[0] && props.clientRect) {
                  popup[0].setProps({
                    getReferenceClientRect: props.clientRect,
                  });
                }
              },
              onKeyDown: (props: any) => {
                if (props.event.key === "Escape") {
                  popup?.[0]?.hide();
                  return true;
                }
                // Handle arrow keys and enter for the suggestion list
                const currentProps = (component as any)?.props;
                if (!currentProps) return false;

                const items = currentProps.items || [];
                let selectedIndex = currentProps.selectedIndex || 0;

                if (props.event.key === "ArrowDown") {
                  selectedIndex = (selectedIndex + 1) % items.length;
                  component?.updateProps({ ...currentProps, selectedIndex });
                  return true;
                }
                if (props.event.key === "ArrowUp") {
                  selectedIndex =
                    (selectedIndex - 1 + items.length) % items.length;
                  component?.updateProps({ ...currentProps, selectedIndex });
                  return true;
                }
                if (props.event.key === "Enter") {
                  const item = items[selectedIndex];
                  if (item) {
                    currentProps.command({
                      id: item.id,
                      label: item.name,
                    });
                  }
                  return true;
                }
                return false;
              },
              onExit: () => {
                popup?.[0]?.destroy();
                component?.destroy();
              },
            };
          },
        },
      }),
    ],
    content: value || "",
    editable: !disabled,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onFocus: () => setIsFocused(true),
    onBlur: () => setIsFocused(false),
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none",
          "prose-headings:font-serif prose-headings:mb-2 prose-headings:mt-4",
          "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
          "prose-blockquote:border-l-primary/50 prose-blockquote:text-muted-foreground",
          "prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-sm",
          "[&_.mention]:bg-primary/10 [&_.mention]:text-primary [&_.mention]:rounded [&_.mention]:px-1 [&_.mention]:py-0.5 [&_.mention]:font-medium"
        ),
        ...(id ? { id } : {}),
      },
    },
  });

  // Sync external value changes (e.g., when form resets)
  const lastExternalValue = useRef(value);
  useEffect(() => {
    if (editor && value !== lastExternalValue.current) {
      lastExternalValue.current = value;
      const currentContent = editor.getHTML();
      // Only update if content actually differs to avoid cursor jump
      if (currentContent !== value) {
        editor.commands.setContent(value || "", { emitUpdate: false });
      }
    }
  }, [value, editor]);

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [disabled, editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className={cn(
        "rounded-md border border-input bg-background transition-colors",
        isFocused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {/* Toolbar */}
      {!compact && (
        <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-muted/30">
          <Toggle
            size="sm"
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled}
            aria-label="Bold"
            className="h-7 w-7 p-0"
          >
            <Bold className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled}
            aria-label="Italic"
            className="h-7 w-7 p-0"
          >
            <Italic className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("strike")}
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            disabled={disabled}
            aria-label="Strikethrough"
            className="h-7 w-7 p-0"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </Toggle>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 1 })}
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            disabled={disabled}
            aria-label="Heading 1"
            className="h-7 w-7 p-0"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 2 })}
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            disabled={disabled}
            aria-label="Heading 2"
            className="h-7 w-7 p-0"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("heading", { level: 3 })}
            onPressedChange={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            disabled={disabled}
            aria-label="Heading 3"
            className="h-7 w-7 p-0"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </Toggle>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Toggle
            size="sm"
            pressed={editor.isActive("bulletList")}
            onPressedChange={() =>
              editor.chain().focus().toggleBulletList().run()
            }
            disabled={disabled}
            aria-label="Bullet List"
            className="h-7 w-7 p-0"
          >
            <List className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("orderedList")}
            onPressedChange={() =>
              editor.chain().focus().toggleOrderedList().run()
            }
            disabled={disabled}
            aria-label="Ordered List"
            className="h-7 w-7 p-0"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("blockquote")}
            onPressedChange={() =>
              editor.chain().focus().toggleBlockquote().run()
            }
            disabled={disabled}
            aria-label="Quote"
            className="h-7 w-7 p-0"
          >
            <Quote className="h-3.5 w-3.5" />
          </Toggle>
          <Toggle
            size="sm"
            pressed={editor.isActive("codeBlock")}
            onPressedChange={() =>
              editor.chain().focus().toggleCodeBlock().run()
            }
            disabled={disabled}
            aria-label="Code Block"
            className="h-7 w-7 p-0"
          >
            <Code className="h-3.5 w-3.5" />
          </Toggle>

          <Separator orientation="vertical" className="h-5 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              editor.chain().focus().setHorizontalRule().run()
            }
            disabled={disabled}
            aria-label="Horizontal Rule"
            className="h-7 w-7 p-0"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={addLink}
            disabled={disabled}
            aria-label="Add Link"
            className={cn(
              "h-7 w-7 p-0",
              editor.isActive("link") && "bg-accent"
            )}
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={disabled || !editor.can().undo()}
            aria-label="Undo"
            className="h-7 w-7 p-0"
          >
            <Undo className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={disabled || !editor.can().redo()}
            aria-label="Redo"
            className="h-7 w-7 p-0"
          >
            <Redo className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Editor Content */}
      <div
        className="px-3 py-2"
        style={{ minHeight }}
        onClick={() => editor?.chain().focus().run()}
      >
        <EditorContent editor={editor} />
      </div>

      {/* Mention hint */}
      {campaignId && (
        <div className="px-3 py-1.5 border-t border-border bg-muted/20">
          <p className="text-[10px] text-muted-foreground">
            Type <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">@</kbd> to mention
            NPCs, locations, quests, or factions
          </p>
        </div>
      )}
    </div>
  );
}
