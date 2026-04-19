/* Character Sheet - Vex Quellmar, Swashbuckler Rogue (seafaring) */

const CharacterSheetPage = () => {
  const [tab, setTab] = React.useState('main');
  const char = {
    name:'Vex Quellmar', class:'Rogue (Swashbuckler)', lvl:6, race:'Half-elf', bg:'Sailor', alignment:'Chaotic Good',
    player:'Sam', ac:16, hp:[42,42], speed:30, init:4, prof:3, insp:1,
    abilities:{ STR:10, DEX:18, CON:14, INT:12, WIS:11, CHA:16 },
    saves:['DEX','INT'],
    skills:['Acrobatics','Deception*','Insight','Perception','Persuasion','Sleight of Hand','Stealth*','Athletics'],
    senses:{passive:13, darkvision:60},
    languages:['Common','Elvish','Thieves Cant','Primordial (Aquan)'],
    attacks:[
      { name:'Saltrime Cutlass +1', bonus:'+8', dmg:'1d6+5 piercing', tag:'finesse, magic', note:'once/day: leave blade in target for +1d8 next hit' },
      { name:'Daggers (×4)', bonus:'+7', dmg:'1d4+4 piercing', tag:'thrown 20/60', note:'' },
      { name:'Hand crossbow', bonus:'+7', dmg:'1d6+4 piercing', tag:'range 30/120', note:'' },
    ],
    features:[
      { t:'Fancy Footwork', d:'Enemies struck by melee attack can\'t make opportunity attacks against you this turn.' },
      { t:'Rakish Audacity', d:'Add CHA mod (+3) to initiative; Sneak Attack when no allies adjacent to target.' },
      { t:'Sneak Attack', d:'3d6 extra damage once per turn with finesse/ranged against valid targets.' },
      { t:'Cunning Action', d:'Bonus action: Dash, Disengage, or Hide.' },
      { t:'Uncanny Dodge', d:'Reaction: halve damage from an attacker you can see.' },
      { t:'Expertise', d:'Double proficiency: Stealth, Deception.' },
    ],
    inventory:[
      ['Saltrime Cutlass +1', 1, '2 lb', 'weapon'],
      ['Daggers', 4, '1 lb ea', 'weapon'],
      ['Hand crossbow + 40 bolts', 1, '3 lb', 'weapon'],
      ['Leather armor', 1, '10 lb', 'armor'],
      ['Thieves\' tools', 1, '1 lb', 'tool'],
      ['Signal whistle (brass)', 1, '—', 'gear'],
      ['Sending stone shards (pair)', 2, '—', 'magic'],
      ['Hooded lantern, sealed', 1, '2 lb', 'gear'],
    ],
    money:{ pp:0, gp:184, ep:0, sp:22, cp:14 },
    notes:'I\'m looking for my twin sister Lyss, last seen aboard the Stormcrow flagship. Three years missing. Orrick knows something.',
    portraitHue: 14,
  };

  return (
    <div className="sc-fade-in" style={{padding:'24px 28px', maxWidth:1280, margin:'0 auto'}}>
      {/* Header card */}
      <div className="sc-card" style={{padding:20, marginBottom:18, display:'grid', gridTemplateColumns:'auto 1fr auto', gap:20, alignItems:'center'}}>
        <div style={{
          width:96, height:96, borderRadius:16,
          background:`linear-gradient(135deg, oklch(0.55 0.18 ${char.portraitHue}), oklch(0.25 0.08 ${char.portraitHue}))`,
          display:'grid', placeItems:'center',
          fontFamily:'Cinzel, serif', fontSize:44, color:'white', fontWeight:600,
          border:'2px solid var(--border)',
          boxShadow:'inset 0 0 30px rgba(0,0,0,0.4)',
        }}>V</div>
        <div>
          <div className="sc-label" style={{marginBottom:4}}>Character · {char.player}</div>
          <h1 className="font-serif" style={{fontSize:34, margin:0, letterSpacing:'0.01em'}}>{char.name}</h1>
          <div style={{color:'var(--muted-foreground)', marginTop:4, fontSize:13}}>
            {char.race} · {char.class} · Level {char.lvl} · {char.bg} · {char.alignment}
          </div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="sc-btn"><Icon name="moon" size={14}/>Long rest</button>
          <button className="sc-btn"><Icon name="sun" size={14}/>Short rest</button>
          <button className="sc-btn sc-btn-primary"><Icon name="zap" size={14}/>Level up</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sc-tabs" style={{marginBottom:18}}>
        {[['main','Main','shield'],['actions','Actions','sword'],['spells','Spells','sparkles'],['inventory','Inventory','package'],['bio','Bio & Notes','scroll']].map(([id,l,i]) => (
          <button key={id} className={`sc-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}><Icon name={i} size={12}/>{l}</button>
        ))}
      </div>

      {tab === 'main' && (
        <div style={{display:'grid', gridTemplateColumns:'260px 1fr 320px', gap:16}}>
          {/* Abilities */}
          <div style={{display:'flex', flexDirection:'column', gap:10}}>
            {Object.entries(char.abilities).map(([k,v]) => {
              const mod = Math.floor((v-10)/2);
              return (
                <div key={k} className="ability-tile">
                  <div className="label">{k}</div>
                  <div className="score">{v}</div>
                  <div className="mod">{mod >= 0 ? '+' : ''}{mod}</div>
                </div>
              );
            })}
          </div>

          {/* Center combat + skills */}
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            {/* Combat stats */}
            <div className="sc-card" style={{padding:16}}>
              <div style={{display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap:10, textAlign:'center'}}>
                {[
                  ['AC', char.ac, 'shield'],
                  ['HP', `${char.hp[0]}/${char.hp[1]}`, 'heart'],
                  ['Init', `+${char.init}`, 'zap'],
                  ['Speed', `${char.speed} ft`, 'compass'],
                  ['Prof', `+${char.prof}`, 'star'],
                ].map(([l,v,i]) => (
                  <div key={l}>
                    <div className="sc-label" style={{marginBottom:4, display:'flex', justifyContent:'center', alignItems:'center', gap:4}}>
                      <Icon name={i} size={11}/>{l}
                    </div>
                    <div className="font-serif" style={{fontSize:24}}>{v}</div>
                  </div>
                ))}
              </div>
              <hr className="sc-divider" style={{margin:'14px 0'}}/>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
                <div>
                  <div className="sc-label" style={{marginBottom:6}}>Saving throws</div>
                  {Object.keys(char.abilities).map(k => {
                    const mod = Math.floor((char.abilities[k]-10)/2);
                    const prof = char.saves.includes(k);
                    const total = mod + (prof ? char.prof : 0);
                    return (
                      <div key={k} style={{display:'flex', alignItems:'center', gap:8, padding:'3px 0', fontSize:12}}>
                        <span style={{
                          width:9, height:9, borderRadius:99,
                          background: prof ? 'var(--primary)' : 'transparent',
                          border: `1.5px solid ${prof ? 'var(--primary)' : 'var(--muted-foreground)'}`
                        }}/>
                        <span style={{flex:1, color:'var(--muted-foreground)'}}>{k}</span>
                        <span className="font-mono" style={{fontWeight:600}}>{total>=0?'+':''}{total}</span>
                      </div>
                    );
                  })}
                </div>
                <div>
                  <div className="sc-label" style={{marginBottom:6}}>Senses & languages</div>
                  <div className="sc-statblock">
                    <div className="stat-row"><span className="stat-label">Passive Perception</span><span>{char.senses.passive}</span></div>
                    <div className="stat-row"><span className="stat-label">Darkvision</span><span>{char.senses.darkvision} ft</span></div>
                  </div>
                  <div style={{fontSize:11, color:'var(--muted-foreground)', marginTop:10}}>
                    {char.languages.join(' · ')}
                  </div>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="sc-card" style={{padding:16}}>
              <div className="sc-label" style={{marginBottom:10}}>Skills · * = expertise</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:4}}>
                {[
                  ['Acrobatics','DEX',true,false],['Animal Handling','WIS',false,false],
                  ['Arcana','INT',false,false],['Athletics','STR',true,false],
                  ['Deception','CHA',true,true],['History','INT',false,false],
                  ['Insight','WIS',true,false],['Intimidation','CHA',false,false],
                  ['Investigation','INT',false,false],['Medicine','WIS',false,false],
                  ['Nature','INT',false,false],['Perception','WIS',true,false],
                  ['Performance','CHA',false,false],['Persuasion','CHA',true,false],
                  ['Religion','INT',false,false],['Sleight of Hand','DEX',true,false],
                  ['Stealth','DEX',true,true],['Survival','WIS',false,false],
                ].map(([n,ab,prof,exp]) => {
                  const mod = Math.floor((char.abilities[ab]-10)/2);
                  const bonus = exp ? char.prof*2 : prof ? char.prof : 0;
                  const total = mod + bonus;
                  return (
                    <div key={n} style={{display:'flex', alignItems:'center', gap:8, padding:'4px 6px', fontSize:12, borderRadius:4, transition:'background .1s'}}
                      onMouseEnter={e => e.currentTarget.style.background='var(--muted)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <span style={{
                        width:9, height:9, borderRadius:99,
                        background: exp ? 'var(--primary)' : prof ? 'var(--primary)' : 'transparent',
                        border: `1.5px solid ${prof || exp ? 'var(--primary)' : 'var(--muted-foreground)'}`,
                        boxShadow: exp ? 'inset 0 0 0 2px var(--card)' : 'none'
                      }}/>
                      <span style={{flex:1, color: prof || exp ? 'var(--foreground)' : 'var(--muted-foreground)'}}>
                        {n}{exp && <span style={{color:'var(--primary)', marginLeft:2}}>*</span>}
                      </span>
                      <span style={{color:'var(--muted-foreground)', fontSize:10}}>{ab}</span>
                      <span className="font-mono" style={{fontWeight:600, minWidth:26, textAlign:'right'}}>{total>=0?'+':''}{total}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Features */}
            <div className="sc-card" style={{padding:16}}>
              <div className="sc-label" style={{marginBottom:10}}>Features & traits</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
                {char.features.map(f => (
                  <div key={f.t} style={{padding:'10px 12px', background:'var(--muted)', borderRadius:6}}>
                    <div style={{fontSize:12, fontWeight:600, marginBottom:3}}>{f.t}</div>
                    <div style={{fontSize:11, color:'var(--muted-foreground)', lineHeight:1.5}}>{f.d}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: attacks + resources */}
          <div style={{display:'flex', flexDirection:'column', gap:16}}>
            <div className="sc-card" style={{padding:16}}>
              <div className="sc-label" style={{marginBottom:10}}>Attacks</div>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {char.attacks.map(a => (
                  <div key={a.name} style={{padding:10, background:'var(--muted)', borderRadius:6}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
                      <div style={{fontSize:13, fontWeight:600}}>{a.name}</div>
                      <div className="font-mono" style={{fontSize:12, color:'var(--primary)'}}>{a.bonus}</div>
                    </div>
                    <div style={{fontSize:11, color:'var(--muted-foreground)', marginTop:2}}>{a.dmg}</div>
                    {a.tag && <div style={{fontSize:10, color:'var(--muted-foreground)', fontStyle:'italic', marginTop:2}}>{a.tag}</div>}
                    {a.note && <div className="font-hand" style={{fontSize:12, color:'var(--primary)', marginTop:4}}>"{a.note}"</div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="sc-card" style={{padding:16}}>
              <div className="sc-label" style={{marginBottom:10}}>Resources</div>
              <Resource label="Inspiration" used={0} total={1} color="#d6a85a"/>
              <Resource label="Hit dice (d8)" used={2} total={6} color="var(--primary)"/>
              <Resource label="Sneak Attack" used={0} total={1} color="var(--destructive)" sub="3d6 damage"/>
              <div style={{fontSize:11, color:'var(--muted-foreground)', marginTop:8}}>
                Conditions: <span className="sc-badge sc-badge-dot" style={{color:'#7ec27e', marginLeft:4}}>none</span>
              </div>
            </div>

            <div className="sc-card" style={{padding:16}}>
              <div className="sc-label" style={{marginBottom:10}}>Coin</div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:6, textAlign:'center'}}>
                {Object.entries(char.money).map(([k,v]) => (
                  <div key={k}>
                    <div className="font-mono" style={{fontSize:10, color:'var(--muted-foreground)', textTransform:'uppercase'}}>{k}</div>
                    <div className="font-serif" style={{fontSize:16}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'inventory' && (
        <div className="sc-card" style={{padding:0, overflow:'hidden'}}>
          <table style={{width:'100%', borderCollapse:'collapse', fontSize:13}}>
            <thead>
              <tr style={{background:'var(--muted)', textAlign:'left'}}>
                <th style={{padding:'10px 14px', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--muted-foreground)'}}>Item</th>
                <th style={{padding:'10px 14px', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--muted-foreground)', width:80}}>Qty</th>
                <th style={{padding:'10px 14px', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--muted-foreground)', width:90}}>Weight</th>
                <th style={{padding:'10px 14px', fontSize:11, textTransform:'uppercase', letterSpacing:'0.08em', color:'var(--muted-foreground)', width:100}}>Type</th>
              </tr>
            </thead>
            <tbody>
              {char.inventory.map(([n,q,w,t], i) => (
                <tr key={i} style={{borderTop:'1px solid var(--border)'}}>
                  <td style={{padding:'10px 14px'}}>{n}</td>
                  <td style={{padding:'10px 14px', fontFamily:'JetBrains Mono', fontSize:12}}>{q}</td>
                  <td style={{padding:'10px 14px', color:'var(--muted-foreground)'}}>{w}</td>
                  <td style={{padding:'10px 14px'}}><span className="sc-badge">{t}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'bio' && (
        <div className="sc-card" style={{padding:24, maxWidth:720}}>
          <div className="sc-label" style={{marginBottom:8}}>Backstory</div>
          <p style={{fontSize:14, lineHeight:1.75, margin:'0 0 16px'}}>
            Raised on the decks of the <em>Gale's Reckoning</em>, Vex learned three things before age twelve: how to tie a running bowline in the dark, how to steal rum from an officer's cabin, and how to vanish when the bosun's belt came off. The rest came later — lockpicking from a tiefling purser, the elegant riposte from an old duelist in Port Lisban.
          </p>
          <div className="sc-label" style={{marginBottom:8}}>Personal quest</div>
          <div className="dm-secret">
            <div className="dm-secret-label"><Icon name="eyeOff" size={11}/>DM-shared note</div>
            <div style={{color:'var(--muted-foreground)', fontSize:13}}>{char.notes}</div>
          </div>
        </div>
      )}

      {(tab === 'actions' || tab === 'spells') && (
        <div className="empty-state">
          <div style={{width:56, height:56, borderRadius:12, background:'var(--muted)', display:'grid', placeItems:'center', color:'var(--muted-foreground)', marginBottom:14}}>
            <Icon name={tab === 'actions' ? 'sword' : 'sparkles'} size={26}/>
          </div>
          <div className="font-serif" style={{fontSize:20, color:'var(--foreground)'}}>{tab === 'actions' ? 'Combat actions' : 'Spellcasting'}</div>
          <div style={{fontSize:13, maxWidth:360, marginTop:6}}>
            {tab === 'actions' ? 'Rogues have no spell list — see the Main tab for attacks & cunning actions.' : 'Vex is not a spellcaster. Multiclass to unlock this tab.'}
          </div>
        </div>
      )}
    </div>
  );
};

const Resource = ({label, used, total, color, sub}) => (
  <div style={{marginBottom:10}}>
    <div style={{display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4}}>
      <span>{label}{sub && <span style={{color:'var(--muted-foreground)', marginLeft:4, fontSize:11}}>· {sub}</span>}</span>
      <span className="font-mono" style={{color:'var(--muted-foreground)'}}>{total-used}/{total}</span>
    </div>
    <div style={{display:'flex', gap:3}}>
      {Array.from({length:total}).map((_,i) => (
        <div key={i} style={{flex:1, height:6, background: i < total-used ? color : 'var(--muted)', borderRadius:2, opacity: i < total-used ? 1 : 0.5}}/>
      ))}
    </div>
  </div>
);

window.CharacterSheetPage = CharacterSheetPage;
