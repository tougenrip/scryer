"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings,
  ChevronLeft,
  Home,
  Map,
  User,
  Swords,
  ScrollText
} from "lucide-react";

interface SidebarProps {
  campaignId: string;
  campaignName?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const sidebarItems = [
  {
    title: "Overview",
    href: "",
    icon: Home,
  },
  {
    title: "Maps",
    href: "/maps",
    icon: Map,
  },
  {
    title: "NPCs",
    href: "/npcs",
    icon: User,
  },
  {
    title: "Encounters",
    href: "/encounters",
    icon: Swords,
  },
  {
    title: "Quest Board",
    href: "/quest-board",
    icon: ScrollText,
  },
];

export function CampaignSidebar({ campaignId, campaignName, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const basePath = `/campaigns/${campaignId}`;

  return (
    <div className={cn(
      "flex flex-col h-full bg-background border-r border-primary-border transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <h2 className="font-serif font-semibold text-sidebar-foreground truncate">
              {campaignName || "Campaign"}
            </h2>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {sidebarItems.map((item) => {
            const href = `${basePath}${item.href}`;
            const isActive = pathname === href || 
              (item.href !== "" && pathname.startsWith(href));

            return (
              <Link
                key={item.href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-sidebar-foreground/70",
                  collapsed && "justify-center px-2"
                )}
                title={collapsed ? item.title : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-primary-border p-2">
        <Link
          href={`${basePath}/settings`}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            "text-primary-foreground/70 hover:bg-accent hover:text-accent-foreground",
            pathname === `${basePath}/settings` && "bg-primary text-primary-foreground",
            collapsed && "justify-center px-2"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>
    </div>
  );
}

