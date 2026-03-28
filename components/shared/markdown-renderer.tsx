"use client";

import { useMemo } from "react";
import { marked } from "marked";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  // For streaming content that may be incomplete
  streaming?: boolean;
}

// Configure marked for safe rendering
marked.setOptions({
  gfm: true,
  breaks: true,
});

export function MarkdownRenderer({
  content,
  className,
  streaming = false,
}: MarkdownRendererProps) {
  const htmlContent = useMemo(() => {
    if (!content) return "";
    
    try {
      // Parse markdown to HTML
      const parsed = marked.parse(content, { async: false }) as string;
      return parsed;
    } catch (error) {
      console.error("Error parsing markdown:", error);
      return content;
    }
  }, [content]);

  if (!content) {
    return null;
  }

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        // Custom styling for generated content
        "prose-headings:font-serif prose-headings:text-foreground",
        "prose-h1:text-xl prose-h1:font-bold prose-h1:mb-3 prose-h1:mt-4 prose-h1:border-b prose-h1:border-border prose-h1:pb-2",
        "prose-h2:text-lg prose-h2:font-semibold prose-h2:mb-2 prose-h2:mt-4 prose-h2:text-primary",
        "prose-h3:text-base prose-h3:font-medium prose-h3:mb-2 prose-h3:mt-3",
        "prose-p:text-foreground prose-p:mb-3 prose-p:leading-relaxed",
        "prose-strong:text-foreground prose-strong:font-semibold",
        "prose-ul:my-2 prose-ul:pl-4 prose-li:text-foreground prose-li:my-1",
        "prose-ol:my-2 prose-ol:pl-4",
        "prose-blockquote:border-l-primary prose-blockquote:bg-muted/30 prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r",
        "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono",
        "prose-pre:bg-muted prose-pre:rounded-md prose-pre:p-3",
        "prose-hr:border-border prose-hr:my-4",
        // Animation for streaming content
        streaming && "animate-pulse-subtle",
        className
      )}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

// Simpler prose styles for compact display
export function MarkdownRendererCompact({
  content,
  className,
}: Omit<MarkdownRendererProps, "streaming">) {
  const htmlContent = useMemo(() => {
    if (!content) return "";
    
    try {
      const parsed = marked.parse(content, { async: false }) as string;
      return parsed;
    } catch (error) {
      console.error("Error parsing markdown:", error);
      return content;
    }
  }, [content]);

  if (!content) {
    return null;
  }

  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        "prose-headings:font-serif prose-headings:text-foreground prose-headings:mb-1 prose-headings:mt-2",
        "prose-h1:text-base prose-h2:text-sm prose-h3:text-sm",
        "prose-p:mb-2 prose-p:text-sm",
        "prose-ul:my-1 prose-li:my-0.5 prose-li:text-sm",
        className
      )}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}
