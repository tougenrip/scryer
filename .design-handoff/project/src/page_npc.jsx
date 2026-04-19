/* NPC Detail Page - Captain Vhan Tellir */

const NPCDetailPage = ({ isDM }) => {
  const npc = {
    name: 'Captain Vhan Tellir',
    title: 'Master of the Gale\'s Reckoning',
    race: 'Human (Reach-islander)',
    role: 'Patron · Ally',
    location: 'Port Lisban → at sea',
    portraitHue: 200,
    tags: ['Spice Guild','Ally','Seafarer','Lv 6'],
  };

  return (
    <div className="sc-fade-in" style={{position:'relative'}}>
      {/* Hero */}
      <div style={{position:'relative', height:280, overflow:'hidden'}}>
        <div className="ph-img" style={{
          position:'absolute', inset:0,
          background: `
            linear-gradient(135deg, oklch(0.4 0.08 ${npc.portraitHue}) 0%, oklch(0.2 0.05 ${npc.portraitHue}) 60%, var(--background) 100%),
            repeating-linear-gradient(135deg, rgba(255,255,255,0.03) 0 2px, transparent 2px 14px)
          `,
          backgroundBlendMode:'overlay',
        }}>
          <div style={{fontFamily:'JetBrains Mono', fontSize:10, letterSpacing:'0.3em', color:'rgba(255,255,255,0.25)'}}>PORTRAIT · 1920 × 720</div>
        </div>
        <div className="entity-hero-gradient" style={{
          position:'absolute', inset:0,
          background: 'linear-gradient(to top, var(--background) 0%, color-mix(in srgb, var(--background) 70%, transparent) 35%, transparent 100%)'
        }}/>
        <div style={{position:'absolute', top:16, left:20, right:20, display:'flex', alignItems:'center', gap:10}}>
          <button className="sc-btn sc-btn-sm"><Icon name="chevronLeft" size={12}/>NPCs</button>
          <div style={{flex:1}}/>
          <button className="sc-btn sc-btn-sm"><Icon name="link" size={12}/>Copy link</button>
          <button className="sc-btn sc-btn-sm"><Icon name="edit" size={12}/>Edit</button>
          <button className="sc-btn sc-btn-sm"><Icon name="more" size={12}/></button>
        </div>
      </div>

      <div style={{padding:'0 32px 40px', maxWidth:1280, margin:'0 auto', marginTop:-80, position:'relative'}}>
        {/* Identity */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:28}}>
          <div>
            <div style={{display:'flex', alignItems:'flex-end', gap:20, marginBottom:20}}>
              <div style={{
                width:120, height:120, borderRadius:14,
                background:`linear-gradient(135deg, oklch(0.55 0.12 ${npc.portraitHue}), oklch(0.25 0.06 ${npc.portraitHue}))`,
                display:'grid', placeItems:'center',
                fontFamily:'Cinzel, serif', fontSize:54, color:'white', fontWeight:600,
                border:'2px solid var(--border)',
                boxShadow:'0 12px 40px rgba(0,0,0,0.5)',
                flexShrink:0,
              }}>V</div>
              <div>
                <div className="sc-label" style={{marginBottom:4}}>NPC</div>
                <h1 className="font-serif" style={{fontSize:42, margin:0, letterSpacing:'0.01em', lineHeight:1.05}}>{npc.name}</h1>
                <div style={{color:'var(--muted-foreground)', marginTop:6, fontSize:14, fontStyle:'italic'}}>{npc.title}</div>
                <div style={{display:'flex', gap:6, marginTop:10, flexWrap:'wrap'}}>
                  {npc.tags.map(t => <span key={t} className="sc-badge">{t}</span>)}
                </div>
              </div>
            </div>

            {/* Description */}
            <section style={{marginBottom:32}}>
              <div className="prose-entity" style={{fontSize:15, lineHeight:1.75}}>
                <h2 className="font-serif" style={{fontSize:22, marginTop:0, marginBottom:12}}>Description</h2>
                <p>
                  Grey-eyed and economical, Vhan rarely raises his voice — the <em>Gale's Reckoning</em> runs on short nods and longer looks. Twenty years at the Reach taught him that most problems break against patience and a good chart. He drinks sparingly, pays his crew quarterly, and keeps a small bronze compass he never seems to use.
                </p>
                <h2 className="font-serif" style={{fontSize:22, marginTop:24, marginBottom:10}}>Temperament</h2>
                <p>
                  Cautious, loyal to contract, reserved with strangers. Warms slowly but does not cool. Speaks with <span className="sc-link">Harbormaster Oss</span> twice a week by sending stone.
                </p>
                <h2 className="font-serif" style={{fontSize:22, marginTop:24, marginBottom:10}}>Plot hooks</h2>
                <ul>
                  <li>Carries a sealed letter he has not opened in eleven years.</li>
                  <li>Owes a lifedebt to someone in the <span className="sc-link">Coral Court</span> — even he isn't sure whom.</li>
                  <li>Will refuse to sail past the Skull Atoll under any circumstance. Won't say why.</li>
                </ul>
              </div>

              {isDM && (
                <div className="dm-secret" style={{marginTop:20}}>
                  <div className="dm-secret-label"><Icon name="eyeOff" size={11}/>DM secrets</div>
                  <div style={{color:'var(--muted-foreground)', fontSize:14, lineHeight:1.7}}>
                    Vhan once commanded a <strong style={{color:'var(--foreground)'}}>Stormcrow</strong> cutter. He scuttled it himself after a raid went wrong — the sealed letter is from his then-first-mate, who survived and now captains a Reaver ship hunting him. If he sees Stormcrow colors in combat he must make a <span className="font-mono">DC 15 WIS</span> save or freeze for one round.
                  </div>
                </div>
              )}
            </section>

            {/* Quick stat block */}
            <section style={{marginBottom:32}}>
              <h2 className="font-serif" style={{fontSize:22, marginBottom:10}}>Stat block</h2>
              <div className="sc-card" style={{padding:18}}>
                <div style={{display:'flex', gap:20, marginBottom:14}}>
                  <div><div className="sc-label">Alignment</div><div style={{fontSize:13}}>Lawful Neutral</div></div>
                  <div><div className="sc-label">Size</div><div style={{fontSize:13}}>Medium</div></div>
                  <div><div className="sc-label">Type</div><div style={{fontSize:13}}>Humanoid (human)</div></div>
                  <div><div className="sc-label">Challenge</div><div style={{fontSize:13}}>3 (700 XP)</div></div>
                </div>
                <hr className="sc-divider" style={{marginBottom:14}}/>
                <div className="sc-statblock">
                  <div className="stat-row"><span className="stat-label">Armor Class</span><span>15 (studded leather)</span></div>
                  <div className="stat-row"><span className="stat-label">Hit Points</span><span>56 (8d8 + 20)</span></div>
                  <div className="stat-row"><span className="stat-label">Speed</span><span>30 ft, swim 20 ft</span></div>
                </div>
                <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:8, marginTop:14, textAlign:'center'}}>
                  {[['STR',12],['DEX',16],['CON',14],['INT',13],['WIS',15],['CHA',14]].map(([k,v]) => {
                    const m = Math.floor((v-10)/2);
                    return (
                      <div key={k} style={{padding:'8px 4px', background:'var(--muted)', borderRadius:6}}>
                        <div className="sc-label" style={{marginBottom:2}}>{k}</div>
                        <div className="font-serif" style={{fontSize:20}}>{v}</div>
                        <div style={{fontSize:11, color:'var(--primary)'}}>{m>=0?'+':''}{m}</div>
                      </div>
                    );
                  })}
                </div>
                <hr className="sc-divider" style={{margin:'14px 0'}}/>
                <div className="sc-statblock">
                  <div className="stat-row"><span className="stat-label">Skills</span><span>Athletics +3, Perception +4, Persuasion +4, Vehicle (Water) +5</span></div>
                  <div className="stat-row"><span className="stat-label">Senses</span><span>Passive Perception 14</span></div>
                  <div className="stat-row"><span className="stat-label">Languages</span><span>Common, Aquan, Thieves Cant</span></div>
                </div>
                <div style={{marginTop:14}}>
                  <div className="sc-label" style={{marginBottom:6}}>Actions</div>
                  <div style={{fontSize:13, lineHeight:1.65}}>
                    <p style={{margin:'0 0 6px'}}><strong>Cutlass.</strong> <em>Melee weapon attack:</em> +5 to hit, reach 5 ft. <em>Hit:</em> 6 (1d8 + 3) slashing damage.</p>
                    <p style={{margin:0}}><strong>Pistol.</strong> <em>Ranged weapon attack:</em> +5 to hit, range 30/90 ft. <em>Hit:</em> 8 (1d10 + 3) piercing damage.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Right sidebar */}
          <aside style={{display:'flex', flexDirection:'column', gap:16, marginTop:-20}}>
            <div className="sc-card" style={{padding:16}}>
              <div className="sc-label" style={{marginBottom:10}}>Identity</div>
              <InfoRow label="Race" value={npc.race}/>
              <InfoRow label="Role" value={npc.role}/>
              <InfoRow label="Location" value={npc.location}/>
              <InfoRow label="Faction" value="Spice Guild"/>
              <InfoRow label="Ship" value="Gale's Reckoning"/>
              <InfoRow label="Age" value="47"/>
            </div>

            <div className="sc-card" style={{padding:16}}>
              <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10}}>
                <div className="sc-label">Attitude toward party</div>
              </div>
              <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:6}}>
                <div style={{flex:1, height:6, background:'var(--muted)', borderRadius:99, position:'relative'}}>
                  <div style={{position:'absolute', left:'62%', top:-2, width:10, height:10, borderRadius:99, background:'var(--primary)', transform:'translateX(-50%)'}}/>
                </div>
                <span style={{fontSize:12, color:'var(--primary)', fontWeight:600}}>Friendly</span>
              </div>
              <div style={{fontSize:11, color:'var(--muted-foreground)', display:'flex', justifyContent:'space-between'}}>
                <span>Hostile</span><span>Neutral</span><span>Allied</span>
              </div>
            </div>

            <div className="sc-card" style={{padding:16}}>
              <div className="sc-label" style={{marginBottom:10}}>Relationships</div>
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {[
                  ['Harbormaster Oss','Ally','users'],
                  ['Spice Guild','Contract','shield'],
                  ['Madam Orrick','Rival','users'],
                  ['Stormcrow Reavers', isDM ? 'Secret' : 'Unknown', 'skull'],
                ].map(([n,r,i]) => (
                  <div key={n} className="backlink-item" style={{display:'flex', alignItems:'center', gap:8, fontSize:12, cursor:'pointer', color:'var(--muted-foreground)'}}>
                    <Icon name={i} size={13} style={{color:'var(--muted-foreground)'}}/>
                    <span style={{flex:1, color:'var(--foreground)'}}>{n}</span>
                    <span style={{fontSize:10}}>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sc-card" style={{padding:16}}>
              <div className="sc-label" style={{marginBottom:10}}>Appears in</div>
              <div style={{display:'flex', flexDirection:'column', gap:8, fontSize:12}}>
                {[
                  ['Session 1 — Port Lisban','scroll'],
                  ['Session 3 — The contract','scroll'],
                  ['Scene: Rendezvous at dawn','scroll'],
                  ['Quest: Salt and Silver','target'],
                ].map(([t,i]) => (
                  <div key={t} style={{display:'flex', alignItems:'center', gap:8, color:'var(--muted-foreground)', cursor:'pointer'}}>
                    <Icon name={i} size={12}/>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="sc-card" style={{padding:16}}>
              <div className="sc-label" style={{marginBottom:8}}>Quick actions</div>
              <div style={{display:'flex', flexDirection:'column', gap:6}}>
                <button className="sc-btn sc-btn-sm"><Icon name="dice" size={12}/>Roll stat</button>
                <button className="sc-btn sc-btn-sm"><Icon name="sword" size={12}/>Add to encounter</button>
                <button className="sc-btn sc-btn-sm"><Icon name="grid" size={12}/>Send to VTT</button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({label, value}) => (
  <div style={{display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px dashed color-mix(in srgb, var(--border) 60%, transparent)', fontSize:12}}>
    <span style={{color:'var(--muted-foreground)'}}>{label}</span>
    <span style={{fontWeight:500, textAlign:'right'}}>{value}</span>
  </div>
);

window.NPCDetailPage = NPCDetailPage;
