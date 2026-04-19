/* Design System tokens page */

const DesignSystemPage = () => {
  const [copied, setCopied] = React.useState(null);
  const copyToken = (t) => { navigator.clipboard?.writeText(t); setCopied(t); setTimeout(() => setCopied(null), 900); };

  const colorTokens = [
    ['background', 'Page background'],
    ['foreground', 'Body text'],
    ['card', 'Card surface'],
    ['popover', 'Floating surfaces'],
    ['primary', 'Ember accent'],
    ['secondary', 'Subtle surfaces'],
    ['muted', 'Muted blocks'],
    ['muted-foreground', 'Secondary text'],
    ['accent', 'Hover surfaces'],
    ['border', 'Hairlines'],
    ['destructive', 'Destructive'],
    ['sidebar', 'Sidebar chrome'],
  ];

  const spacing = [0, 1, 2, 3, 4, 6, 8, 12, 16, 24];
  const radii = [['sm','4px'],['md','6px'],['lg','8px'],['xl','12px'],['full','999px']];

  return (
    <div className="sc-fade-in" style={{padding:'28px 32px', maxWidth:1200, margin:'0 auto'}}>
      <header style={{marginBottom:28}}>
        <div className="sc-label" style={{marginBottom:6}}>Foundation</div>
        <h1 className="font-serif" style={{fontSize:36, margin:0, letterSpacing:'0.01em'}}>Scryer Design System</h1>
        <p style={{color:'var(--muted-foreground)', marginTop:8, maxWidth:600}}>
          Dark-first surface tokens, a serif/sans pairing, and reference-document density.
          Shared across marketing, auth, campaign tools, and VTT.
        </p>
      </header>

      {/* Typography */}
      <Section title="Typography" subtitle="Inter for UI, Cinzel for display, Kalam for flavor notes.">
        <div className="sc-card" style={{padding:24, display:'grid', gridTemplateColumns:'180px 1fr', gap:20, alignItems:'baseline'}}>
          <TokenTag>Display / 48</TokenTag>
          <div className="font-serif" style={{fontSize:48, lineHeight:1.05}}>A tale retold in ember and tide.</div>

          <TokenTag>Title / Serif 28</TokenTag>
          <div className="font-serif" style={{fontSize:28}}>The Stormcrow's Bounty</div>

          <TokenTag>Heading / 20 semibold</TokenTag>
          <div style={{fontSize:20, fontWeight:600}}>Session five — the sunken chapel</div>

          <TokenTag>Body / 14</TokenTag>
          <div style={{fontSize:14, maxWidth:560, color:'var(--card-foreground)'}}>
            The tide broke grey against the black cliffs as the <em>Gale's Reckoning</em> slipped into Lantern Cove. Something watched from the lighthouse.
          </div>

          <TokenTag>Small / 12</TokenTag>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>Updated 2 days ago · 6 contributors</div>

          <TokenTag>Mono / 12</TokenTag>
          <div className="font-mono" style={{fontSize:12, color:'var(--muted-foreground)'}}>2d20kh1 + 5 → 18</div>

          <TokenTag>Flavor / Kalam</TokenTag>
          <div className="font-hand" style={{fontSize:18, color:'var(--primary)'}}>"don't trust the quartermaster"</div>
        </div>
      </Section>

      {/* Colors */}
      <Section title="Color tokens" subtitle="CSS variables. Each theme swaps them wholesale.">
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12}}>
          {colorTokens.map(([name, desc]) => (
            <button key={name} onClick={() => copyToken(`var(--${name})`)} className="sc-card sc-card-hover" style={{padding:0, overflow:'hidden', textAlign:'left', cursor:'pointer', border:'1px solid var(--border)'}}>
              <div style={{height:56, background:`var(--${name})`, borderBottom:'1px solid var(--border)'}}/>
              <div style={{padding:'10px 12px'}}>
                <div className="font-mono" style={{fontSize:12}}>--{name}</div>
                <div style={{fontSize:11, color:'var(--muted-foreground)', marginTop:2}}>
                  {copied === `var(--${name})` ? 'copied ✓' : desc}
                </div>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Spacing */}
      <Section title="Spacing & radii" subtitle="4px base grid. Borders are 1px hairlines.">
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:20}}>
          <div className="sc-card" style={{padding:20}}>
            <div className="sc-label" style={{marginBottom:12}}>Spacing (× 4px)</div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {spacing.map(n => (
                <div key={n} style={{display:'flex', alignItems:'center', gap:12}}>
                  <div className="font-mono" style={{fontSize:11, color:'var(--muted-foreground)', width:48}}>{n*4}px</div>
                  <div style={{height:10, background:'var(--primary)', width:n*4, borderRadius:2, opacity:0.8}}/>
                </div>
              ))}
            </div>
          </div>
          <div className="sc-card" style={{padding:20}}>
            <div className="sc-label" style={{marginBottom:12}}>Border radius</div>
            <div style={{display:'flex', gap:14, flexWrap:'wrap'}}>
              {radii.map(([name, size]) => (
                <div key={name} style={{textAlign:'center'}}>
                  <div style={{width:64, height:64, background:'var(--secondary)', border:'1px solid var(--border)', borderRadius:size}}/>
                  <div style={{fontSize:11, marginTop:6}}>{name}</div>
                  <div className="font-mono" style={{fontSize:10, color:'var(--muted-foreground)'}}>{size}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Components */}
      <Section title="Components" subtitle="Core shadcn-style primitives adapted to Scryer.">
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:16}}>
          <div className="sc-card" style={{padding:20}}>
            <div className="sc-label" style={{marginBottom:12}}>Buttons</div>
            <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
              <button className="sc-btn sc-btn-primary"><Icon name="plus" size={14}/>Create</button>
              <button className="sc-btn">Secondary</button>
              <button className="sc-btn sc-btn-ghost">Ghost</button>
              <button className="sc-btn sc-btn-sm">Small</button>
              <button className="sc-btn sc-btn-icon" aria-label="settings"><Icon name="settings" size={14}/></button>
              <button className="sc-btn" disabled style={{opacity:0.5, cursor:'not-allowed'}}>Disabled</button>
            </div>
          </div>

          <div className="sc-card" style={{padding:20}}>
            <div className="sc-label" style={{marginBottom:12}}>Badges</div>
            <div style={{display:'flex', flexWrap:'wrap', gap:8}}>
              <span className="sc-badge">Player</span>
              <span className="sc-badge sc-badge-dm"><Icon name="crown" size={11}/>DM</span>
              <span className="sc-badge sc-badge-primary">Level 6</span>
              <span className="sc-badge sc-badge-dot" style={{color:'#7ec27e'}}>Online</span>
              <span className="sc-badge sc-badge-dot" style={{color:'var(--muted-foreground)'}}>Idle</span>
              <span className="sc-badge" style={{background:'color-mix(in srgb, var(--destructive) 20%, transparent)', color:'var(--destructive)', borderColor:'color-mix(in srgb, var(--destructive) 30%, transparent)'}}>Missing</span>
            </div>
          </div>

          <div className="sc-card" style={{padding:20}}>
            <div className="sc-label" style={{marginBottom:12}}>Inputs</div>
            <div style={{display:'flex', flexDirection:'column', gap:10}}>
              <input className="sc-input" placeholder="Search quests, NPCs…"/>
              <div style={{display:'flex', gap:8}}>
                <input className="sc-input" defaultValue="Captain Vhan Tellir"/>
                <button className="sc-btn sc-btn-primary"><Icon name="check" size={14}/></button>
              </div>
              <select className="sc-input" style={{appearance:'none'}}>
                <option>Human</option><option>Half-elf</option><option>Tiefling</option>
              </select>
            </div>
          </div>

          <div className="sc-card" style={{padding:20}}>
            <div className="sc-label" style={{marginBottom:12}}>Stat block row</div>
            <div className="sc-statblock">
              <div className="stat-row"><span className="stat-label">Armor Class</span><span>17 (studded leather)</span></div>
              <div className="stat-row"><span className="stat-label">Hit Points</span><span>84 / 96</span></div>
              <div className="stat-row"><span className="stat-label">Speed</span><span>30 ft, swim 30 ft</span></div>
              <div className="stat-row"><span className="stat-label">Challenge</span><span>5 (1,800 XP)</span></div>
            </div>
          </div>

          <div className="sc-card" style={{padding:20}}>
            <div className="sc-label" style={{marginBottom:12}}>DM secret</div>
            <div className="dm-secret">
              <div className="dm-secret-label"><Icon name="eyeOff" size={11}/>DM only</div>
              <div style={{color:'var(--muted-foreground)', fontSize:13}}>
                The lantern-keeper is a sahuagin priest; the light is a lure for passing ships.
              </div>
            </div>
          </div>

          <div className="sc-card" style={{padding:20}}>
            <div className="sc-label" style={{marginBottom:12}}>Empty state</div>
            <div className="empty-state" style={{padding:'20px 12px'}}>
              <div style={{width:40, height:40, borderRadius:10, background:'var(--muted)', display:'grid', placeItems:'center', marginBottom:10, color:'var(--muted-foreground)'}}>
                <Icon name="scroll" size={20}/>
              </div>
              <div style={{fontSize:13, color:'var(--foreground)', marginBottom:4}}>No quests yet</div>
              <div style={{fontSize:12, marginBottom:12}}>Quests surface in players' journals when you post them.</div>
              <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>New quest</button>
            </div>
          </div>
        </div>
      </Section>

      {/* Iconography */}
      <Section title="Iconography" subtitle="Lucide-style line icons, 1.6 stroke. Used consistently across tools.">
        <div className="sc-card" style={{padding:20, display:'grid', gridTemplateColumns:'repeat(10, 1fr)', gap:14}}>
          {['home','users','map','sword','compass','dice','hammer','scroll','star','settings','grid','search','calendar','mapPin','network','table','image','shield','anchor','ship','skull','feather','book','crown','flame','wand','palette','package','target','sparkles'].map(n => (
            <div key={n} style={{textAlign:'center', color:'var(--muted-foreground)'}}>
              <div style={{height:34, display:'grid', placeItems:'center'}}><Icon name={n} size={20}/></div>
              <div className="font-mono" style={{fontSize:9}}>{n}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
};

const TokenTag = ({children}) => (
  <div style={{fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--muted-foreground)', fontWeight:600}}>{children}</div>
);
const Section = ({title, subtitle, children}) => (
  <section style={{marginBottom:36}}>
    <div style={{marginBottom:14}}>
      <h2 className="font-serif" style={{fontSize:22, margin:0}}>{title}</h2>
      {subtitle && <div style={{fontSize:13, color:'var(--muted-foreground)', marginTop:4}}>{subtitle}</div>}
    </div>
    {children}
  </section>
);

window.DesignSystemPage = DesignSystemPage;
