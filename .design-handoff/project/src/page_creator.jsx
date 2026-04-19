/* Character Creator — wizard flow + manual builder (tabbed) */

const CC_RACES = [
  { id:'human', n:'Human', blurb:'Adaptable and ambitious. +1 to all abilities.', traits:['+1 to every ability score', 'Extra language', 'Extra skill (variant)'], size:'Medium', speed:30 },
  { id:'elf',   n:'Elf (High)', blurb:'Graceful and long-lived, studied in arcane arts.', traits:['+2 DEX, +1 INT','Darkvision 60ft','Fey Ancestry (advantage vs. charm)','Trance','Cantrip: one wizard cantrip'], size:'Medium', speed:30 },
  { id:'dwarf', n:'Dwarf (Hill)', blurb:'Hardy, stoic folk of stone and oath.', traits:['+2 CON, +1 WIS','Darkvision 60ft','Dwarven Resilience','Stonecunning','Dwarven Toughness: +1 HP/level'], size:'Medium', speed:25 },
  { id:'halfling', n:'Halfling (Lightfoot)', blurb:'Small, nimble, and astonishingly lucky.', traits:['+2 DEX, +1 CHA','Lucky (reroll nat 1s)','Brave','Halfling Nimbleness','Naturally Stealthy'], size:'Small', speed:25 },
  { id:'tiefling', n:'Tiefling', blurb:'Bearers of a fiendish heritage, cunning and charismatic.', traits:['+2 CHA, +1 INT','Darkvision 60ft','Hellish Resistance (fire)','Infernal Legacy (cantrip + spells)'], size:'Medium', speed:30 },
  { id:'halfelf', n:'Half-Elf', blurb:'Two worlds, belonging wholly to neither.', traits:['+2 CHA, +1 to two others','Darkvision','Fey Ancestry','Skill Versatility (two skills)'], size:'Medium', speed:30 },
  { id:'aasimar', n:'Aasimar', blurb:'Touched by the celestial — luminous and solemn.', traits:['+2 CHA, +1 WIS','Darkvision','Celestial Resistance','Healing Hands','Light cantrip'], size:'Medium', speed:30 },
  { id:'dragonborn', n:'Dragonborn', blurb:'Draconic ancestry in mortal form.', traits:['+2 STR, +1 CHA','Breath Weapon','Draconic Resistance','Draconic ancestry'], size:'Medium', speed:30 },
];

const CC_CLASSES = [
  { id:'fighter', n:'Fighter', blurb:'Disciplined, durable, and devastating in melee.', hit:10, prim:'STR or DEX', saves:'STR, CON', feat:'Second Wind, Fighting Style' },
  { id:'rogue',   n:'Rogue',   blurb:'Scouts and scoundrels. Strike from the edges.', hit:8,  prim:'DEX',       saves:'DEX, INT', feat:'Sneak Attack, Thieves\' Cant, Expertise' },
  { id:'wizard',  n:'Wizard',  blurb:'Scholar of the arcane, caster of cantrips to cataclysms.', hit:6, prim:'INT', saves:'INT, WIS', feat:'Spellbook, Arcane Recovery' },
  { id:'cleric',  n:'Cleric',  blurb:'Mortal voice of a divine power. Heal and harm.', hit:8, prim:'WIS', saves:'WIS, CHA', feat:'Divine Domain, Channel Divinity' },
  { id:'ranger',  n:'Ranger',  blurb:'Hunter and pathfinder. At home where civilization ends.', hit:10, prim:'DEX, WIS', saves:'STR, DEX', feat:'Favored Enemy, Natural Explorer' },
  { id:'bard',    n:'Bard',    blurb:'Wit, will, and a song at the edge of the fight.', hit:8, prim:'CHA', saves:'DEX, CHA', feat:'Bardic Inspiration, Jack of All Trades' },
  { id:'barbarian',n:'Barbarian',blurb:'Primal fury given mortal shape. Rage.', hit:12, prim:'STR', saves:'STR, CON', feat:'Rage, Unarmored Defense' },
  { id:'paladin', n:'Paladin', blurb:'Oathbound warrior, smiter of those who break faith.', hit:10, prim:'STR, CHA', saves:'WIS, CHA', feat:'Divine Sense, Lay on Hands' },
  { id:'warlock', n:'Warlock', blurb:'Pact-bound to a patron of power. Costly gifts.', hit:8, prim:'CHA', saves:'WIS, CHA', feat:'Pact Magic, Eldritch Invocations' },
  { id:'sorcerer',n:'Sorcerer',blurb:'Magic in the blood. Rawer than wizardry.', hit:6, prim:'CHA', saves:'CON, CHA', feat:'Sorcerous Origin, Metamagic (L3)' },
  { id:'druid',   n:'Druid',   blurb:'Keeper of the green word. Wildshape and growth.', hit:8, prim:'WIS', saves:'INT, WIS', feat:'Druidic, Wild Shape (L2)' },
  { id:'monk',    n:'Monk',    blurb:'Discipline of body and ki. Fast, untouchable.', hit:8, prim:'DEX, WIS', saves:'STR, DEX', feat:'Martial Arts, Unarmored Defense' },
];

const CC_BACKGROUNDS = [
  { id:'sailor', n:'Sailor', blurb:'You\'ve worked ship and sea. You know the knots and the songs.', skills:['Athletics','Perception'], feat:'Ship\'s Passage' },
  { id:'criminal', n:'Criminal', blurb:'You made a living in the shadows. You still have the contacts.', skills:['Deception','Stealth'], feat:'Criminal Contact' },
  { id:'acolyte',  n:'Acolyte', blurb:'You served in a temple. The rites are still in your hands.', skills:['Insight','Religion'], feat:'Shelter of the Faithful' },
  { id:'noble',    n:'Noble',   blurb:'You were raised to privilege. It opens doors — and closes them.', skills:['History','Persuasion'], feat:'Position of Privilege' },
  { id:'soldier',  n:'Soldier', blurb:'You served. You have the scars and the habits to prove it.', skills:['Athletics','Intimidation'], feat:'Military Rank' },
  { id:'outlander',n:'Outlander',blurb:'You come from the wild places. Cities still make you tired.', skills:['Athletics','Survival'], feat:'Wanderer' },
  { id:'sage',     n:'Sage',    blurb:'You are a seeker of lore and lost things.', skills:['Arcana','History'], feat:'Researcher' },
  { id:'pirate',   n:'Pirate',  blurb:'You made the choice to take. People remember your name.', skills:['Athletics','Perception'], feat:'Bad Reputation' },
];

const CC_ABILITIES = ['STR','DEX','CON','INT','WIS','CHA'];
const CC_STANDARD = [15, 14, 13, 12, 10, 8];

/* ================= Main wrapper with tabs ================= */
const CharacterCreatorPage = () => {
  const [mode, setMode] = React.useState('wizard');
  return (
    <div style={{minHeight:'100%', background:'var(--background)'}}>
      <div style={{borderBottom:'1px solid var(--border)', background:'var(--sidebar)', padding:'18px 24px 0', flexShrink:0}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14, flexWrap:'wrap', gap:10}}>
          <div>
            <div className="sc-label" style={{marginBottom:4}}>Character Creator</div>
            <div className="font-serif" style={{fontSize:28, letterSpacing:'0.02em'}}>Forge a hero</div>
            <div style={{fontSize:13, color:'var(--muted-foreground)', marginTop:4}}>
              Use the guided wizard to walk through 5e character creation step-by-step, or open the manual builder for full control of every field.
            </div>
          </div>
          <div style={{display:'flex', gap:8}}>
            <button className="sc-btn sc-btn-sm"><Icon name="copy" size={12}/>Import from JSON</button>
            <button className="sc-btn sc-btn-sm"><Icon name="reset" size={12}/>Load template</button>
          </div>
        </div>
        <div style={{display:'flex', gap:0}}>
          {[
            ['wizard','Guided wizard','wand'],
            ['manual','Manual builder','edit'],
          ].map(([id, lbl, ic]) => (
            <button key={id} onClick={() => setMode(id)}
              className={`sc-tab ${mode===id?'active':''}`}>
              <Icon name={ic} size={13}/>{lbl}
            </button>
          ))}
        </div>
      </div>
      {mode === 'wizard' ? <CreatorWizard/> : <ManualBuilder/>}
    </div>
  );
};

/* ================= WIZARD ================= */
const CreatorWizard = () => {
  const [step, setStep] = React.useState(0);
  const [char, setChar] = React.useState({
    name:'', race:null, klass:null, background:null,
    abilities: {STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},
    alignment:'NG', pronouns:'they/them',
    bio:{ appearance:'', personality:'', ideal:'', bond:'', flaw:'' },
  });
  const steps = [
    { id:'race', label:'Race', icon:'users' },
    { id:'class', label:'Class', icon:'sword' },
    { id:'abilities', label:'Ability scores', icon:'zap' },
    { id:'background', label:'Background', icon:'book' },
    { id:'bio', label:'Bio & details', icon:'feather' },
    { id:'review', label:'Review', icon:'check' },
  ];

  const canAdvance = () => {
    if (step === 0) return !!char.race;
    if (step === 1) return !!char.klass;
    if (step === 3) return !!char.background;
    return true;
  };

  return (
    <div style={{padding:'24px 24px 48px', maxWidth:1100, margin:'0 auto'}}>
      {/* Progress rail */}
      <div style={{display:'flex', alignItems:'center', marginBottom:28, gap:0}}>
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <button
              onClick={() => setStep(i)}
              style={{
                display:'flex', alignItems:'center', gap:10, padding:'8px 4px',
                background:'transparent', border:'none', cursor:'pointer',
                opacity: i <= step ? 1 : 0.45,
                flexShrink:0,
              }}>
              <div style={{
                width:34, height:34, borderRadius:'50%',
                border:`1.5px solid ${i === step ? 'var(--primary)' : i < step ? 'var(--primary)' : 'var(--border)'}`,
                background: i < step ? 'var(--primary)' : 'var(--card)',
                color: i < step ? 'var(--primary-foreground, #fff)' : i===step?'var(--primary)':'var(--muted-foreground)',
                display:'grid', placeItems:'center', flexShrink:0,
                boxShadow: i===step?'0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent)':'none',
                transition:'all 0.18s',
              }}>
                {i < step ? <Icon name="check" size={14}/> : <Icon name={s.icon} size={14}/>}
              </div>
              <div style={{textAlign:'left'}}>
                <div className="sc-label" style={{fontSize:9, marginBottom:0}}>Step {i+1}</div>
                <div style={{fontSize:12, fontWeight:500, color: i===step?'var(--foreground)':'var(--muted-foreground)'}}>{s.label}</div>
              </div>
            </button>
            {i < steps.length - 1 && (
              <div style={{flex:1, height:1, background: i < step ? 'var(--primary)' : 'var(--border)', margin:'0 8px', opacity: i < step ? 1 : 0.6}}/>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step body */}
      <div className="sc-fade-in" key={step}>
        {step === 0 && <StepRace char={char} setChar={setChar}/>}
        {step === 1 && <StepClass char={char} setChar={setChar}/>}
        {step === 2 && <StepAbilities char={char} setChar={setChar}/>}
        {step === 3 && <StepBackground char={char} setChar={setChar}/>}
        {step === 4 && <StepBio char={char} setChar={setChar}/>}
        {step === 5 && <StepReview char={char}/>}
      </div>

      {/* Nav footer */}
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        marginTop:28, paddingTop:18, borderTop:'1px solid var(--border)'
      }}>
        <button onClick={() => setStep(s => Math.max(0, s-1))}
          disabled={step===0}
          className="sc-btn"
          style={{opacity: step===0?0.35:1, cursor: step===0?'not-allowed':'pointer'}}>
          <Icon name="chevronLeft" size={13}/>Back
        </button>
        <div style={{fontSize:12, color:'var(--muted-foreground)'}}>
          Step {step+1} of {steps.length}
        </div>
        {step < steps.length - 1 ? (
          <button onClick={() => setStep(s => s+1)}
            disabled={!canAdvance()}
            className="sc-btn sc-btn-primary"
            style={{opacity: canAdvance()?1:0.5, cursor: canAdvance()?'pointer':'not-allowed'}}>
            Next<Icon name="chevronRight" size={13}/>
          </button>
        ) : (
          <button className="sc-btn sc-btn-primary">
            <Icon name="check" size={13}/>Create character
          </button>
        )}
      </div>
    </div>
  );
};

/* ----- Step 1: Race ----- */
const StepRace = ({char, setChar}) => (
  <div>
    <StepHeader num="01" label="Lineage" title="Choose a race" sub="Your heritage shapes your abilities, senses, and how the world sees you."/>
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:12, marginBottom:18}}>
      {CC_RACES.map(r => {
        const picked = char.race === r.id;
        return (
          <button key={r.id} onClick={() => setChar({...char, race:r.id})}
            className="sc-card sc-card-hover" style={{
              padding:14, textAlign:'left', cursor:'pointer',
              border: picked?'1.5px solid var(--primary)':'1px solid var(--border)',
              background: picked?'color-mix(in srgb, var(--primary) 8%, var(--card))':'var(--card)',
              position:'relative',
            }}>
            {picked && <div style={{position:'absolute', top:10, right:10, width:18, height:18, borderRadius:99, background:'var(--primary)', display:'grid', placeItems:'center'}}><Icon name="check" size={11} style={{color:'var(--primary-foreground,#fff)'}}/></div>}
            <div className="font-serif" style={{fontSize:16, marginBottom:4}}>{r.n}</div>
            <div style={{fontSize:11, color:'var(--muted-foreground)', lineHeight:1.5, minHeight:46}}>{r.blurb}</div>
            <div style={{fontSize:10, color:'var(--muted-foreground)', marginTop:8, display:'flex', gap:10}}>
              <span><Icon name="shield" size={10}/> {r.size}</span>
              <span>{r.speed}ft speed</span>
            </div>
          </button>
        );
      })}
    </div>
    {char.race && (
      <div className="sc-card sc-fade-in" style={{padding:18, background:'color-mix(in srgb, var(--primary) 4%, var(--card))'}}>
        <div className="sc-label" style={{marginBottom:4}}>You chose</div>
        <div className="font-serif" style={{fontSize:18, marginBottom:10}}>{CC_RACES.find(r => r.id === char.race).n}</div>
        <div className="sc-label" style={{marginBottom:8}}>Racial traits</div>
        <ul style={{margin:0, padding:0, listStyle:'none', display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:6}}>
          {CC_RACES.find(r => r.id === char.race).traits.map(t => (
            <li key={t} style={{fontSize:12, color:'var(--muted-foreground)', display:'flex', alignItems:'baseline', gap:8}}>
              <span style={{color:'var(--primary)'}}>◆</span>{t}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

/* ----- Step 2: Class ----- */
const StepClass = ({char, setChar}) => (
  <div>
    <StepHeader num="02" label="Calling" title="Choose a class" sub="Your class defines what you can do in combat, at rest, and in the space between."/>
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:10}}>
      {CC_CLASSES.map(c => {
        const picked = char.klass === c.id;
        return (
          <button key={c.id} onClick={() => setChar({...char, klass:c.id})}
            className="sc-card sc-card-hover" style={{
              padding:12, textAlign:'left', cursor:'pointer',
              border: picked?'1.5px solid var(--primary)':'1px solid var(--border)',
              background: picked?'color-mix(in srgb, var(--primary) 8%, var(--card))':'var(--card)',
            }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4}}>
              <span className="font-serif" style={{fontSize:15}}>{c.n}</span>
              <span style={{fontSize:10, color:'var(--muted-foreground)', fontFamily:'ui-monospace, monospace'}}>d{c.hit}</span>
            </div>
            <div style={{fontSize:11, color:'var(--muted-foreground)', lineHeight:1.5, minHeight:44}}>{c.blurb}</div>
            <div style={{fontSize:10, color:'var(--muted-foreground)', marginTop:8, display:'flex', justifyContent:'space-between'}}>
              <span>Primary: {c.prim}</span>
              <span>Saves: {c.saves}</span>
            </div>
          </button>
        );
      })}
    </div>
    {char.klass && (
      <div className="sc-card sc-fade-in" style={{padding:18, marginTop:16, background:'color-mix(in srgb, var(--primary) 4%, var(--card))'}}>
        <div className="sc-label" style={{marginBottom:4}}>Level 1 features</div>
        <div className="font-serif" style={{fontSize:16, marginBottom:6}}>{CC_CLASSES.find(c=>c.id===char.klass).n}</div>
        <div style={{fontSize:12, color:'var(--muted-foreground)'}}>{CC_CLASSES.find(c=>c.id===char.klass).feat}</div>
      </div>
    )}
  </div>
);

/* ----- Step 3: Abilities ----- */
const StepAbilities = ({char, setChar}) => {
  const [method, setMethod] = React.useState('standard');
  const [assigned, setAssigned] = React.useState({STR:null,DEX:null,CON:null,INT:null,WIS:null,CHA:null});

  const assign = (ab, val) => {
    const next = {...assigned};
    // Remove val from any other ability
    for (const k of CC_ABILITIES) if (next[k] === val) next[k] = null;
    next[ab] = val;
    setAssigned(next);
    setChar({...char, abilities: {...char.abilities, ...Object.fromEntries(CC_ABILITIES.map(k => [k, next[k] ?? 10]))}});
  };

  const used = Object.values(assigned).filter(v => v !== null);
  const available = CC_STANDARD.filter(v => !used.includes(v));

  const mod = (v) => Math.floor((v - 10) / 2);

  return (
    <div>
      <StepHeader num="03" label="The Six" title="Assign ability scores" sub="Distribute the standard array (15, 14, 13, 12, 10, 8) to your six abilities."/>
      <div style={{display:'flex', gap:8, marginBottom:18}}>
        {[['standard','Standard array'],['pointbuy','Point buy (27 pts)'],['roll','Roll 4d6 drop lowest']].map(([id, l]) => (
          <button key={id} onClick={() => setMethod(id)}
            className={`sc-btn sc-btn-sm ${method===id?'sc-btn-primary':''}`}>{l}</button>
        ))}
      </div>

      {method === 'standard' && (
        <>
          <div style={{display:'flex', gap:8, marginBottom:20, alignItems:'center'}}>
            <span className="sc-label">Available</span>
            {CC_STANDARD.map(v => (
              <div key={v} style={{
                width:38, height:38, borderRadius:8,
                background: available.includes(v) ? 'var(--card)' : 'var(--muted)',
                color: available.includes(v) ? 'var(--foreground)' : 'var(--muted-foreground)',
                border: '1px solid var(--border)',
                display:'grid', placeItems:'center', fontFamily:'Cinzel, serif', fontSize:16, fontWeight:600,
                textDecoration: available.includes(v) ? 'none' : 'line-through',
                opacity: available.includes(v) ? 1 : 0.4
              }}>{v}</div>
            ))}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:10}}>
            {CC_ABILITIES.map(ab => (
              <div key={ab} className="sc-card" style={{padding:14, textAlign:'center'}}>
                <div style={{fontFamily:'Cinzel, serif', fontSize:12, letterSpacing:'0.15em', color:'var(--muted-foreground)', marginBottom:6}}>{ab}</div>
                <div style={{
                  fontFamily:'Cinzel, serif', fontSize:28, fontWeight:600, color:'var(--foreground)',
                  marginBottom:2, height:36
                }}>
                  {assigned[ab] ?? '—'}
                </div>
                <div style={{fontSize:10, color:'var(--muted-foreground)', marginBottom:10}}>
                  {assigned[ab] !== null ? `mod ${mod(assigned[ab]) >= 0 ? '+' : ''}${mod(assigned[ab])}` : '—'}
                </div>
                <select value={assigned[ab] ?? ''} onChange={e => assign(ab, e.target.value ? parseInt(e.target.value,10) : null)}
                  style={{
                    width:'100%', fontSize:11, padding:'4px 6px', borderRadius:4,
                    background:'var(--input, var(--muted))', border:'1px solid var(--border)', color:'var(--foreground)'
                  }}>
                  <option value="">— assign —</option>
                  {CC_STANDARD.map(v => (
                    <option key={v} value={v} disabled={used.includes(v) && assigned[ab] !== v}>{v}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <div style={{fontSize:11, color:'var(--muted-foreground)', marginTop:14, textAlign:'center'}}>
            {used.length} / 6 assigned. Racial bonuses apply after — shown on the summary.
          </div>
        </>
      )}

      {method === 'pointbuy' && (
        <div className="empty-state sc-card" style={{padding:40}}>
          <Icon name="sparkles" size={22}/>
          <div style={{fontSize:13, marginTop:10}}>Point-buy editor would live here.<br/>Start 8/8/8/8/8/8 with 27 points; cost curve as per 5e rules.</div>
        </div>
      )}
      {method === 'roll' && (
        <div className="empty-state sc-card" style={{padding:40}}>
          <D20Icon size={22}/>
          <div style={{fontSize:13, marginTop:10}}>Roll 4d6, drop lowest, six times. Assign in any order.</div>
          <button className="sc-btn sc-btn-primary sc-btn-sm" style={{marginTop:14}}>Roll six scores</button>
        </div>
      )}
    </div>
  );
};

/* ----- Step 4: Background ----- */
const StepBackground = ({char, setChar}) => (
  <div>
    <StepHeader num="04" label="The past" title="Choose a background" sub="Where you came from shapes what you know and who you know."/>
    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(240px, 1fr))', gap:10}}>
      {CC_BACKGROUNDS.map(b => {
        const picked = char.background === b.id;
        return (
          <button key={b.id} onClick={() => setChar({...char, background:b.id})}
            className="sc-card sc-card-hover" style={{
              padding:14, textAlign:'left', cursor:'pointer',
              border: picked?'1.5px solid var(--primary)':'1px solid var(--border)',
              background: picked?'color-mix(in srgb, var(--primary) 8%, var(--card))':'var(--card)',
            }}>
            <div className="font-serif" style={{fontSize:15, marginBottom:4}}>{b.n}</div>
            <div style={{fontSize:11, color:'var(--muted-foreground)', lineHeight:1.5, minHeight:44}}>{b.blurb}</div>
            <div style={{display:'flex', gap:4, marginTop:8, flexWrap:'wrap'}}>
              {b.skills.map(s => <span key={s} className="sc-badge" style={{fontSize:9}}>{s}</span>)}
              <span className="sc-badge sc-badge-primary" style={{fontSize:9}}>{b.feat}</span>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

/* ----- Step 5: Bio ----- */
const StepBio = ({char, setChar}) => {
  const setBio = (k, v) => setChar({...char, bio:{...char.bio, [k]:v}});
  return (
    <div>
      <StepHeader num="05" label="Identity" title="The details that make them a person" sub="These are optional — but a character without a flaw isn't a character yet."/>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
        <CCField label="Character name" value={char.name} onChange={v => setChar({...char, name:v})} placeholder="e.g. Vex Quellmar"/>
        <CCField label="Pronouns" value={char.pronouns} onChange={v => setChar({...char, pronouns:v})} placeholder="she/her · he/him · they/them"/>
      </div>
      <div style={{marginTop:14}}>
        <CCField label="Alignment" value={char.alignment} onChange={v => setChar({...char, alignment:v})} placeholder="LG · NG · CG · LN · N · CN · LE · NE · CE"/>
      </div>
      <div style={{marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
        <CCArea label="Appearance" value={char.bio.appearance} onChange={v => setBio('appearance', v)} placeholder="Scar across the left brow, a coin on a braid of red twine…"/>
        <CCArea label="Personality" value={char.bio.personality} onChange={v => setBio('personality', v)} placeholder="Speaks softly. Watches the doors. Laughs too late."/>
        <CCArea label="Ideal" value={char.bio.ideal} onChange={v => setBio('ideal', v)} placeholder="What do they believe in, when they're honest?"/>
        <CCArea label="Bond" value={char.bio.bond} onChange={v => setBio('bond', v)} placeholder="Who or what they'd cross the map for."/>
        <CCArea label="Flaw" value={char.bio.flaw} onChange={v => setBio('flaw', v)} placeholder="The thing that will ruin them, given time."/>
      </div>
    </div>
  );
};

/* ----- Step 6: Review ----- */
const StepReview = ({char}) => {
  const race = CC_RACES.find(r => r.id === char.race);
  const klass = CC_CLASSES.find(c => c.id === char.klass);
  const bg = CC_BACKGROUNDS.find(b => b.id === char.background);
  const mod = v => Math.floor((v-10)/2);
  return (
    <div>
      <StepHeader num="06" label="Summary" title="Review your hero" sub="Everything ready? Edit any step by clicking its circle above."/>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
        <div className="sc-card" style={{padding:20}}>
          <div className="sc-label" style={{marginBottom:4}}>Character</div>
          <div className="font-serif" style={{fontSize:24, marginBottom:4}}>{char.name || 'Unnamed'}</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)', marginBottom:18}}>
            {race?.n ?? '—'} · {klass?.n ?? '—'} · {bg?.n ?? '—'} · {char.alignment}
          </div>
          <div className="sc-label" style={{marginBottom:8}}>Ability scores</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:6}}>
            {CC_ABILITIES.map(ab => (
              <div key={ab} style={{padding:'8px 4px', background:'var(--muted)', borderRadius:6, textAlign:'center'}}>
                <div style={{fontSize:10, color:'var(--muted-foreground)', letterSpacing:'0.1em'}}>{ab}</div>
                <div style={{fontFamily:'Cinzel, serif', fontSize:18, fontWeight:600}}>{char.abilities[ab]}</div>
                <div style={{fontSize:10, color:'var(--muted-foreground)'}}>{mod(char.abilities[ab])>=0?'+':''}{mod(char.abilities[ab])}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="sc-card" style={{padding:20}}>
          <div className="sc-label" style={{marginBottom:8}}>Bio</div>
          {[['Appearance', char.bio.appearance],['Personality', char.bio.personality],['Ideal', char.bio.ideal],['Bond', char.bio.bond],['Flaw', char.bio.flaw]].map(([l,v]) => (
            <div key={l} style={{marginBottom:10}}>
              <div className="sc-label" style={{fontSize:9, marginBottom:2}}>{l}</div>
              <div style={{fontSize:12, color:v?'var(--foreground)':'var(--muted-foreground)', fontStyle:v?'normal':'italic', lineHeight:1.5}}>{v || 'Not yet written.'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StepHeader = ({num, label, title, sub}) => (
  <div style={{marginBottom:22}}>
    <div style={{display:'flex', alignItems:'baseline', gap:12, marginBottom:2}}>
      <span style={{fontFamily:'Cinzel, serif', fontSize:22, color:'var(--primary)', opacity:0.7}}>{num}</span>
      <span className="sc-label" style={{marginBottom:0}}>{label}</span>
    </div>
    <div className="font-serif" style={{fontSize:24, marginBottom:4}}>{title}</div>
    <div style={{fontSize:13, color:'var(--muted-foreground)', maxWidth:600, lineHeight:1.55}}>{sub}</div>
  </div>
);

const CCField = ({label, value, onChange, placeholder}) => (
  <div>
    <label className="sc-label" style={{display:'block', marginBottom:6}}>{label}</label>
    <input className="sc-input" value={value||''} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{width:'100%'}}/>
  </div>
);
const CCArea = ({label, value, onChange, placeholder}) => (
  <div>
    <label className="sc-label" style={{display:'block', marginBottom:6}}>{label}</label>
    <textarea className="sc-input" value={value||''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3}
      style={{width:'100%', resize:'vertical', fontFamily:'inherit', lineHeight:1.5}}/>
  </div>
);

/* ================= MANUAL BUILDER ================= */
const ManualBuilder = () => {
  const [abilities, setAbilities] = React.useState({STR:14,DEX:15,CON:13,INT:10,WIS:12,CHA:8});
  const [name, setName] = React.useState('');
  const [klass, setKlass] = React.useState('rogue');
  const [race, setRace] = React.useState('halfelf');
  const [bg, setBg] = React.useState('sailor');
  const [lvl, setLvl] = React.useState(1);
  const [pronouns, setPronouns] = React.useState('they/them');
  const [align, setAlign] = React.useState('CN');
  const [hp, setHp] = React.useState(10);
  const [ac, setAc] = React.useState(14);
  const [speed, setSpeed] = React.useState(30);
  const mod = v => Math.floor((v-10)/2);

  const bump = (ab, d) => setAbilities(a => ({...a, [ab]: Math.max(3, Math.min(20, a[ab]+d))}));

  return (
    <div style={{padding:'24px 28px 48px', display:'grid', gridTemplateColumns:'1fr 320px', gap:24, maxWidth:1400, margin:'0 auto'}}>
      <div style={{display:'flex', flexDirection:'column', gap:16}}>
        {/* Identity */}
        <Section title="Identity" icon="feather">
          <div style={{display:'grid', gridTemplateColumns:'2fr 1fr 1fr', gap:12}}>
            <CCField label="Character name" value={name} onChange={setName} placeholder="Name them."/>
            <CCField label="Pronouns" value={pronouns} onChange={setPronouns}/>
            <CCField label="Alignment" value={align} onChange={setAlign}/>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginTop:12}}>
            <Dropdown label="Race" value={race} onChange={setRace} options={CC_RACES.map(r=>[r.id,r.n])}/>
            <Dropdown label="Class" value={klass} onChange={setKlass} options={CC_CLASSES.map(c=>[c.id,c.n])}/>
            <Dropdown label="Background" value={bg} onChange={setBg} options={CC_BACKGROUNDS.map(b=>[b.id,b.n])}/>
            <div>
              <label className="sc-label" style={{display:'block', marginBottom:6}}>Level</label>
              <div style={{display:'flex', alignItems:'center', gap:4}}>
                <button className="sc-btn sc-btn-sm sc-btn-icon" onClick={() => setLvl(l=>Math.max(1,l-1))}><Icon name="minus" size={11}/></button>
                <div style={{flex:1, textAlign:'center', fontFamily:'Cinzel, serif', fontSize:18}}>{lvl}</div>
                <button className="sc-btn sc-btn-sm sc-btn-icon" onClick={() => setLvl(l=>Math.min(20,l+1))}><Icon name="plus" size={11}/></button>
              </div>
            </div>
          </div>
        </Section>

        {/* Abilities */}
        <Section title="Ability scores" icon="zap">
          <div style={{display:'grid', gridTemplateColumns:'repeat(6, 1fr)', gap:10}}>
            {CC_ABILITIES.map(ab => (
              <div key={ab} className="sc-card" style={{padding:'12px 6px', textAlign:'center'}}>
                <div style={{fontFamily:'Cinzel, serif', fontSize:11, letterSpacing:'0.15em', color:'var(--muted-foreground)', marginBottom:4}}>{ab}</div>
                <div style={{fontFamily:'Cinzel, serif', fontSize:24, fontWeight:600}}>{abilities[ab]}</div>
                <div style={{fontSize:11, color:'var(--muted-foreground)', marginBottom:8}}>{mod(abilities[ab])>=0?'+':''}{mod(abilities[ab])}</div>
                <div style={{display:'flex', gap:4, justifyContent:'center'}}>
                  <button className="sc-btn sc-btn-sm sc-btn-icon" onClick={() => bump(ab,-1)}><Icon name="minus" size={10}/></button>
                  <button className="sc-btn sc-btn-sm sc-btn-icon" onClick={() => bump(ab,1)}><Icon name="plus" size={10}/></button>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Combat stats */}
        <Section title="Combat" icon="sword">
          <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12}}>
            <NumField label="Hit points" value={hp} onChange={setHp}/>
            <NumField label="Armor class" value={ac} onChange={setAc}/>
            <NumField label="Speed (ft)" value={speed} onChange={setSpeed}/>
            <NumField label="Initiative" value={mod(abilities.DEX)} readOnly/>
          </div>
        </Section>

        {/* Skills */}
        <Section title="Skills & proficiencies" icon="list">
          <div style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:6}}>
            {[
              ['Acrobatics','DEX'],['Animal Handling','WIS'],['Arcana','INT'],['Athletics','STR'],
              ['Deception','CHA'],['History','INT'],['Insight','WIS'],['Intimidation','CHA'],
              ['Investigation','INT'],['Medicine','WIS'],['Nature','INT'],['Perception','WIS'],
              ['Performance','CHA'],['Persuasion','CHA'],['Religion','INT'],['Sleight of Hand','DEX'],
              ['Stealth','DEX'],['Survival','WIS'],
            ].map(([sk, ab], i) => {
              const trained = [0,3,9,14,16].includes(i);
              const exp = i === 16;
              return (
                <label key={sk} style={{
                  display:'grid', gridTemplateColumns:'24px 1fr 36px 40px', alignItems:'center', gap:8,
                  padding:'6px 10px', background:'var(--muted)', borderRadius:4, fontSize:12, cursor:'pointer'
                }}>
                  <input type="checkbox" defaultChecked={trained} style={{accentColor:'var(--primary)'}}/>
                  <span>{sk}</span>
                  <span style={{fontSize:10, color:'var(--muted-foreground)', textTransform:'uppercase'}}>{ab}</span>
                  <span style={{
                    textAlign:'right', fontVariantNumeric:'tabular-nums', fontFamily:'Cinzel, serif',
                    color: trained ? 'var(--primary)' : 'var(--foreground)'
                  }}>
                    {(mod(abilities[ab]) + (trained?2:0) + (exp?2:0)) >= 0 ? '+' : ''}{mod(abilities[ab]) + (trained?2:0) + (exp?2:0)}
                  </span>
                </label>
              );
            })}
          </div>
        </Section>

        {/* Equipment */}
        <Section title="Equipment" icon="package">
          <div className="sc-card" style={{padding:0, overflow:'hidden'}}>
            <table style={{width:'100%', borderCollapse:'collapse', fontSize:12}}>
              <thead>
                <tr style={{background:'var(--muted)', color:'var(--muted-foreground)', textAlign:'left'}}>
                  <th style={{padding:'8px 12px', fontSize:10, letterSpacing:'0.04em', textTransform:'uppercase'}}>Item</th>
                  <th style={{padding:'8px 12px', fontSize:10, letterSpacing:'0.04em', textTransform:'uppercase', textAlign:'right'}}>Qty</th>
                  <th style={{padding:'8px 12px', fontSize:10, letterSpacing:'0.04em', textTransform:'uppercase', textAlign:'right'}}>Wt</th>
                  <th style={{padding:'8px 12px'}}></th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Rapier', 1, 2],
                  ['Shortbow + quiver (20 arrows)', 1, 2],
                  ['Leather armor', 1, 10],
                  ['Thieves\' tools', 1, 1],
                  ['Bedroll', 1, 7],
                  ['Belt pouch (37 gp, 12 sp)', 1, 1],
                ].map((row, i) => (
                  <tr key={i} style={{borderTop: i===0?'none':'1px solid var(--border)'}}>
                    <td style={{padding:'8px 12px'}}>{row[0]}</td>
                    <td style={{padding:'8px 12px', textAlign:'right', fontVariantNumeric:'tabular-nums'}}>{row[1]}</td>
                    <td style={{padding:'8px 12px', textAlign:'right', color:'var(--muted-foreground)', fontVariantNumeric:'tabular-nums'}}>{row[2]} lb</td>
                    <td style={{padding:'8px 12px', textAlign:'right'}}>
                      <button className="sc-btn sc-btn-sm sc-btn-ghost sc-btn-icon"><Icon name="x" size={11}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{padding:8, borderTop:'1px solid var(--border)'}}>
              <button className="sc-btn sc-btn-sm sc-btn-ghost"><Icon name="plus" size={11}/>Add item</button>
            </div>
          </div>
        </Section>

        {/* Bio */}
        <Section title="Bio & notes" icon="book">
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
            {['Appearance','Personality','Ideal','Bond','Flaw','Backstory'].map(l => (
              <CCArea key={l} label={l} value="" onChange={() => {}} placeholder="…"/>
            ))}
          </div>
        </Section>
      </div>

      {/* Summary sidebar */}
      <aside style={{position:'sticky', top:20, alignSelf:'start', display:'flex', flexDirection:'column', gap:12}}>
        <div className="sc-card" style={{padding:20}}>
          <div className="sc-label" style={{marginBottom:4}}>Summary</div>
          <div className="font-serif" style={{fontSize:20, marginBottom:2}}>{name || 'Unnamed'}</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)', marginBottom:14}}>
            Lv {lvl} · {CC_RACES.find(r=>r.id===race)?.n} {CC_CLASSES.find(c=>c.id===klass)?.n}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14}}>
            <StatMini label="HP" value={hp} accent/>
            <StatMini label="AC" value={ac}/>
            <StatMini label="Speed" value={`${speed}ft`}/>
          </div>
          <div className="sc-label" style={{marginBottom:6}}>Scores</div>
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:6}}>
            {CC_ABILITIES.map(ab => (
              <div key={ab} style={{padding:'6px 0', background:'var(--muted)', borderRadius:4, textAlign:'center'}}>
                <div style={{fontSize:9, color:'var(--muted-foreground)'}}>{ab}</div>
                <div style={{fontFamily:'Cinzel, serif', fontSize:14, fontWeight:600}}>{abilities[ab]} <span style={{fontSize:9, color:'var(--muted-foreground)', fontWeight:400}}>({mod(abilities[ab])>=0?'+':''}{mod(abilities[ab])})</span></div>
              </div>
            ))}
          </div>
          <hr className="sc-divider" style={{margin:'14px 0'}}/>
          <div className="sc-label" style={{marginBottom:6}}>Background</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>{CC_BACKGROUNDS.find(b=>b.id===bg)?.blurb}</div>
        </div>
        <button className="sc-btn sc-btn-primary" style={{width:'100%', justifyContent:'center'}}>
          <Icon name="check" size={13}/>Save character
        </button>
        <button className="sc-btn" style={{width:'100%', justifyContent:'center'}}>
          <Icon name="copy" size={13}/>Export as JSON
        </button>
        <div style={{fontSize:11, color:'var(--muted-foreground)', textAlign:'center', lineHeight:1.5}}>
          Changes save automatically to your library.
        </div>
      </aside>
    </div>
  );
};

const Section = ({title, icon, children}) => (
  <div className="sc-card" style={{padding:18}}>
    <div style={{display:'flex', alignItems:'center', gap:8, marginBottom:14}}>
      <div style={{width:26, height:26, borderRadius:6, background:'color-mix(in srgb, var(--primary) 18%, var(--muted))', display:'grid', placeItems:'center', color:'var(--primary)'}}>
        <Icon name={icon} size={13}/>
      </div>
      <div className="font-serif" style={{fontSize:15}}>{title}</div>
    </div>
    {children}
  </div>
);

const Dropdown = ({label, value, onChange, options}) => (
  <div>
    <label className="sc-label" style={{display:'block', marginBottom:6}}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className="sc-input" style={{width:'100%'}}>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </select>
  </div>
);

const NumField = ({label, value, onChange, readOnly}) => (
  <div style={{padding:'10px 14px', background:'var(--muted)', borderRadius:6, textAlign:'center'}}>
    <div className="sc-label" style={{marginBottom:4}}>{label}</div>
    <input
      type={readOnly?"text":"number"} value={readOnly && typeof value==='number' ? (value>=0?'+':'')+value : value}
      onChange={e => onChange && onChange(parseInt(e.target.value,10) || 0)}
      readOnly={readOnly}
      style={{
        width:'100%', background:'transparent', border:'none', outline:'none', textAlign:'center',
        fontFamily:'Cinzel, serif', fontSize:20, fontWeight:600, color:'var(--foreground)'
      }}
    />
  </div>
);

const StatMini = ({label, value, accent}) => (
  <div style={{padding:'8px 4px', background:'var(--muted)', borderRadius:4, textAlign:'center'}}>
    <div style={{fontSize:9, color:'var(--muted-foreground)', letterSpacing:'0.1em'}}>{label.toUpperCase()}</div>
    <div style={{fontFamily:'Cinzel, serif', fontSize:16, fontWeight:600, color: accent?'var(--primary)':'var(--foreground)'}}>{value}</div>
  </div>
);

window.CharacterCreatorPage = CharacterCreatorPage;
