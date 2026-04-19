/* The Forge — additional tab components */

/* ---------- Timeline ---------- */
const TimelineTab = ({ isDM }) => {
  const era = 'Year 1247 of the Drowned Accord';
  const events = [
    { year: 1189, season: 'Frost-Tide', title: 'The Lantern is Lit',  tag: 'World',   desc: 'Xharos seals the Drowned Chapel; the bell is heard across the Reach for the first time.' },
    { year: 1203, season: 'Salt-Rise', title: 'Founding of Port Lisban', tag: 'World', desc: 'Spice Guild masons raise the harbor over the ruined coral quarter.' },
    { year: 1241, season: 'Storm-Tide', title: 'Vhan takes the Revenant', tag: 'NPC',  desc: 'Captain Vhan Tellir mutinies off the Deep Maw; begins privateering under Guild writ.' },
    { year: 1245, season: 'Star-Wane', title: 'Stormcrow Reavers form', tag: 'Faction', desc: 'Mercenaries loyal to the fallen Admiralty regroup at Skull Atoll.' },
    { year: 1246, season: 'Salt-Rise', title: 'The Bell goes missing', tag: 'Plot', secret: true, desc: 'Orrick discovers the reliquary stolen from the Drowned Chapel. She hires the party. (Players do not yet know Xharos is behind it.)' },
    { year: 1247, season: 'Storm-Tide', title: 'The party arrives at Port Lisban', tag: 'Session', desc: 'Session 1 — the Revenant makes port under a red moon. Oss greets them with news of the missing bosun.' },
    { year: 1247, season: 'Storm-Tide', title: 'Ghost in the lighthouse', tag: 'Session', desc: 'Session 2 — investigation at the Lantern. Party discovers Xharos\'s ward.' },
  ];

  const visible = events.filter(e => isDM || !e.secret);

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>Timeline</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>{era} · {visible.length} events</div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <div style={{display:'flex', alignItems:'center', gap:6, padding:'0 10px', background:'var(--muted)', borderRadius:6, fontSize:11, color:'var(--muted-foreground)'}}>
            <Icon name="search" size={11}/>
            <input placeholder="Filter events…" style={{background:'transparent', border:'none', outline:'none', color:'var(--foreground)', fontSize:12, padding:'7px 0', width:140}}/>
          </div>
          <button className="sc-btn sc-btn-sm"><Icon name="eye" size={12}/>Session-only</button>
          <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>Event</button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 280px', gap:18}}>
        <div style={{position:'relative', paddingLeft:28, paddingTop:4}}>
          {/* Spine */}
          <div style={{position:'absolute', left:10, top:0, bottom:0, width:1, background:'var(--border)'}}/>
          {visible.map((e, i) => (
            <div key={i} style={{position:'relative', marginBottom:16}}>
              <div style={{
                position:'absolute', left:-22, top:8, width:11, height:11, borderRadius:99,
                background: e.secret ? 'var(--destructive)' : e.tag === 'Session' ? 'var(--primary)' : 'var(--card)',
                border:`2px solid ${e.tag === 'Session' ? 'var(--primary)' : 'var(--border)'}`,
                boxShadow: e.tag === 'Session' ? '0 0 0 4px color-mix(in srgb, var(--primary) 20%, transparent)' : 'none'
              }}/>
              <div className="sc-card sc-card-hover" style={{padding:'12px 14px'}}>
                <div style={{display:'flex', alignItems:'baseline', gap:10, marginBottom:4}}>
                  <span style={{fontSize:11, fontVariantNumeric:'tabular-nums', color:'var(--muted-foreground)', fontFamily:'var(--font-mono, ui-monospace)'}}>{e.year} · {e.season}</span>
                  <span className={`sc-badge ${e.tag==='Session'?'sc-badge-primary':''}`} style={{fontSize:9}}>{e.tag}</span>
                  {e.secret && <span className="sc-badge" style={{fontSize:9, background:'color-mix(in srgb, var(--destructive) 14%, transparent)', color:'var(--destructive)', borderColor:'color-mix(in srgb, var(--destructive) 30%, transparent)'}}><Icon name="lock" size={9}/>DM</span>}
                </div>
                <div className="font-serif" style={{fontSize:15, marginBottom:3}}>{e.title}</div>
                <div style={{fontSize:12, color:'var(--muted-foreground)', lineHeight:1.55}}>{e.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <aside style={{position:'sticky', top:0, alignSelf:'start', display:'flex', flexDirection:'column', gap:12}}>
          <div className="sc-card" style={{padding:14}}>
            <div className="sc-label" style={{marginBottom:10}}>Era markers</div>
            {[
              ['1189', 'The Lantern lit'],
              ['1203', 'Lisban founded'],
              ['1241', 'Vhan takes the Revenant'],
              ['1247', 'Present day'],
            ].map(([y, l]) => (
              <div key={y} style={{display:'flex', alignItems:'center', gap:10, padding:'6px 0', fontSize:12, borderBottom:'1px solid var(--border)'}}>
                <span style={{fontVariantNumeric:'tabular-nums', color:'var(--muted-foreground)', width:38}}>{y}</span>
                <span>{l}</span>
              </div>
            ))}
          </div>
          <div className="sc-card" style={{padding:14}}>
            <div className="sc-label" style={{marginBottom:8}}>Legend</div>
            <LegendDot color="var(--primary)" label="Session log"/>
            <LegendDot color="var(--card)" label="World / lore" border/>
            {isDM && <LegendDot color="var(--destructive)" label="DM-only plot"/>}
          </div>
        </aside>
      </div>
    </div>
  );
};

const LegendDot = ({color, label, border}) => (
  <div style={{display:'flex', alignItems:'center', gap:8, padding:'4px 0', fontSize:12}}>
    <span style={{width:10, height:10, borderRadius:99, background:color, border: border?'1.5px solid var(--border)':'none'}}/>{label}
  </div>
);

/* ---------- Calendar ---------- */
const CalendarTab = ({ isDM }) => {
  // Custom D&D-ish calendar: 5 seasons × 60 days each
  const [season, setSeason] = React.useState(2);
  const seasons = ['Frost-Tide', 'Salt-Rise', 'Storm-Tide', 'Star-Wane', 'Hush'];
  const moons = ['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  const evts = {
    4:  { t:'Festival of Lanterns', kind:'world', color:'#d6a85a' },
    9:  { t:'Session 1 — Arrival', kind:'session' },
    14: { t:'Tide auction', kind:'world', color:'#7ec27e' },
    17: { t:'Session 2 — Lighthouse', kind:'session' },
    21: { t:'Stormcrow raid (planned)', kind:'dm-secret' },
    24: { t:'Session 3 — Chapel dive', kind:'session' },
    28: { t:'Red Moon', kind:'world', color:'#c87b5a' },
    32: { t:'Spice Guild audit', kind:'world', color:'#d6a85a' },
  };

  const days = Array.from({length: 60}, (_, i) => i + 1);

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>{seasons[season]} · 1247</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>60-day season · {seasons.length} seasons per year</div>
        </div>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          <button className="sc-btn sc-btn-sm sc-btn-icon" onClick={() => setSeason(s => (s - 1 + seasons.length) % seasons.length)}><Icon name="chevronLeft" size={12}/></button>
          <div style={{display:'flex', gap:4}}>
            {seasons.map((s, i) => (
              <button key={s} onClick={() => setSeason(i)}
                className={`sc-btn sc-btn-sm ${i===season?'sc-btn-primary':''}`} style={{fontSize:11}}>{s}</button>
            ))}
          </div>
          <button className="sc-btn sc-btn-sm sc-btn-icon" onClick={() => setSeason(s => (s + 1) % seasons.length)}><Icon name="chevronRight" size={12}/></button>
          <button className="sc-btn sc-btn-primary sc-btn-sm" style={{marginLeft:8}}><Icon name="plus" size={12}/>Event</button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 300px', gap:16}}>
        <div className="sc-card" style={{padding:14}}>
          <div style={{display:'grid', gridTemplateColumns:'repeat(10, 1fr)', gap:6}}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun','Moon','Star','Void'].map(d => (
              <div key={d} style={{fontSize:10, color:'var(--muted-foreground)', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center', paddingBottom:4}}>{d}</div>
            ))}
            {days.map(d => {
              const ev = evts[d];
              const hide = ev?.kind === 'dm-secret' && !isDM;
              const shown = hide ? null : ev;
              return (
                <div key={d} style={{
                  aspectRatio:'1', border:'1px solid var(--border)', borderRadius:6, padding:6,
                  position:'relative', display:'flex', flexDirection:'column',
                  background: shown?.kind === 'session' ? 'color-mix(in srgb, var(--primary) 14%, var(--card))' :
                              shown?.kind === 'dm-secret' ? 'color-mix(in srgb, var(--destructive) 14%, var(--card))' :
                              shown ? 'var(--card)' : 'transparent',
                  cursor: shown ? 'pointer' : 'default',
                  opacity: d === 24 ? 1 : 0.96,
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span style={{fontSize:10, fontVariantNumeric:'tabular-nums', color:'var(--muted-foreground)'}}>{d}</span>
                    <span style={{fontSize:10}}>{moons[(d-1) % moons.length]}</span>
                  </div>
                  {shown && (
                    <div style={{
                      marginTop:'auto', fontSize:9, lineHeight:1.25,
                      color: shown.kind==='session' ? 'var(--primary)' : shown.kind==='dm-secret' ? 'var(--destructive)' : 'var(--foreground)',
                      fontWeight: shown.kind==='session' ? 600 : 500
                    }}>
                      {shown.kind === 'dm-secret' && <Icon name="lock" size={8} style={{marginRight:2}}/>}
                      {shown.t.length > 22 ? shown.t.slice(0, 20)+'…' : shown.t}
                    </div>
                  )}
                  {d === 24 && <div style={{position:'absolute', inset:-1, border:'1.5px solid var(--primary)', borderRadius:6, pointerEvents:'none'}}/>}
                </div>
              );
            })}
          </div>
        </div>

        <aside style={{display:'flex', flexDirection:'column', gap:12}}>
          <div className="sc-card" style={{padding:14}}>
            <div className="sc-label" style={{marginBottom:8}}>Today</div>
            <div className="font-serif" style={{fontSize:18, marginBottom:2}}>Day 24 · {seasons[season]}</div>
            <div style={{fontSize:12, color:'var(--muted-foreground)', lineHeight:1.55}}>Chapel dive — session begins at dusk. Red moon expected four nights from now.</div>
          </div>
          <div className="sc-card" style={{padding:14}}>
            <div className="sc-label" style={{marginBottom:10}}>Upcoming</div>
            {Object.entries(evts).map(([d, e]) => {
              if (e.kind === 'dm-secret' && !isDM) return null;
              return (
                <div key={d} style={{display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid var(--border)'}}>
                  <span style={{width:28, textAlign:'center', fontSize:11, color:'var(--muted-foreground)', fontVariantNumeric:'tabular-nums'}}>{d}</span>
                  <span style={{width:6, height:6, borderRadius:99, background: e.kind==='session' ? 'var(--primary)' : e.kind==='dm-secret' ? 'var(--destructive)' : e.color || 'var(--muted-foreground)'}}/>
                  <span style={{fontSize:12, flex:1}}>{e.t}</span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
};

/* ---------- Random tables ---------- */
const RandomTablesTab = () => {
  const tables = [
    {
      name: 'What the tide brings in',
      die: 'd12',
      rolls: [
        '1   A sealed wine bottle — a message in pirate cant.',
        '2   Bloated body of a Stormcrow scout, still clutching a tally stick.',
        '3   A tangle of silver coins fused by heat. Worth 4d6 gp.',
        '4   A single boot. Inside: a ruby the size of a walnut.',
        '5   Driftwood carved with Celestial script: "Do not wake it."',
        '6   A child\'s doll, soaked but perfectly preserved. It blinks.',
        '7   A fisherman\'s net full of bones. Human. And not.',
        '8   Half a ship\'s figurehead — the lower half. Paint still wet.',
        '9   A lantern that only lights when held by a liar.',
        '10  A spinning top that points true north when spun.',
        '11  A cage. Empty. Locked from the inside.',
        '12  Ulomë\'s blessing: a scale the size of a shield.',
      ],
    },
    {
      name: 'Port Lisban tavern rumors',
      die: 'd8',
      rolls: [
        '1   The harbormaster drowned last moon. Who\'s the one wearing his coat?',
        '2   Xharos hasn\'t left the lighthouse in fourteen days.',
        '3   A Coral Court envoy was seen at the Spice Guild docks.',
        '4   Stormcrow colors in the Skull Atoll — more than usual.',
        '5   The bells of the Drowned Chapel rang twice at midnight.',
        '6   Madam Orrick is hiring for something. Bad pay. Worse questions.',
        '7   A Revenant sailor traded a tooth for a night\'s lodging.',
        '8   The deep was singing last night. Not everyone heard it.',
      ],
    },
    {
      name: 'Sea complications (combat)',
      die: 'd6',
      rolls: [
        '1   A rogue wave — all creatures make a DC 12 STR save or be prone.',
        '2   Rain slicks the deck — all checks to move are at disadvantage.',
        '3   A sudden squall. Light becomes dim on deck.',
        '4   A mast cracks overhead — 3d6 bludgeoning in a 10ft line.',
        '5   Something surfaces beneath. Roll a random monster encounter.',
        '6   Lightning strikes. Nearest metal-armored creature: 4d8 lightning.',
      ],
    },
  ];

  const [selected, setSelected] = React.useState(0);
  const [lastRoll, setLastRoll] = React.useState(null);

  const rollTable = () => {
    const t = tables[selected];
    const sides = parseInt(t.die.slice(1), 10);
    const n = Math.floor(Math.random()*sides) + 1;
    setLastRoll({ tableName: t.name, n, result: t.rolls[n-1] });
  };

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>Random tables</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>{tables.length} tables · quick-roll during session</div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="sc-btn sc-btn-sm"><Icon name="copy" size={12}/>Import</button>
          <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>New table</button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'220px 1fr', gap:16}}>
        <div className="sc-card" style={{padding:8, alignSelf:'start'}}>
          {tables.map((t, i) => (
            <button key={t.name} onClick={() => setSelected(i)}
              className={`sidebar-link ${selected===i?'active':''}`}
              style={{width:'100%', textAlign:'left', border:'none', marginBottom:2, padding:'8px 10px'}}>
              <span style={{fontSize:10, color:'var(--muted-foreground)', width:26}}>{t.die}</span>
              <span style={{fontSize:12}}>{t.name}</span>
            </button>
          ))}
        </div>

        <div>
          <div className="sc-card" style={{padding:18, marginBottom:12}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, gap:10}}>
              <div>
                <div className="font-serif" style={{fontSize:18}}>{tables[selected].name}</div>
                <div style={{fontSize:12, color:'var(--muted-foreground)'}}>Roll {tables[selected].die} · {tables[selected].rolls.length} entries</div>
              </div>
              <div style={{display:'flex', gap:6}}>
                <button className="sc-btn sc-btn-sm"><Icon name="edit" size={12}/>Edit</button>
                <button className="sc-btn sc-btn-primary sc-btn-sm" onClick={rollTable}><D20Icon size={12}/>Roll {tables[selected].die}</button>
              </div>
            </div>

            {lastRoll && lastRoll.tableName === tables[selected].name && (
              <div className="sc-fade-in" style={{
                padding:'12px 14px', marginBottom:12,
                background:'color-mix(in srgb, var(--primary) 10%, var(--background))',
                border:'1px solid color-mix(in srgb, var(--primary) 30%, transparent)',
                borderRadius:8, display:'flex', alignItems:'center', gap:12,
              }}>
                <div style={{
                  width:42, height:42, borderRadius:8, background:'var(--primary)', color:'var(--primary-foreground)',
                  display:'grid', placeItems:'center', fontFamily:'Cinzel, serif', fontSize:18, fontWeight:600
                }}>{lastRoll.n}</div>
                <div>
                  <div className="sc-label">Rolled</div>
                  <div style={{fontSize:13}}>{lastRoll.result.replace(/^\d+\s+/, '')}</div>
                </div>
              </div>
            )}

            <div style={{display:'flex', flexDirection:'column'}}>
              {tables[selected].rolls.map((r, i) => {
                const [n, ...rest] = r.split(/\s+/);
                return (
                  <div key={i} style={{
                    display:'grid', gridTemplateColumns:'32px 1fr auto', gap:12,
                    padding:'8px 0', borderBottom: i === tables[selected].rolls.length-1 ? 'none' : '1px solid var(--border)',
                    background: lastRoll && lastRoll.tableName === tables[selected].name && parseInt(n,10) === lastRoll.n ? 'color-mix(in srgb, var(--primary) 8%, transparent)' : 'transparent'
                  }}>
                    <span style={{fontSize:12, fontVariantNumeric:'tabular-nums', color:'var(--muted-foreground)', fontFamily:'ui-monospace, monospace'}}>{n}</span>
                    <span style={{fontSize:13, lineHeight:1.5}}>{rest.join(' ')}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Encounters ---------- */
const EncountersTab = ({isDM}) => {
  const encounters = [
    { name:'Dockside Ambush', cr:'Easy',   xp:475,  creatures:'3× Bandit, 1× Bandit Captain', hook:'Stormcrow thugs jump the party on the Lisban docks at dusk.' },
    { name:'The Drowned Chapel', cr:'Hard', xp:2900, creatures:'1× Water Weird, 4× Drowned (zombie), 1× Priest', hook:'Guardians awakened when the bell is removed.' },
    { name:'Lighthouse Spirit', cr:'Medium', xp:1800, creatures:'1× Specter, 2× Shadow', hook:'What Xharos left behind when he stopped sleeping.' },
    { name:'Deep Maw passage', cr:'Deadly', xp:5400, creatures:'1× Sahuagin Baron, 6× Sahuagin, 1× Giant Shark', hook:'If the party tries to shortcut through the Maw instead of around it.' },
  ];
  const [sel, setSel] = React.useState(0);
  const e = encounters[sel];

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>Encounters</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>{encounters.length} prepared · Party: 4 × level 5</div>
        </div>
        <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>Build encounter</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'320px 1fr', gap:16}}>
        <div style={{display:'flex', flexDirection:'column', gap:8}}>
          {encounters.map((enc, i) => (
            <button key={enc.name} onClick={() => setSel(i)}
              className="sc-card sc-card-hover" style={{
                padding:12, textAlign:'left', border: i===sel?'1px solid var(--primary)':'1px solid var(--border)', cursor:'pointer',
                background: i===sel ? 'color-mix(in srgb, var(--primary) 8%, var(--card))' : 'var(--card)'
              }}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
                <span className="font-serif" style={{fontSize:14}}>{enc.name}</span>
                <span className="sc-badge" style={{
                  background: enc.cr==='Deadly' ? 'color-mix(in srgb, var(--destructive) 16%, transparent)' : enc.cr==='Hard' ? 'color-mix(in srgb, #d6a85a 18%, transparent)' : 'var(--muted)',
                  color: enc.cr==='Deadly' ? 'var(--destructive)' : enc.cr==='Hard' ? '#d6a85a' : 'var(--muted-foreground)',
                  fontSize:9, borderColor:'transparent'
                }}>{enc.cr}</span>
              </div>
              <div style={{fontSize:11, color:'var(--muted-foreground)', marginBottom:4, fontVariantNumeric:'tabular-nums'}}>{enc.xp.toLocaleString()} XP · {enc.creatures.split(',').length} creatures</div>
              <div style={{fontSize:11, color:'var(--muted-foreground)', lineHeight:1.4}}>{enc.creatures}</div>
            </button>
          ))}
        </div>

        <div style={{display:'flex', flexDirection:'column', gap:12}}>
          <div className="sc-card" style={{padding:16}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12, gap:14}}>
              <div>
                <div className="font-serif" style={{fontSize:20, marginBottom:2}}>{e.name}</div>
                <div style={{fontSize:12, color:'var(--muted-foreground)', lineHeight:1.55, maxWidth:480}}>{e.hook}</div>
              </div>
              <div style={{display:'flex', gap:6, flexShrink:0}}>
                <button className="sc-btn sc-btn-sm"><Icon name="copy" size={12}/>Duplicate</button>
                <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="play" size={12}/>Run in VTT</button>
              </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, marginBottom:14}}>
              {[['Difficulty', e.cr],['Encounter XP', e.xp.toLocaleString()],['Adjusted XP', (e.xp*1.5|0).toLocaleString()],['Threshold', 'Hard: 2,500']].map(([l,v]) => (
                <div key={l} style={{padding:'10px 12px', background:'var(--muted)', borderRadius:6}}>
                  <div className="sc-label" style={{marginBottom:2}}>{l}</div>
                  <div style={{fontSize:15, fontVariantNumeric:'tabular-nums', fontFamily:'Cinzel, serif'}}>{v}</div>
                </div>
              ))}
            </div>

            <div className="sc-label" style={{marginBottom:8}}>Creatures</div>
            <div style={{border:'1px solid var(--border)', borderRadius:8, overflow:'hidden'}}>
              <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
                <thead>
                  <tr style={{background:'var(--muted)', color:'var(--muted-foreground)', textAlign:'left'}}>
                    <th style={{padding:'8px 10px', fontWeight:600, fontSize:11, letterSpacing:'0.04em', textTransform:'uppercase'}}>Count</th>
                    <th style={{padding:'8px 10px', fontWeight:600, fontSize:11, letterSpacing:'0.04em', textTransform:'uppercase'}}>Name</th>
                    <th style={{padding:'8px 10px', fontWeight:600, fontSize:11, letterSpacing:'0.04em', textTransform:'uppercase'}}>CR</th>
                    <th style={{padding:'8px 10px', fontWeight:600, fontSize:11, letterSpacing:'0.04em', textTransform:'uppercase'}}>HP</th>
                    <th style={{padding:'8px 10px', fontWeight:600, fontSize:11, letterSpacing:'0.04em', textTransform:'uppercase'}}>AC</th>
                    <th style={{padding:'8px 10px', fontWeight:600, fontSize:11, letterSpacing:'0.04em', textTransform:'uppercase'}}>XP</th>
                  </tr>
                </thead>
                <tbody>
                  {e.creatures.split(',').map((c, i) => {
                    const m = c.trim().match(/^(\d+)×\s*(.+)$/) || [null, '1', c.trim()];
                    const xp = [100, 200, 450, 700, 1100][i % 5];
                    const hp = [11, 22, 33, 45, 65, 90][i % 6];
                    const ac = [12, 13, 14, 15, 16][i % 5];
                    const cr = ['1/8','1/2','1','2','5'][i % 5];
                    return (
                      <tr key={i} style={{borderTop: i===0 ? 'none' : '1px solid var(--border)'}}>
                        <td style={{padding:'8px 10px', fontVariantNumeric:'tabular-nums'}}>{m[1]}×</td>
                        <td style={{padding:'8px 10px'}}>{m[2]}</td>
                        <td style={{padding:'8px 10px', fontVariantNumeric:'tabular-nums', color:'var(--muted-foreground)'}}>{cr}</td>
                        <td style={{padding:'8px 10px', fontVariantNumeric:'tabular-nums'}}>{hp}</td>
                        <td style={{padding:'8px 10px', fontVariantNumeric:'tabular-nums'}}>{ac}</td>
                        <td style={{padding:'8px 10px', fontVariantNumeric:'tabular-nums', color:'var(--muted-foreground)'}}>{xp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {isDM && (
            <div className="sc-card" style={{padding:14, borderColor:'color-mix(in srgb, var(--primary) 30%, var(--border))'}}>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:8}}>
                <Icon name="crown" size={14} style={{color:'var(--primary)'}}/>
                <span className="sc-label">DM notes</span>
              </div>
              <div style={{fontSize:12, lineHeight:1.6, color:'var(--muted-foreground)'}}>
                If the party retreats, the Priest rings the bell — bring in 2× Drowned per round until dispersed. The Water Weird can be talked down by offering a name; Xharos\'s true name is the key.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------- NPCs list ---------- */
const NPCsTab = ({isDM}) => {
  const npcs = [
    { n:'Captain Vhan Tellir',   role:'Ally',  location:'The Revenant',  race:'Human',     attitude:'Warm',    hook:'Privateer captain who owes the party passage.', secret:false },
    { n:'Xharos the Lantern-Keeper', role:'???', location:'Lantern Cove', race:'Half-elf', attitude:'Shrouded', hook:'Keeper of the Drowned Chapel. Does not blink.', secret:true },
    { n:'Harbormaster Oss',      role:'Ally',  location:'Port Lisban',   race:'Dwarf',     attitude:'Dutiful', hook:'Runs the docks. Hears everything.', secret:false },
    { n:'Madam Orrick',          role:'Patron',location:'Lisban',        race:'Tiefling',  attitude:'Transactional', hook:'Spice Guild magistrate. Hired the party.', secret:false },
    { n:'Corporal Dren',         role:'Neutral',location:'Port Watch',   race:'Half-orc',  attitude:'Tired',   hook:'City watch — takes bribes for paperwork, not for violence.', secret:false },
    { n:'Riga Stormveil',        role:'Party', location:'The Revenant',  race:'Aasimar',   attitude:'Devout',  hook:'Cleric of Ulomë. Traveling with the party.', secret:false },
    { n:'The Drowned Queen',     role:'Enemy', location:'Deep Maw',      race:'???',       attitude:'Hungering',hook:'Ancient thing beneath the Maw. Xharos keeps her asleep.', secret:true },
  ];
  const [q, setQ] = React.useState('');
  const [filter, setFilter] = React.useState('all');
  const list = npcs.filter(n => (isDM || !n.secret) && (filter==='all' || n.role.toLowerCase()===filter) && n.n.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, flexWrap:'wrap', gap:10}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>NPCs</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>{list.length} of {npcs.filter(n=>isDM||!n.secret).length} shown</div>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <div style={{position:'relative'}}>
            <Icon name="search" size={12} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted-foreground)'}}/>
            <input className="sc-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Search NPCs…" style={{paddingLeft:30, width:200, fontSize:12}}/>
          </div>
          <div style={{display:'flex', gap:2, padding:2, background:'var(--muted)', borderRadius:6}}>
            {['all','ally','enemy','neutral','patron'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`sc-btn sc-btn-sm ${filter===f?'sc-btn-primary':'sc-btn-ghost'}`} style={{fontSize:11, textTransform:'capitalize', padding:'4px 10px'}}>{f}</button>
            ))}
          </div>
          <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>NPC</button>
        </div>
      </div>

      <div className="sc-card" style={{overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
          <thead>
            <tr style={{background:'var(--muted)', color:'var(--muted-foreground)', textAlign:'left'}}>
              {['Name','Role','Race','Location','Attitude','Hook',''].map(h => (
                <th key={h} style={{padding:'10px 14px', fontWeight:600, fontSize:11, letterSpacing:'0.04em', textTransform:'uppercase'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map((n, i) => (
              <tr key={n.n} className="sc-card-hover" style={{borderTop: i===0?'none':'1px solid var(--border)', cursor:'pointer'}}>
                <td style={{padding:'12px 14px'}}>
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <div style={{width:28, height:28, borderRadius:6, background:'color-mix(in srgb, var(--primary) 24%, var(--muted))', color:'var(--primary-foreground, #fff)', display:'grid', placeItems:'center', fontSize:11, fontWeight:600, fontFamily:'Cinzel, serif'}}>
                      {n.n.split(' ').filter(Boolean).map(w=>w[0]).slice(0,2).join('')}
                    </div>
                    <div style={{display:'flex', flexDirection:'column'}}>
                      <span style={{fontWeight:500}}>{n.n}</span>
                      {n.secret && <span style={{fontSize:10, color:'var(--destructive)'}}><Icon name="lock" size={9}/> DM-only</span>}
                    </div>
                  </div>
                </td>
                <td style={{padding:'12px 14px'}}>
                  <span className={`sc-badge ${n.role==='Ally'?'sc-badge-primary':''}`} style={{fontSize:10}}>{n.role}</span>
                </td>
                <td style={{padding:'12px 14px', color:'var(--muted-foreground)'}}>{n.race}</td>
                <td style={{padding:'12px 14px', color:'var(--muted-foreground)'}}>{n.location}</td>
                <td style={{padding:'12px 14px'}}>{n.attitude}</td>
                <td style={{padding:'12px 14px', color:'var(--muted-foreground)', maxWidth:280}} className="truncate">{n.hook}</td>
                <td style={{padding:'12px 14px', textAlign:'right'}}>
                  <button className="sc-btn sc-btn-sm sc-btn-ghost sc-btn-icon"><Icon name="more" size={12}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* ---------- Locations (atlas) ---------- */
const LocationsTab = ({isDM}) => {
  const pins = [
    { id:'lisban', x:22, y:48, name:'Port Lisban', kind:'city', desc:'Spice-port on the Reach. 18,000 souls. Guild-run.'},
    { id:'cove',   x:70, y:70, name:'Lantern Cove', kind:'landmark', desc:'The old lighthouse. Xharos keeps the flame.'},
    { id:'chapel', x:48, y:55, name:'Drowned Chapel', kind:'ruin', desc:'A temple to Nharath, flooded centuries ago.'},
    { id:'skull',  x:82, y:32, name:'Skull Atoll', kind:'danger', desc:'Stormcrow stronghold. Do not approach by day.'},
    { id:'maw',    x:55, y:82, name:'The Deep Maw', kind:'danger', desc:'A trench of impossible depth. Something sleeps.', secret:true},
    { id:'reach',  x:32, y:22, name:'The Sundered Reach', kind:'region', desc:'The archipelago itself. Named for its cracked coast.'},
  ];
  const [sel, setSel] = React.useState('lisban');
  const kindColor = { city:'#7ec27e', landmark:'var(--primary)', ruin:'#d6a85a', danger:'var(--destructive)', region:'#7ab0d6' };
  const visible = pins.filter(p => isDM || !p.secret);
  const p = visible.find(p => p.id === sel) || visible[0];

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>Atlas</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>{visible.length} locations · The Sundered Reach</div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="sc-btn sc-btn-sm"><Icon name="image" size={12}/>Replace map</button>
          <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>Place pin</button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:16}}>
        <div className="sc-card" style={{overflow:'hidden', position:'relative', aspectRatio:'16/10'}}>
          {/* Stylized "sea" background */}
          <svg viewBox="0 0 100 62" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{display:'block'}}>
            <defs>
              <radialGradient id="sea-glow" cx="0.5" cy="0.5" r="0.7">
                <stop offset="0" stopColor="color-mix(in srgb, var(--primary) 18%, var(--card))"/>
                <stop offset="1" stopColor="var(--card)"/>
              </radialGradient>
              <pattern id="sea-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                <path d="M 4 0 L 0 0 0 4" fill="none" stroke="var(--border)" strokeWidth="0.12" opacity="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="62" fill="url(#sea-glow)"/>
            <rect width="100" height="62" fill="url(#sea-grid)"/>
            {/* island silhouettes */}
            <path d="M15 20 Q25 18 35 22 Q40 30 30 36 Q18 34 12 28 Z" fill="color-mix(in srgb, var(--foreground) 8%, var(--card))" stroke="var(--border)" strokeWidth="0.25"/>
            <path d="M58 50 Q70 46 78 52 Q82 60 70 62 Q58 60 55 56 Z" fill="color-mix(in srgb, var(--foreground) 8%, var(--card))" stroke="var(--border)" strokeWidth="0.25"/>
            <path d="M75 25 Q82 22 88 28 Q86 34 80 34 Q74 32 73 28 Z" fill="color-mix(in srgb, var(--foreground) 8%, var(--card))" stroke="var(--border)" strokeWidth="0.25"/>
            <path d="M42 48 Q48 45 54 50 Q50 54 45 53 Z" fill="color-mix(in srgb, var(--foreground) 10%, var(--card))" stroke="var(--border)" strokeWidth="0.25"/>
            <text x="3" y="10" fontSize="2.5" fontFamily="Cinzel" fill="var(--muted-foreground)" opacity="0.65">The Sundered Reach</text>
            <text x="60" y="44" fontSize="1.8" fontFamily="Cinzel" fontStyle="italic" fill="var(--muted-foreground)" opacity="0.5">Storm-bitten Sea</text>
          </svg>

          {visible.map(pin => (
            <button key={pin.id} onClick={() => setSel(pin.id)}
              style={{
                position:'absolute', left:`${pin.x}%`, top:`${pin.y}%`,
                transform:'translate(-50%, -100%)',
                background:'transparent', border:'none', cursor:'pointer', padding:0
              }}>
              <svg width="24" height="30" viewBox="0 0 24 30">
                <path d="M12 0 C5 0 0 5 0 12 C0 20 12 30 12 30 C12 30 24 20 24 12 C24 5 19 0 12 0 Z"
                  fill={kindColor[pin.kind]} opacity={sel===pin.id?1:0.82}
                  stroke="var(--card)" strokeWidth={sel===pin.id?2:1.2}/>
                <circle cx="12" cy="12" r="3.5" fill="var(--card)"/>
                {pin.secret && <circle cx="18" cy="4" r="3" fill="var(--destructive)" stroke="var(--card)" strokeWidth="1"/>}
              </svg>
              {sel === pin.id && (
                <div style={{
                  position:'absolute', left:'50%', bottom:'calc(100% + 4px)', transform:'translateX(-50%)',
                  background:'var(--popover)', color:'var(--popover-foreground)', border:'1px solid var(--border)',
                  padding:'4px 8px', borderRadius:4, fontSize:11, whiteSpace:'nowrap', fontFamily:'Cinzel, serif'
                }}>{pin.name}</div>
              )}
            </button>
          ))}

          <div style={{position:'absolute', bottom:12, left:12, display:'flex', gap:10, background:'color-mix(in srgb, var(--background) 85%, transparent)', padding:'6px 10px', borderRadius:6, border:'1px solid var(--border)', fontSize:10}}>
            {Object.entries(kindColor).map(([k,c]) => (
              <span key={k} style={{display:'flex', alignItems:'center', gap:4}}>
                <span style={{width:8, height:8, borderRadius:99, background:c}}/>
                <span style={{textTransform:'capitalize', color:'var(--muted-foreground)'}}>{k}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="sc-card" style={{padding:16, alignSelf:'start'}}>
          <div className="sc-label" style={{marginBottom:6, textTransform:'uppercase'}}>{p.kind}</div>
          <div className="font-serif" style={{fontSize:20, marginBottom:6}}>{p.name}</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)', lineHeight:1.6, marginBottom:14}}>{p.desc}</div>
          {p.secret && <div style={{padding:'8px 10px', marginBottom:12, background:'color-mix(in srgb, var(--destructive) 12%, transparent)', color:'var(--destructive)', fontSize:11, borderRadius:6, display:'flex', alignItems:'center', gap:6}}><Icon name="lock" size={11}/>Hidden from players.</div>}
          <div className="sc-label" style={{marginBottom:6}}>All locations</div>
          <div style={{display:'flex', flexDirection:'column', gap:2}}>
            {visible.map(v => (
              <button key={v.id} onClick={() => setSel(v.id)}
                className={`sidebar-link ${sel===v.id?'active':''}`}
                style={{width:'100%', textAlign:'left', border:'none', padding:'6px 8px'}}>
                <span style={{width:8, height:8, borderRadius:99, background:kindColor[v.kind]}}/>
                <span style={{fontSize:12}}>{v.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- Factions ---------- */
const FactionsTab = ({isDM}) => {
  const factions = [
    { n:'Spice Guild', stance:'Ally', pow:82, goal:'Control trade of saffron, silk, and memory-dust through Lisban.', leader:'Madam Orrick', members:'~140', color:'#d6a85a' },
    { n:'Coral Court',  stance:'Unknown', pow:68, goal:'Maintain dominion of the reefs; unclear long-term aims.', leader:'The Tidemother', members:'Unknown', color:'#5b9bd5' },
    { n:'Stormcrow Reavers', stance:'Enemy', pow:54, goal:'Raid shipping; destabilize the Guild monopoly.', leader:'Ruka the Unmoored', members:'~90', color:'var(--destructive)' },
    { n:'Bell Friars', stance:'Neutral', pow:28, goal:'Tend the drowned shrines. Ring the bell at each red moon.', leader:'Prior Casten', members:'14', color:'#b583e0' },
    { n:'Port Watch',  stance:'Neutral', pow:40, goal:'Keep the peace. Take the bribe. Go home alive.', leader:'Captain Merl',  members:'60', color:'#7ab0d6' },
    { n:'Hollow Choir', stance:'Enemy', pow:35, goal:'Return the Drowned Queen to waking.', leader:'???', members:'Unknown', color:'var(--destructive)', secret:true },
  ];
  const list = factions.filter(f => isDM || !f.secret);

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>Factions</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>{list.length} active organizations</div>
        </div>
        <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>Faction</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:12}}>
        {list.map(f => (
          <div key={f.n} className="sc-card sc-card-hover" style={{padding:16, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', top:0, left:0, right:0, height:3, background:f.color}}/>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, gap:10}}>
              <div>
                <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:3}}>
                  <div style={{width:24, height:24, borderRadius:5, background:`color-mix(in srgb, ${f.color} 25%, var(--muted))`, display:'grid', placeItems:'center'}}>
                    <Icon name="shield" size={13} style={{color:f.color}}/>
                  </div>
                  <span className="font-serif" style={{fontSize:15}}>{f.n}</span>
                </div>
                <div style={{fontSize:11, color:'var(--muted-foreground)'}}>Led by {f.leader} · {f.members}</div>
              </div>
              <span className="sc-badge" style={{
                background: f.stance==='Ally' ? 'color-mix(in srgb, #7ec27e 20%, transparent)' : f.stance==='Enemy' ? 'color-mix(in srgb, var(--destructive) 16%, transparent)' : 'var(--muted)',
                color: f.stance==='Ally' ? '#9dd89d' : f.stance==='Enemy' ? 'var(--destructive)' : 'var(--muted-foreground)',
                borderColor:'transparent', fontSize:9
              }}>{f.stance}</span>
            </div>
            <div style={{fontSize:12, color:'var(--muted-foreground)', lineHeight:1.55, marginBottom:12}}>{f.goal}</div>
            <div>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--muted-foreground)', marginBottom:4}}>
                <span>Influence</span>
                <span style={{fontVariantNumeric:'tabular-nums'}}>{f.pow}%</span>
              </div>
              <div style={{height:4, background:'var(--muted)', borderRadius:2, overflow:'hidden'}}>
                <div style={{width:`${f.pow}%`, height:'100%', background:f.color}}/>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Pantheon ---------- */
const PantheonTab = () => {
  const deities = [
    { n:'Ulomë', ep:'The Tide-Keeper',    align:'NG', domains:['Tempest','Nature'],  sym:'⚓', desc:'Patient goddess of tides, kept sailors and their stars. Worshipped in every port.', color:'#5b9bd5' },
    { n:'Nharath', ep:'The Drowned Crown',align:'NE', domains:['Death','Trickery'],  sym:'☠', desc:'Was once a king. Drowned on the night the moon turned. Not fully dead.', color:'#7b3a0f' },
    { n:'Velmaren', ep:'She Who Lights the Way', align:'LG', domains:['Light','Life'], sym:'✦', desc:'Lantern-bearer for the dead. Every lighthouse is her altar.', color:'#d6a85a' },
    { n:'Oshek',   ep:'The Salt-Bitten',  align:'CN', domains:['Trickery','Storm'],  sym:'~', desc:'God of sailors\' luck and sailors\' lies. Drink one cup for him or spill it.', color:'#7ec27e' },
    { n:'The Silent Queen', ep:'Nameless', align:'??', domains:['Death'],  sym:'Ø', desc:'No one remembers her. That is the point. The Friars leave an empty bowl.', color:'#b583e0' },
  ];

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>The Pantheon</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>{deities.length} known powers of the Reach</div>
        </div>
        <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>Deity</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(340px, 1fr))', gap:14}}>
        {deities.map(d => (
          <div key={d.n} className="sc-card sc-card-hover" style={{padding:0, overflow:'hidden'}}>
            <div style={{
              background:`linear-gradient(135deg, color-mix(in srgb, ${d.color} 30%, var(--card)), var(--card))`,
              padding:'20px 16px 14px', borderBottom:'1px solid var(--border)',
              display:'flex', alignItems:'center', gap:14
            }}>
              <div style={{
                width:60, height:60, borderRadius:'50%', background:`color-mix(in srgb, ${d.color} 30%, var(--background))`,
                border:`1.5px solid ${d.color}`,
                display:'grid', placeItems:'center', fontSize:26, fontFamily:'Cinzel, serif', color:d.color
              }}>{d.sym}</div>
              <div>
                <div className="font-serif" style={{fontSize:18, letterSpacing:'0.04em'}}>{d.n}</div>
                <div style={{fontSize:12, color:'var(--muted-foreground)', fontStyle:'italic'}}>{d.ep}</div>
              </div>
            </div>
            <div style={{padding:'14px 16px'}}>
              <div style={{display:'flex', gap:6, marginBottom:10, flexWrap:'wrap'}}>
                <span className="sc-badge" style={{fontSize:10}}>{d.align}</span>
                {d.domains.map(dom => <span key={dom} className="sc-badge" style={{fontSize:10, borderColor:`color-mix(in srgb, ${d.color} 40%, transparent)`, color:d.color}}>{dom}</span>)}
              </div>
              <div style={{fontSize:12, color:'var(--muted-foreground)', lineHeight:1.6}}>{d.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Scenes ---------- */
const ScenesTab = ({isDM}) => {
  const scenes = [
    { n:'The Revenant makes port', status:'Played', session:1, summary:'Arrival at Port Lisban under a red moon. Oss greets the party.' },
    { n:'The lighthouse at Lantern Cove', status:'Played', session:2, summary:'The party investigates; Xharos is strange but civil.' },
    { n:'The Drowned Chapel', status:'Prepared', session:3, summary:'Dive into the flooded chapel to recover the reliquary.' },
    { n:'Tide auction at Lisban', status:'Draft', session:'—', summary:'An auction where something very old, and not for sale, gets stolen.' },
    { n:'The Deep Maw', status:'Locked', session:'?', summary:'Only if the players choose to go there. Probably they should not.' },
  ];
  const statusColor = { Played:'var(--muted-foreground)', Prepared:'var(--primary)', Draft:'#7ab0d6', Locked:'var(--destructive)' };
  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>Scenes</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>{scenes.length} scenes · Sorted by session</div>
        </div>
        <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>Scene</button>
      </div>
      <div style={{display:'flex', flexDirection:'column', gap:8}}>
        {scenes.map(s => (
          <div key={s.n} className="sc-card sc-card-hover" style={{padding:'14px 16px', display:'grid', gridTemplateColumns:'60px 1fr auto', gap:16, alignItems:'center', cursor:'pointer'}}>
            <div style={{textAlign:'center'}}>
              <div className="sc-label" style={{marginBottom:2}}>Session</div>
              <div style={{fontFamily:'Cinzel, serif', fontSize:18, color:'var(--foreground)'}}>{s.session}</div>
            </div>
            <div style={{borderLeft:'1px solid var(--border)', paddingLeft:16}}>
              <div className="font-serif" style={{fontSize:15, marginBottom:3}}>{s.n}</div>
              <div style={{fontSize:12, color:'var(--muted-foreground)', lineHeight:1.5}}>{s.summary}</div>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <span className="sc-badge" style={{fontSize:10, color:statusColor[s.status], borderColor:`color-mix(in srgb, ${statusColor[s.status]} 40%, transparent)`}}>{s.status}</span>
              <button className="sc-btn sc-btn-sm"><Icon name="edit" size={12}/>Open</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Bounties ---------- */
const BountiesTab = () => {
  const bounties = [
    { tgt:'Ruka the Unmoored', wanted:'Alive', reward:'1,500 gp', poster:'Spice Guild', crimes:'Piracy, 14 counts; assault; tax evasion.', status:'Open' },
    { tgt:'Gedrun "The Fang"', wanted:'Dead or Alive', reward:'600 gp', poster:'Port Watch', crimes:'Murder of Corporal Venn. Last seen at Skull Atoll.', status:'Open' },
    { tgt:'The Bosun',         wanted:'Alive', reward:'400 gp', poster:'Captain Vhan', crimes:'Desertion. Suspected to be at the Drowned Chapel.', status:'In progress' },
    { tgt:'Unknown arsonist',  wanted:'Alive', reward:'200 gp', poster:'Bell Friars', crimes:'Burned the small shrine at Gulls\' Point.', status:'Open' },
    { tgt:'"Knock" Finchley',  wanted:'Dead',  reward:'950 gp', poster:'Madam Orrick', crimes:'Stole a ledger. Orrick wants him silent.', status:'Closed' },
  ];

  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>The Bounty Board</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>Posted at the Drowned Anchor</div>
        </div>
        <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>Post bounty</button>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12}}>
        {bounties.map(b => (
          <div key={b.tgt} className="sc-card" style={{
            padding:16, position:'relative',
            background:'color-mix(in srgb, #d6a85a 6%, var(--card))',
            borderColor:'color-mix(in srgb, #d6a85a 25%, var(--border))',
            opacity: b.status==='Closed' ? 0.55 : 1
          }}>
            <div style={{position:'absolute', top:-6, left:10, right:10, height:12, borderTop:'2px dashed color-mix(in srgb, #d6a85a 40%, transparent)'}}/>
            <div style={{textAlign:'center', marginBottom:10}}>
              <div style={{fontFamily:'Cinzel, serif', fontSize:11, letterSpacing:'0.3em', color:'#d6a85a'}}>WANTED</div>
              <div className="font-serif" style={{fontSize:13, letterSpacing:'0.15em', color:'var(--muted-foreground)'}}>— {b.wanted.toUpperCase()} —</div>
            </div>
            <div style={{
              height:80, marginBottom:10, borderRadius:6,
              background:'repeating-linear-gradient(135deg, color-mix(in srgb, var(--foreground) 7%, transparent) 0 8px, transparent 8px 16px)',
              border:'1px solid var(--border)',
              display:'grid', placeItems:'center',
              fontSize:10, color:'var(--muted-foreground)', fontFamily:'ui-monospace, monospace'
            }}>portrait</div>
            <div className="font-serif" style={{fontSize:16, textAlign:'center', marginBottom:6}}>{b.tgt}</div>
            <div style={{fontSize:11, color:'var(--muted-foreground)', lineHeight:1.5, marginBottom:10, textAlign:'center'}}>{b.crimes}</div>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:10, borderTop:'1px dashed color-mix(in srgb, #d6a85a 30%, transparent)'}}>
              <span style={{fontSize:10, color:'var(--muted-foreground)'}}>Posted by {b.poster}</span>
              <span style={{fontFamily:'Cinzel, serif', fontSize:14, color:'#d6a85a'}}>{b.reward}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

window.TimelineTab = TimelineTab;
window.CalendarTab = CalendarTab;
window.RandomTablesTab = RandomTablesTab;
window.EncountersTab = EncountersTab;
window.NPCsTab = NPCsTab;
window.LocationsTab = LocationsTab;
window.FactionsTab = FactionsTab;
window.PantheonTab = PantheonTab;
window.ScenesTab = ScenesTab;
window.BountiesTab = BountiesTab;
