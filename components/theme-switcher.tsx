"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Moon, Sun, Check } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useDisplaySafe,
  COLOR_THEMES,
  type ColorTheme,
} from "@/contexts/display-context";

const ThemeSwitcher = () => {
  const [mounted, setMounted] = useState(false);
  const displayCtx = useDisplaySafe();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !displayCtx) {
    return null;
  }

  const { settings, setColorTheme } = displayCtx;
  const currentTheme = COLOR_THEMES[settings.colorTheme];
  const isDark = currentTheme.mode === "dark";

  const ICON_SIZE = 16;

  const darkThemes = (Object.entries(COLOR_THEMES) as [ColorTheme, (typeof COLOR_THEMES)[ColorTheme]][]).filter(
    ([, t]) => t.mode === "dark"
  );
  const lightThemes = (Object.entries(COLOR_THEMES) as [ColorTheme, (typeof COLOR_THEMES)[ColorTheme]][]).filter(
    ([, t]) => t.mode === "light"
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={"sm"} className="gap-1.5">
          {isDark ? (
            <Moon key="dark" size={ICON_SIZE} className="text-muted-foreground" />
          ) : (
            <Sun key="light" size={ICON_SIZE} className="text-muted-foreground" />
          )}
          <Palette size={ICON_SIZE} className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Moon size={12} />
          Dark Themes
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={settings.colorTheme}
          onValueChange={(val) => setColorTheme(val as ColorTheme)}
        >
          {darkThemes.map(([key, theme]) => (
            <DropdownMenuRadioItem
              key={key}
              value={key}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 flex-1">
                <div
                  className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${theme.preview.bg} 0%, ${theme.preview.card} 50%, ${theme.preview.accent} 100%)`,
                  }}
                />
                <span className="font-medium text-sm">{theme.name}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />

        <DropdownMenuLabel className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Sun size={12} />
          Light Themes
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={settings.colorTheme}
          onValueChange={(val) => setColorTheme(val as ColorTheme)}
        >
          {lightThemes.map(([key, theme]) => (
            <DropdownMenuRadioItem
              key={key}
              value={key}
              className="flex items-center gap-3 cursor-pointer"
            >
              <div className="flex items-center gap-2.5 flex-1">
                <div
                  className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0"
                  style={{
                    background: `linear-gradient(135deg, ${theme.preview.bg} 0%, ${theme.preview.card} 50%, ${theme.preview.accent} 100%)`,
                  }}
                />
                <span className="font-medium text-sm">{theme.name}</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export { ThemeSwitcher };
