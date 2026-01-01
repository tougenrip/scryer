import { Navbar } from "@/components/shared/navbar";
import { createClient } from "@/lib/supabase/server";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <div className="relative min-h-screen flex flex-col">
      <Navbar user={data.user} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40 bg-background/95">
      <div className="container px-4 md:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <h3 className="font-serif text-lg font-semibold mb-2">Scryer</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              A free, comprehensive D&D 5e digital suite for remote gameplay. 
              Virtual tabletop, character sheets, and everything you need for your adventures.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-medium mb-3">Product</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
              <li><a href="/campaigns" className="hover:text-foreground transition-colors">Campaigns</a></li>
              <li><a href="/character-creator" className="hover:text-foreground transition-colors">Character Creator</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-3">Resources</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="/docs" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">GitHub</a></li>
              <li><a href="/changelog" className="hover:text-foreground transition-colors">Changelog</a></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border/40 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Scryer. Open source and free forever.
          </p>
          <p className="text-xs text-muted-foreground">
            D&D content uses the Open Gaming License (OGL) SRD 5.1
          </p>
        </div>
      </div>
    </footer>
  );
}

