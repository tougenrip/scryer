/* VTT Session - full bleed canvas with draggable tokens, initiative, dice tray */

const VTTPage = ({ isDM }) => {
  const GRID = 48;
  const COLS = 22, ROWS = 14;
  const [tokens, setTokens] = React.useState([
    { id:'riga', name:'Riga', col:3, row:7, hp:48, max:54, size:1, color:'#d98b3a', type:'pc', ac:18, init:14 },
    { id:'vex', name:'Vex', col:4, row:6, hp:42, max:42, size:1, color:'#c23a3a', type:'pc', ac:16, init:19 },
    { id:'orroden', name:'Orr', col:3, row:8, hp:38, max:44, size:1, color:'#a375d6', type:'pc', ac:14, init:11 },
    { id:'kaskar', name:'Kas', col:4, row:7, hp:48, max:68, size:1, color:'#3a98c2', type:'pc', ac:15, init:9 },
    { id:'syl', name:'Syl', col:2, row:8, hp:52, max:52, size:1, color:'#78b84a', type:'pc', ac:13, init:16 },
    { id:'xharos', name:'Xharos', col:16, row:6, hp:64, max:84, size:2, color:'#6b3b91', type:'boss', ac:17, init:17, secret:true },
    { id:'sah1', name:'Sahuagin', col:13, row:5, hp:12, max:22, size:1, color:'#4a6b5e', type:'enemy', ac:12, init:8 },
    { id:'sah2', name:'Sahuagin', col:13, row:9, hp:18, max:22, size:1, color:'#4a6b5e', type:'enemy', ac:12, init:8 },
    { id:'sah3', name:'Sahuagin', col:15, row:10, hp:22, max:22, size:1, color:'#4a6b5e', type:'enemy', ac:12, init:8 },
  ]);
  const [selected, setSelected] = React.useState('vex');
  const [drag, setDrag] = React.useState(null);
  const [turn, setTurn] = React.useState(0);
  const [round, setRound] = React.useState(2);
  const [log, setLog] = React.useState([
    { who:'Vex', text:'attacks Sahuagin — Hit! 11 piercing.', d:'now' },
    { who:'DM', text:'initiative order set for round 2', d:'1m', sys:true },
  ]);
  const [tray, setTray] = React.useState([]);  // dice results

  const initiative = [...tokens].sort((a,b) => b.init - a.init);
  const activeId = initiative[turn % initiative.length]?.id;

  const canvasRef = React.useRef(null);
  const onMouseDown = (e, id) => {
    e.stopPropagation();
    setSelected(id);
    const rect = canvasRef.current.getBoundingClientRect();
    const t = tokens.find(t => t.id === id);
    setDrag({ id, dx:(e.clientX - rect.left) - t.col*GRID, dy:(e.clientY - rect.top) - t.row*GRID });
  };
  const onMouseMove = (e) => {
    if (!drag) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const col = Math.max(0, Math.min(COLS-1, Math.round((e.clientX - rect.left - drag.dx) / GRID)));
    const row = Math.max(0, Math.min(ROWS-1, Math.round((e.clientY - rect.top - drag.dy) / GRID)));
    setTokens(ts => ts.map(t => t.id === drag.id ? { ...t, col, row } : t));
  };
  const onMouseUp = () => setDrag(null);

  const rollDice = (sides, count = 1, mod = 0, label) => {
    const r = roll(sides, count);
    const total = r.total + mod;
    const id = Math.random().toString(36).slice(2);
    setTray(tr => [{ id, sides, count, mod, rolls:r.rolls, total, label, t: Date.now() }, ...tr].slice(0, 6));
    setLog(l => [{ who:'You', text:`${label || `${count}d${sides}${mod?(mod>0?` +${mod}`:` ${mod}`):''}`}: ${r.rolls.join(', ')}${mod?` ${mod>0?'+':''}${mod}`:''} = ${total}`, d:'now', roll:true }, ...l].slice(0, 60));
  };

  const selToken = tokens.find(t => t.id === selected);

  const endTurn = () => {
    setTurn(t => {
      const n = t + 1;
      if (n % initiative.length === 0) setRound(r => r + 1);
      return n;
    });
  };

  const damage = (id, d) => setTokens(ts => ts.map(t => t.id === id ? { ...t, hp: Math.max(0, t.hp - d) } : t));
  const heal = (id, h) => setTokens(ts => ts.map(t => t.id === id ? { ...t, hp: Math.min(t.max, t.hp + h) } : t));

  return (
    <div className="sc-fade-in" style={{display:'flex', flexDirection:'column', height:'100%', minHeight:0}}>
      {/* Top bar */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 18px', borderBottom:'1px solid var(--border)', background:'var(--sidebar)', flexShrink:0}}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <div className="sc-pulse-ring" style={{width:8, height:8, borderRadius:999, background:'#d54'}}/>
            <span style={{fontSize:12, fontWeight:600}}>LIVE</span>
          </div>
          <hr style={{width:1, height:16, background:'var(--border)', border:'none'}}/>
          <div className="font-serif" style={{fontSize:16}}>The Drowned Chapel</div>
          <span className="sc-badge">Round {round}</span>
          <span className="sc-badge sc-badge-primary">Turn: {initiative[turn%initiative.length]?.name}</span>
        </div>
        <div style={{display:'flex', gap:6, alignItems:'center'}}>
          {isDM && <span className="sc-badge sc-badge-dm"><Icon name="crown" size={10}/>DM</span>}
          <button className="sc-btn sc-btn-sm"><Icon name="eye" size={12}/>Fog</button>
          <button className="sc-btn sc-btn-sm"><Icon name="target" size={12}/>Ruler</button>
          <button className="sc-btn sc-btn-sm"><Icon name="settings" size={12}/></button>
          <button className="sc-btn sc-btn-primary sc-btn-sm" onClick={endTurn}>End turn<Icon name="chevronRight" size={12}/></button>
        </div>
      </div>

      {/* Main grid: initiative | canvas | inspector */}
      <div style={{display:'grid', gridTemplateColumns:'200px 1fr 280px', flex:1, minHeight:0}}>
        {/* Initiative rail */}
        <aside style={{background:'var(--sidebar)', borderRight:'1px solid var(--border)', padding:'12px 10px', overflow:'auto'}}>
          <div className="sc-label" style={{marginBottom:8, padding:'0 4px'}}>Initiative</div>
          <div style={{display:'flex', flexDirection:'column', gap:6}}>
            {initiative.map((t, i) => {
              const active = t.id === activeId;
              const hpPct = Math.max(0, (t.hp / t.max) * 100);
              return (
                <button key={t.id + i} onClick={() => setSelected(t.id)} className="sc-card" style={{
                  padding:'8px 10px',
                  cursor:'pointer',
                  textAlign:'left',
                  border: active ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: active ? 'color-mix(in srgb, var(--primary) 15%, var(--card))' : (selected===t.id ? 'var(--accent)' : 'var(--card)'),
                  position:'relative',
                  display:'flex', gap:8, alignItems:'center'
                }}>
                  {active && <div style={{position:'absolute', left:-1, top:4, bottom:4, width:3, background:'var(--primary)', borderRadius:2}}/>}
                  <div style={{width:24, height:24, borderRadius:6, background:t.color, color:'white', display:'grid', placeItems:'center', fontSize:10, fontWeight:600, flexShrink:0}}>{t.init}</div>
                  <div style={{flex:1, minWidth:0}}>
                    <div className="truncate" style={{fontSize:12, fontWeight:500}}>{t.name}{t.secret && isDM && ' 👁'}</div>
                    <div style={{height:3, background:'var(--muted)', borderRadius:99, overflow:'hidden', marginTop:3}}>
                      <div style={{width:`${hpPct}%`, height:'100%', background: hpPct > 60 ? '#7ec27e' : hpPct > 25 ? '#e0a85a' : 'var(--destructive)'}}/>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <button className="sc-btn sc-btn-ghost sc-btn-sm" style={{width:'100%', marginTop:8, justifyContent:'center'}}>
            <Icon name="plus" size={12}/>Add combatant
          </button>
        </aside>

        {/* Canvas */}
        <div style={{position:'relative', overflow:'hidden', background:'#0f0c0a'}}>
          <div
            ref={canvasRef}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onMouseDown={() => setSelected(null)}
            style={{
              width: COLS * GRID,
              height: ROWS * GRID,
              margin:'20px auto',
              position:'relative',
              cursor: drag ? 'grabbing' : 'default',
              background: `
                radial-gradient(ellipse at 60% 40%, rgba(90,50,30,0.35), transparent 60%),
                radial-gradient(ellipse at 20% 80%, rgba(20,40,60,0.4), transparent 55%),
                linear-gradient(135deg, #1a1612 0%, #0e0c0a 100%)
              `,
              borderRadius:6,
              boxShadow:'0 20px 60px rgba(0,0,0,0.5), inset 0 0 80px rgba(0,0,0,0.6)',
              userSelect:'none'
            }}
          >
            {/* Stone floor pattern */}
            <svg width="100%" height="100%" style={{position:'absolute', inset:0, opacity:0.25, pointerEvents:'none'}}>
              <defs>
                <pattern id="stone" width="96" height="96" patternUnits="userSpaceOnUse">
                  <rect width="96" height="96" fill="#2a1f18"/>
                  <path d="M0 30 L50 30 L50 0 M50 30 L96 30 M50 30 L50 70 L0 70 M50 70 L96 70 L96 96" stroke="#000" strokeWidth="1" fill="none"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#stone)"/>
            </svg>

            {/* Water / pit in middle */}
            <div style={{position:'absolute', left:8*GRID, top:5*GRID, width:5*GRID, height:4*GRID, background:'radial-gradient(ellipse, rgba(30,70,120,0.45), rgba(10,20,40,0.7))', borderRadius:'50%', border:'1px solid rgba(80,130,180,0.3)'}}/>
            <div style={{position:'absolute', left:8*GRID, top:5*GRID, width:5*GRID, height:4*GRID, display:'grid', placeItems:'center', color:'rgba(140,180,220,0.5)', fontSize:10, fontFamily:'JetBrains Mono', letterSpacing:'0.2em', textTransform:'uppercase', pointerEvents:'none'}}>deep water</div>

            {/* Altar */}
            <div style={{position:'absolute', left:17*GRID, top:6*GRID, width:2*GRID, height:2*GRID, background:'linear-gradient(135deg, #4a3525, #2a1f15)', border:'1px solid rgba(200,140,80,0.4)', borderRadius:4, display:'grid', placeItems:'center', color:'rgba(200,140,80,0.7)'}}><Icon name="star" size={18}/></div>

            {/* Grid overlay */}
            <svg width="100%" height="100%" style={{position:'absolute', inset:0, pointerEvents:'none', opacity:0.18}}>
              <defs>
                <pattern id="grid" width={GRID} height={GRID} patternUnits="userSpaceOnUse">
                  <path d={`M ${GRID} 0 L 0 0 0 ${GRID}`} fill="none" stroke="#d6a85a" strokeWidth="0.8"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)"/>
            </svg>

            {/* Fog of war overlay (right third) - DM sees through */}
            <div style={{position:'absolute', left:20*GRID, top:0, width:2*GRID, height:ROWS*GRID, background: isDM ? 'rgba(10,10,10,0.4)' : 'rgba(8,6,4,0.95)', borderLeft: isDM ? '1px dashed rgba(200,140,80,0.4)' : 'none', pointerEvents:'none'}}>
              {isDM && <div style={{fontSize:9, color:'rgba(200,140,80,0.6)', padding:4, fontFamily:'JetBrains Mono', writingMode:'vertical-rl'}}>FOG</div>}
            </div>

            {/* Tokens */}
            {tokens.filter(t => isDM || !t.secret || t.col < 20).map(t => {
              const isActive = t.id === activeId;
              const isSel = t.id === selected;
              const hpPct = (t.hp / t.max) * 100;
              return (
                <div
                  key={t.id}
                  onMouseDown={(e) => onMouseDown(e, t.id)}
                  style={{
                    position:'absolute',
                    left: t.col * GRID + 2,
                    top: t.row * GRID + 2,
                    width: t.size * GRID - 4,
                    height: t.size * GRID - 4,
                    borderRadius: '50%',
                    background: `radial-gradient(circle at 30% 30%, ${t.color}, color-mix(in srgb, ${t.color} 50%, black))`,
                    border: isSel ? '2px solid var(--primary)' : isActive ? '2px solid #fff' : '2px solid rgba(0,0,0,0.5)',
                    boxShadow: isActive ? `0 0 12px ${t.color}, 0 2px 6px rgba(0,0,0,0.6)` : '0 2px 6px rgba(0,0,0,0.6)',
                    display:'grid', placeItems:'center',
                    fontFamily:'Cinzel, serif', fontSize: t.size > 1 ? 18 : 13, fontWeight:600,
                    color:'#fff', textShadow:'0 1px 2px rgba(0,0,0,0.8)',
                    cursor: drag?.id === t.id ? 'grabbing' : 'grab',
                    transition: drag?.id === t.id ? 'none' : 'left 0.18s, top 0.18s, box-shadow 0.15s',
                    zIndex: isSel ? 10 : 5,
                  }}
                >
                  {t.name.slice(0,1)}
                  {/* HP bar */}
                  <div style={{position:'absolute', bottom:-6, left:2, right:2, height:3, background:'rgba(0,0,0,0.7)', borderRadius:2, overflow:'hidden'}}>
                    <div style={{width:`${hpPct}%`, height:'100%', background: hpPct > 60 ? '#7ec27e' : hpPct > 25 ? '#e0a85a' : '#d54'}}/>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dice tray (floating) */}
          <div style={{position:'absolute', bottom:14, left:14, right:290, display:'flex', gap:10, flexWrap:'wrap', pointerEvents:'none'}}>
            {tray.slice(0,5).map(r => (
              <div key={r.id} className="sc-dice-pop" style={{
                padding:'8px 12px', background:'var(--popover)', borderRadius:8,
                border:'1px solid var(--border)',
                boxShadow:'0 8px 24px rgba(0,0,0,0.5)',
                fontSize:12, pointerEvents:'auto'
              }}>
                <div className="font-mono" style={{fontSize:10, color:'var(--muted-foreground)'}}>
                  {r.count}d{r.sides}{r.mod ? (r.mod>0?` +${r.mod}`:` ${r.mod}`) : ''}{r.label && ` · ${r.label}`}
                </div>
                <div className="font-serif" style={{fontSize:22, color:'var(--primary)', lineHeight:1}}>{r.total}</div>
                <div className="font-mono" style={{fontSize:9, color:'var(--muted-foreground)'}}>[{r.rolls.join(', ')}]</div>
              </div>
            ))}
          </div>
        </div>

        {/* Inspector + dice */}
        <aside style={{background:'var(--sidebar)', borderLeft:'1px solid var(--border)', display:'flex', flexDirection:'column', minHeight:0}}>
          {/* Inspector */}
          <div style={{padding:14, borderBottom:'1px solid var(--border)'}}>
            <div className="sc-label" style={{marginBottom:8}}>Inspector</div>
            {selToken ? (
              <>
                <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:10}}>
                  <div style={{width:36, height:36, borderRadius:8, background:selToken.color, display:'grid', placeItems:'center', fontFamily:'Cinzel, serif', fontWeight:600, color:'white'}}>{selToken.name[0]}</div>
                  <div>
                    <div style={{fontSize:13, fontWeight:600}}>{selToken.name}</div>
                    <div style={{fontSize:11, color:'var(--muted-foreground)'}}>AC {selToken.ac} · Init {selToken.init}</div>
                  </div>
                </div>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:12, marginBottom:4}}>
                  <span>HP</span>
                  <span className="font-mono">{selToken.hp}/{selToken.max}</span>
                </div>
                <div style={{height:6, background:'var(--muted)', borderRadius:99, overflow:'hidden'}}>
                  <div style={{width:`${(selToken.hp/selToken.max)*100}%`, height:'100%', background: selToken.hp / selToken.max > 0.6 ? '#7ec27e' : selToken.hp/selToken.max > 0.25 ? '#e0a85a' : 'var(--destructive)', transition:'width .2s'}}/>
                </div>
                <div style={{display:'flex', gap:4, marginTop:8}}>
                  <button className="sc-btn sc-btn-sm" style={{flex:1}} onClick={() => damage(selToken.id, 5)}><Icon name="minus" size={11}/>5</button>
                  <button className="sc-btn sc-btn-sm" style={{flex:1}} onClick={() => heal(selToken.id, 5)}><Icon name="plus" size={11}/>5</button>
                </div>
                <hr className="sc-divider" style={{margin:'10px 0'}}/>
                <div className="sc-label" style={{marginBottom:6}}>Actions</div>
                <div style={{display:'flex', flexDirection:'column', gap:4}}>
                  <button className="sc-btn sc-btn-sm" onClick={() => rollDice(20, 1, 6, `${selToken.name} attack`)}>Attack (+6) <Icon name="dice" size={11}/></button>
                  <button className="sc-btn sc-btn-sm" onClick={() => rollDice(6, 2, 3, `${selToken.name} damage`)}>Damage 2d6+3 <Icon name="flame" size={11}/></button>
                  <button className="sc-btn sc-btn-sm" onClick={() => rollDice(20, 1, 5, `${selToken.name} save`)}>Saving throw <Icon name="shield" size={11}/></button>
                </div>
              </>
            ) : (
              <div style={{fontSize:12, color:'var(--muted-foreground)'}}>Click a token to inspect.</div>
            )}
          </div>

          {/* Dice tray */}
          <div style={{padding:14, borderBottom:'1px solid var(--border)'}}>
            <div className="sc-label" style={{marginBottom:8}}>Dice</div>
            <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6}}>
              {[4,6,8,10,12,20,100].map(s => (
                <button key={s} onClick={() => rollDice(s)} className="sc-btn sc-btn-sm" style={{padding:'10px 0', justifyContent:'center', flexDirection:'column', gap:2}}>
                  <span className="font-serif" style={{fontSize:14}}>d{s}</span>
                </button>
              ))}
              <button onClick={() => rollDice(20, 1, 0, 'Advantage')} className="sc-btn sc-btn-sm" style={{padding:'10px 0', justifyContent:'center'}}>adv</button>
            </div>
          </div>

          {/* Log */}
          <div style={{padding:'12px 14px', flex:1, minHeight:0, overflow:'auto'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
              <div className="sc-label">Chat & log</div>
              <button className="sc-btn sc-btn-ghost sc-btn-sm" style={{fontSize:10}}>Clear</button>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:8}}>
              {log.map((m, i) => (
                <div key={i} style={{fontSize:12, lineHeight:1.45, color: m.sys ? 'var(--muted-foreground)' : 'var(--foreground)', fontStyle: m.sys ? 'italic' : 'normal'}}>
                  <span style={{color:'var(--primary)', fontWeight:600}}>{m.who}</span>
                  <span style={{color:'var(--muted-foreground)', fontSize:10, marginLeft:6}}>{m.d}</span>
                  <div className={m.roll ? 'font-mono' : ''} style={{fontSize: m.roll ? 11 : 12, marginTop:2}}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{padding:10, borderTop:'1px solid var(--border)', display:'flex', gap:6}}>
            <input className="sc-input" placeholder="Say something… (/r 1d20)" style={{fontSize:12}}/>
            <button className="sc-btn sc-btn-primary sc-btn-icon"><Icon name="send" size={13}/></button>
          </div>
        </aside>
      </div>
    </div>
  );
};

window.VTTPage = VTTPage;
