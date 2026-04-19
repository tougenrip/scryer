"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/shared/user-menu";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Menu, Palette } from "lucide-react";
import { useState } from "react";
import { Logo } from "./logo";
import { TweaksPanel } from "./tweaks-panel";
import { useRole } from "@/contexts/role-context";

interface NavbarProps {
  user?: {
    email?: string;
    id?: string;
  } | null;
}

export function Navbar({ user }: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const { isDM } = useRole();

  const navLinks = [
    { href: "/campaigns", label: "Campaigns" },
    { href: "/characters", label: "Characters" },
    { href: "/generators", label: "Generators" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
            <Logo />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          {user && navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {user && (
            <span
              className={`sc-badge${isDM ? " sc-badge-dm" : ""}`}
              title={isDM ? "DM view" : "Player view"}
            >
              {isDM ? "DM view" : "Player view"}
            </span>
          )}
          <button
            className="sc-btn sc-btn-ghost sc-btn-icon"
            onClick={() => setTweaksOpen((v) => !v)}
            aria-label="Open tweaks"
            title="Tweaks"
          >
            <Palette size={16} />
          </button>

          {/* Desktop Auth/User */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <UserMenu user={user} />
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/auth/sign-up">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetTitle className="font-serif">Navigation</SheetTitle>
              <div className="flex flex-col gap-4 mt-6">
                {user && navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-lg font-medium text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {link.label}
                  </Link>
                ))}
                
                <div className="border-t border-border pt-4 mt-4">
                  {user ? (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <Button asChild variant="outline" className="w-full" onClick={() => setMobileOpen(false)}>
                        <Link href="/campaigns">Dashboard</Link>
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button asChild variant="outline" onClick={() => setMobileOpen(false)}>
                        <Link href="/auth/login">Sign in</Link>
                      </Button>
                      <Button asChild onClick={() => setMobileOpen(false)}>
                        <Link href="/auth/sign-up">Get Started</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} />
    </header>
  );
}

