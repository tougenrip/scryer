"use client";

import { cn } from "@/lib/utils";
import { isRichTextHtmlVisuallyEmpty } from "@/lib/utils/rich-text-html";

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

/**
 * Read-only renderer for rich text HTML content.
 * Renders Tiptap HTML output with consistent styling and clickable @mention links.
 */
export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  if (isRichTextHtmlVisuallyEmpty(content)) {
    return null;
  }

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:font-serif prose-headings:mb-2 prose-headings:mt-3",
        "prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5",
        "prose-blockquote:border-l-primary/50 prose-blockquote:text-muted-foreground",
        "prose-code:bg-muted prose-code:px-1 prose-code:rounded prose-code:text-sm",
        "prose-a:text-primary prose-a:underline",
        // Mention node styling
        "[&_[data-type='mention']]:bg-primary/10 [&_[data-type='mention']]:text-primary",
        "[&_[data-type='mention']]:rounded [&_[data-type='mention']]:px-1 [&_[data-type='mention']]:py-0.5",
        "[&_[data-type='mention']]:font-medium [&_[data-type='mention']]:cursor-pointer",
        "[&_[data-type='mention']]:hover:bg-primary/20 [&_[data-type='mention']]:transition-colors",
        // Also style spans with .mention class (from the editor)
        "[&_.mention]:bg-primary/10 [&_.mention]:text-primary",
        "[&_.mention]:rounded [&_.mention]:px-1 [&_.mention]:py-0.5",
        "[&_.mention]:font-medium [&_.mention]:cursor-pointer",
        "[&_.mention]:hover:bg-primary/20 [&_.mention]:transition-colors",
        className
      )}
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
