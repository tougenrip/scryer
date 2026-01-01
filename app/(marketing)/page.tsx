import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Map, 
  Users, 
  Dices, 
  Scroll, 
  Swords, 
  Sparkles,
  BookOpen,
  Shield,
  Wand2,
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div 
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          />
        </div>

        <div className="container px-4 md:px-6 py-24 md:py-32 lg:py-40">
          <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Free & Open Source</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight">
              Your Complete{" "}
              <span className="text-primary relative">
                D&D 5e
                <svg className="absolute -bottom-2 left-0 w-full h-3 text-primary/30" viewBox="0 0 200 12" preserveAspectRatio="none">
                  <path d="M0,6 Q50,0 100,6 T200,6" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
              </span>
              {" "}Digital Suite
            </h1>

            {/* Subheadline */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              Virtual tabletop, character sheets, dice rolling, and campaign management — 
              all in one place. No subscriptions, no paywalls, just adventure.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button asChild size="lg" className="gap-2 text-base">
                <Link href="/auth/sign-up">
                  Start Your Adventure
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link href="#features">Explore Features</Link>
              </Button>
            </div>

            {/* Social Proof */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-chart-2" />
                <span>SRD 5.1 Content</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-chart-2" />
                <span>Real-time Multiplayer</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-chart-2" />
                <span>Unlimited Homebrew</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 md:py-28 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Play
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Built by players, for players. Scryer provides all the essential tools 
              for running D&D campaigns online.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={Map}
              title="Virtual Tabletop"
              description="Upload maps, place tokens, and run encounters with real-time synchronization across all players."
            />
            <FeatureCard
              icon={Users}
              title="Character Sheets"
              description="Full 5e character sheets with automatic calculations, spell tracking, and inventory management."
            />
            <FeatureCard
              icon={Dices}
              title="Integrated Dice Roller"
              description="Roll any dice combination with advantage, disadvantage, and modifiers. Shared rolls visible to all."
            />
            <FeatureCard
              icon={Swords}
              title="Combat Tracker"
              description="Initiative tracking, HP management, condition effects, and turn order — all in real-time."
            />
            <FeatureCard
              icon={BookOpen}
              title="SRD Content Library"
              description="Complete access to spells, monsters, equipment, and class features from the 5.1 SRD."
            />
            <FeatureCard
              icon={Wand2}
              title="Homebrew Tools"
              description="Create custom spells, monsters, items, and more. Clone and modify SRD content easily."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
              Start Playing in Minutes
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get your campaign running with just a few clicks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number="1"
              title="Create a Campaign"
              description="Set up your campaign and invite your players with a simple link."
            />
            <StepCard
              number="2"
              title="Build Characters"
              description="Use the step-by-step character creator or import existing characters."
            />
            <StepCard
              number="3"
              title="Start Playing"
              description="Upload maps, roll dice, and track combat — all in real-time."
            />
          </div>
        </div>
      </section>

      {/* For DMs & Players */}
      <section className="py-20 md:py-28 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* DM Features */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Shield className="h-4 w-4" />
                <span>For Dungeon Masters</span>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold">
                Run Your Game Your Way
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Full control over maps, tokens, and fog of war</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Create and manage custom monsters and NPCs</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Track initiative, HP, and conditions in real-time</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <span>Private rolls and DM-only notes</span>
                </li>
              </ul>
            </div>

            {/* Player Features */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-chart-2/20 bg-chart-2/10 px-3 py-1 text-sm font-medium text-chart-2">
                <Scroll className="h-4 w-4" />
                <span>For Players</span>
              </div>
              <h2 className="font-serif text-3xl md:text-4xl font-bold">
                Focus on the Adventure
              </h2>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-chart-2 mt-0.5 shrink-0" />
                  <span>Beautiful, responsive character sheets</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-chart-2 mt-0.5 shrink-0" />
                  <span>One-click dice rolls with all modifiers</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-chart-2 mt-0.5 shrink-0" />
                  <span>Spell and feature reference at your fingertips</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-chart-2 mt-0.5 shrink-0" />
                  <span>Automatic HP and spell slot tracking</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 md:p-12 lg:p-16 overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
            
            <div className="relative z-10 text-center max-w-2xl mx-auto">
              <h2 className="font-serif text-3xl md:text-4xl font-bold mb-4">
                Ready to Begin Your Quest?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join Scryer today and bring your campaigns to life. 
                Free forever, no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/auth/sign-up">
                    Create Free Account
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/auth/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="group hover:border-primary/30 transition-colors">
      <CardHeader>
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="font-serif text-xl">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription className="text-base">{description}</CardDescription>
      </CardContent>
    </Card>
  );
}

function StepCard({ 
  number, 
  title, 
  description 
}: { 
  number: string; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-serif text-xl font-bold mb-4">
        {number}
      </div>
      <h3 className="font-serif text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

