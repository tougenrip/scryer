/* Campaign Dashboard (hub) — Sunken Tides campaign */

const CampaignDashboard = ({ isDM }) => {
  const party = [
    { name: 'Riga Stormveil', class: 'Tempest Cleric', lvl: 6, hp: [48,54], ac: 18, player: 'Ama', online: true, portrait:'R', hue:32 },
    { name: 'Vex Quellmar', class: 'Swashbuckler Rogue', lvl: 6, hp: [42,42], ac: 16, player: 'Sam', online: true, portrait:'V', hue:14 },
    { name: 'Orroden Lark', class: 'College of Lore Bard', lvl: 6, hp: [38,44], ac: 14, player: 'Priya', online: false, portrait:'O', hue:280 },
    { name: 'Kaskar Bonecarver', class: 'Path of Storms Barbarian', lvl: 6, hp: [0,68], ac: 15, player: 'Jules', online: true, portrait:'K', hue:192 },
    { name: 'Syl Amberwake', class: 'Circle of the Moon Druid', lvl: 6, hp: [52,52], ac: 13, player: 'Ren', online: true, portrait:'S', hue:120 },
  ];

  const recent = [
    { t:'Scene', icon:'scroll', title:'The sunken chapel', meta:'Session 5 — 2d ago' },
    { t:'NPC', icon:'users', title:'Captain Vhan Tellir updated', meta:'Attitude: uneasy' },
    { t:'Map', icon:'map', title:'Lantern Cove — fog revealed (east cliffs)', meta:'4d ago' },
    { t:'Quest', icon:'scroll', title:'New quest: "The Drowned Bell"', meta:'Posted to journal' },
    { t:'Loot', icon:'package', title:'Party gained: Saltrime Cutlass (+1)', meta:'6d ago' },
  ];

  return (
    <div className="sc-fade-in" style={{padding:'24px 32px', maxWidth:1400, margin:'0 auto'}}>
      {/* Header */}
      <div style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:22, gap:20, flexWrap:'wrap'}}>
        <div>
          <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
            <span className="sc-label">Campaign</span>
            <span className="sc-badge sc-badge-dot" style={{color:'#7ec27e'}}>Session in 3 days</span>
          </div>
          <h1 className="font-serif" style={{fontSize:40, margin:0, letterSpacing:'0.01em'}}>The Sunken Tides</h1>
          <div style={{color:'var(--muted-foreground)', marginTop:6, fontSize:14}}>
            A pirate campaign in the Sundered Reach · 5 players · Session 5 of 18 planned
          </div>
        </div>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button className="sc-btn"><Icon name="users" size={14}/>Invite</button>
          <button className="sc-btn"><Icon name="hammer" size={14}/>Open Forge</button>
          <button className="sc-btn sc-btn-primary"><Icon name="play" size={14}/>Start session</button>
        </div>
      </div>

      {/* Top row: quick stats */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:20}}>
        <StatTile icon="users" label="Party" value="5" hint="4 online now"/>
        <StatTile icon="calendar" label="Sessions" value="5" hint="Next: Fri 7pm"/>
        <StatTile icon="scroll" label="Active quests" value="7" hint="2 marked urgent"/>
        <StatTile icon="skull" label="Encounters prepped" value="3" hint="CR 4–7"/>
      </div>

      {/* Main grid */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 360px', gap:20}}>
        {/* LEFT: party + timeline + tools */}
        <div style={{display:'flex', flexDirection:'column', gap:20}}>
          {/* Party */}
          <div className="sc-card" style={{padding:20}}>
            <SectionHead title="Party" icon="users" action={isDM ? 'Assign character' : null}/>
            <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12, marginTop:14}}>
              {party.map(p => <PartyCard key={p.name} p={p}/>)}
            </div>
          </div>

          {/* Story so far */}
          <div className="sc-card" style={{padding:20}}>
            <SectionHead title="Story so far" icon="book" action="View timeline"/>
            <div style={{marginTop:12, fontSize:14, lineHeight:1.75, color:'var(--card-foreground)'}}>
              <p style={{marginTop:0}}>
                Hired by the spice-guild of <span className="sc-link">Port Lisban</span> to recover a stolen reliquary,
                the crew tracked the thieves to a lantern-keeper's isle. A chapel lies half-sunk in the reef —
                bells toll beneath the waves at the turn of each tide.
              </p>
              {isDM && (
                <div className="dm-secret" style={{marginTop:10}}>
                  <div className="dm-secret-label"><Icon name="eyeOff" size={11}/>DM only</div>
                  <div style={{color:'var(--muted-foreground)'}}>
                    The lantern-keeper is Xharos, a sahuagin priest. The "reliquary" is a sealed aboleth heart.
                    If the players bring it aboard, the dreams begin on the third night.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tools panel */}
          <div className="sc-card" style={{padding:20}}>
            <SectionHead title="Tools" icon="hammer"/>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginTop:14}}>
              {[
                ['hammer','The Forge','22 scenes'],
                ['map','Maps','14 maps'],
                ['grid','VTT','Ready'],
                ['scroll','Quests','7 open'],
                ['users','NPCs','38'],
                ['mapPin','Locations','19'],
                ['calendar','Calendar','4 events'],
                ['dice','Generators','—'],
              ].map(([i,t,s]) => (
                <button key={t} className="sc-card sc-card-hover" style={{padding:'14px 12px', textAlign:'left', background:'var(--background)', cursor:'pointer'}}>
                  <div style={{color:'var(--primary)', marginBottom:8}}><Icon name={i} size={18}/></div>
                  <div style={{fontSize:13, fontWeight:500}}>{t}</div>
                  <div style={{fontSize:11, color:'var(--muted-foreground)', marginTop:2}}>{s}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: activity + DM notes */}
        <div style={{display:'flex', flexDirection:'column', gap:20}}>
          {/* DM Notes */}
          {isDM && (
            <div className="sc-card" style={{padding:20, borderColor:'color-mix(in srgb, var(--primary) 28%, var(--border))'}}>
              <SectionHead title="DM notes" icon="feather" badge="DM"/>
              <div style={{marginTop:10, fontSize:13, color:'var(--card-foreground)', lineHeight:1.7}}>
                <p className="font-hand" style={{fontSize:15, margin:'4px 0 10px', color:'var(--primary)'}}>
                  don't let them roll investigation until they light a torch in the chapel
                </p>
                <div style={{fontSize:12, color:'var(--muted-foreground)', marginTop:8}}>
                  <div style={{display:'flex', gap:6, marginBottom:4}}><Icon name="check" size={12} style={{color:'#7ec27e'}}/>Orroden's patron showed in dream</div>
                  <div style={{display:'flex', gap:6, marginBottom:4}}><Icon name="check" size={12} style={{color:'#7ec27e'}}/>Faction: Coral Court introduced</div>
                  <div style={{display:'flex', gap:6}}><Icon name="minus" size={12} style={{color:'var(--muted-foreground)'}}/>Foreshadow the storm queen</div>
                </div>
              </div>
              <button className="sc-btn sc-btn-sm" style={{marginTop:12, width:'100%'}}><Icon name="edit" size={12}/>Edit notes</button>
            </div>
          )}

          {/* Recent activity */}
          <div className="sc-card" style={{padding:20}}>
            <SectionHead title="Recent activity" icon="clock"/>
            <div style={{marginTop:8}}>
              {recent.map((r,i) => (
                <div key={i} style={{display:'flex', gap:12, padding:'10px 0', borderBottom: i < recent.length-1 ? '1px solid var(--border)' : 'none'}}>
                  <div style={{width:30, height:30, borderRadius:6, background:'var(--muted)', display:'grid', placeItems:'center', color:'var(--muted-foreground)', flexShrink:0}}>
                    <Icon name={r.icon} size={14}/>
                  </div>
                  <div style={{minWidth:0, flex:1}}>
                    <div style={{fontSize:13, fontWeight:500}}>{r.title}</div>
                    <div style={{fontSize:11, color:'var(--muted-foreground)', marginTop:1}}>{r.t} · {r.meta}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next session */}
          <div className="sc-card" style={{padding:20, background:'linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--card)), var(--card))'}}>
            <div className="sc-label" style={{marginBottom:6}}>Next session</div>
            <div className="font-serif" style={{fontSize:22, marginBottom:4}}>Session 6 · The Drowned Bell</div>
            <div style={{fontSize:12, color:'var(--muted-foreground)', marginBottom:14}}>Fri Apr 24 · 7:00 PM · ~3h</div>
            <div style={{display:'flex', gap:8}}>
              <button className="sc-btn sc-btn-primary" style={{flex:1}}><Icon name="grid" size={14}/>Enter VTT</button>
              <button className="sc-btn sc-btn-icon" aria-label="settings"><Icon name="settings" size={14}/></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatTile = ({icon, label, value, hint}) => (
  <div className="sc-card" style={{padding:16}}>
    <div style={{display:'flex', alignItems:'center', gap:8, color:'var(--muted-foreground)', fontSize:12, marginBottom:6}}>
      <Icon name={icon} size={14}/>{label}
    </div>
    <div className="font-serif" style={{fontSize:28, lineHeight:1}}>{value}</div>
    <div style={{fontSize:11, color:'var(--muted-foreground)', marginTop:6}}>{hint}</div>
  </div>
);

const SectionHead = ({title, icon, action, badge}) => (
  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
    <div style={{display:'flex', alignItems:'center', gap:8}}>
      <Icon name={icon} size={16} style={{color:'var(--muted-foreground)'}}/>
      <div style={{fontSize:13, fontWeight:600, letterSpacing:'0.02em'}}>{title}</div>
      {badge && <span className="sc-badge sc-badge-dm"><Icon name="crown" size={10}/>{badge}</span>}
    </div>
    {action && <button className="sc-btn sc-btn-ghost sc-btn-sm">{action}<Icon name="chevronRight" size={12}/></button>}
  </div>
);

const PartyCard = ({p}) => {
  const hpPct = Math.max(0, Math.min(100, (p.hp[0]/p.hp[1])*100));
  const hpColor = hpPct > 60 ? '#7ec27e' : hpPct > 25 ? '#e0a85a' : 'var(--destructive)';
  return (
    <div className="sc-card sc-card-hover" style={{padding:12, cursor:'pointer'}}>
      <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
        <div style={{
          width:40, height:40, borderRadius:10,
          background:`linear-gradient(135deg, oklch(0.55 0.18 ${p.hue}), oklch(0.3 0.1 ${p.hue}))`,
          display:'grid', placeItems:'center',
          fontFamily:'Cinzel, serif', fontSize:18, color:'white',
          border:'1px solid var(--border)',
          position:'relative'
        }}>
          {p.portrait}
          {p.online && <div style={{position:'absolute', bottom:-2, right:-2, width:10, height:10, borderRadius:999, background:'#7ec27e', border:'2px solid var(--card)'}}/>}
        </div>
        <div style={{minWidth:0, flex:1}}>
          <div className="truncate" style={{fontSize:13, fontWeight:600}}>{p.name}</div>
          <div className="truncate" style={{fontSize:11, color:'var(--muted-foreground)'}}>{p.class} · Lv {p.lvl}</div>
        </div>
      </div>
      <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted-foreground)', marginBottom:4}}>
        <span>HP {p.hp[0]}/{p.hp[1]}</span>
        <span>AC {p.ac}</span>
      </div>
      <div style={{height:4, background:'var(--muted)', borderRadius:99, overflow:'hidden'}}>
        <div style={{width:`${hpPct}%`, height:'100%', background:hpColor, transition:'width .3s'}}/>
      </div>
    </div>
  );
};

window.CampaignDashboard = CampaignDashboard;
