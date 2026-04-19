/* The Forge — horizontal tabs + content sidebar + Relationships graph (signature) */

const ForgePage = ({ isDM }) => {
  const [tab, setTab] = React.useState('relationships');
  const tabs = [
    ['scenes','Scenes','scroll'],
    ['locations','Locations','mapPin'],
    ['pantheon','Pantheon','star'],
    ['timeline','Timeline','clock'],
    ['calendar','Calendar','calendar'],
    ['factions','Factions','shield'],
    ['npcs','NPCs','users'],
    ['encounters','Encounters','sword'],
    ['quests','Quests','scroll'],
    ['bounties','Bounties','target'],
    ['relationships','Relationships','network'],
    ['tables','Random tables','table'],
  ];

  return (
    <div className="sc-fade-in" style={{display:'flex', height:'100%', minHeight:0}}>
      {/* Left content sidebar */}
      <aside style={{width:240, borderRight:'1px solid var(--border)', background:'var(--sidebar)', display:'flex', flexDirection:'column', minHeight:0, flexShrink:0}}>
        <div style={{padding:'14px 14px 10px'}}>
          <div className="sc-label" style={{marginBottom:8, color:'var(--muted-foreground)'}}>The Sunken Tides</div>
          <div style={{position:'relative'}}>
            <Icon name="search" size={13} style={{position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--muted-foreground)'}}/>
            <input className="sc-input" placeholder="Search world…" style={{paddingLeft:30, fontSize:12}}/>
          </div>
        </div>
        <div style={{padding:'4px 8px 14px', overflowY:'auto', flex:1}}>
          <SidebarSection icon="mapPin" title="Locations" count={19} items={['Sundered Reach','└ Port Lisban','└ Lantern Cove','└ The Drowned Chapel','Skull Atoll','The Deep Maw']}/>
          <SidebarSection icon="users" title="NPCs" count={38} items={['Captain Vhan Tellir','Xharos the Lantern-Keeper','Harbormaster Oss','Madam Orrick','Corporal Dren']}/>
          <SidebarSection icon="shield" title="Factions" count={6} items={['Spice Guild','Coral Court','Stormcrow Reavers','Bell Friars']}/>
          <SidebarSection icon="star" title="Pantheon" count={5} items={['Ulomë, The Tide-Keeper','Nharath, The Drowned Crown']}/>
        </div>
      </aside>

      {/* Main */}
      <div style={{flex:1, display:'flex', flexDirection:'column', minWidth:0, minHeight:0}}>
        {/* Tab bar */}
        <div className="sc-tabs" style={{padding:'0 20px', background:'var(--background)', flexShrink:0}}>
          {tabs.map(([id, label, icon]) => (
            <button key={id} className={`sc-tab ${tab===id?'active':''}`} onClick={() => setTab(id)}>
              <Icon name={icon} size={13}/>{label}
              {id==='relationships' && <span className="sc-badge" style={{padding:'0 5px', fontSize:9, marginLeft:4}}>new</span>}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{flex:1, overflow:'auto', minHeight:0}}>
          {tab === 'relationships' && <RelationshipsTab isDM={isDM}/>}
          {tab === 'quests' && <QuestsTab isDM={isDM}/>}
          {tab === 'timeline' && <TimelineTab isDM={isDM}/>}
          {tab === 'calendar' && <CalendarTab isDM={isDM}/>}
          {tab === 'tables' && <RandomTablesTab/>}
          {tab === 'encounters' && <EncountersTab isDM={isDM}/>}
          {tab === 'npcs' && <NPCsTab isDM={isDM}/>}
          {tab === 'locations' && <LocationsTab isDM={isDM}/>}
          {tab === 'factions' && <FactionsTab isDM={isDM}/>}
          {tab === 'pantheon' && <PantheonTab/>}
          {tab === 'scenes' && <ScenesTab isDM={isDM}/>}
          {tab === 'bounties' && <BountiesTab/>}
        </div>
      </div>
    </div>
  );
};

const SidebarSection = ({icon, title, count, items}) => {
  const [open, setOpen] = React.useState(title === 'Locations');
  return (
    <div style={{marginBottom:6}}>
      <button onClick={() => setOpen(v => !v)} style={{display:'flex', alignItems:'center', gap:6, padding:'6px 8px', width:'100%', background:'transparent', border:'none', color:'var(--sidebar-foreground)', cursor:'pointer', fontSize:12, fontWeight:500, opacity:0.85}}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={12}/>
        <Icon name={icon} size={13} style={{color:'var(--muted-foreground)'}}/>
        <span style={{flex:1, textAlign:'left'}}>{title}</span>
        <span style={{fontSize:10, color:'var(--muted-foreground)', fontVariantNumeric:'tabular-nums'}}>{count}</span>
      </button>
      {open && (
        <div style={{paddingLeft:10}}>
          {items.map((n,i) => (
            <div key={i} className="sidebar-link" style={{padding:'4px 10px', fontSize:12, opacity: n.startsWith('└') ? 0.7 : 0.85}}>
              {n}
            </div>
          ))}
          <button className="sc-btn sc-btn-ghost sc-btn-sm" style={{marginLeft:10, marginTop:2, fontSize:11, color:'var(--muted-foreground)'}}>
            <Icon name="plus" size={11}/>Add
          </button>
        </div>
      )}
    </div>
  );
};

/* ---------- Relationships Graph (signature) ---------- */
const RelationshipsTab = ({ isDM }) => {
  const W = 900, H = 560;
  const [nodes, setNodes] = React.useState([
    { id:'vhan', label:'Captain Vhan Tellir', type:'npc', x:280, y:180 },
    { id:'xharos', label:'Xharos', type:'npc', x:600, y:360, secret:true },
    { id:'oss', label:'Harbormaster Oss', type:'npc', x:130, y:320 },
    { id:'orrick', label:'Madam Orrick', type:'npc', x:440, y:90 },
    { id:'riga', label:'Riga Stormveil', type:'pc', x:340, y:420 },
    { id:'spice', label:'Spice Guild', type:'faction', x:160, y:130 },
    { id:'coral', label:'Coral Court', type:'faction', x:710, y:190 },
    { id:'stormcrow', label:'Stormcrow Reavers', type:'faction', x:540, y:490 },
    { id:'lisban', label:'Port Lisban', type:'location', x:60, y:210 },
    { id:'cove', label:'Lantern Cove', type:'location', x:770, y:440 },
    { id:'ulome', label:'Ulomë', type:'deity', x:800, y:80 },
  ]);
  const edges = [
    ['vhan','spice','ally', 2, false],
    ['vhan','orrick','rival', 1, false],
    ['oss','spice','ally', 2, false],
    ['oss','lisban','ally', 3, false],
    ['vhan','stormcrow','enemy', 3, false],
    ['xharos','coral','ally', 3, true],
    ['xharos','cove','ally', 3, true],
    ['coral','stormcrow','rival', 2, false],
    ['riga','ulome','ally', 3, false],
    ['riga','vhan','ally', 1, false],
    ['spice','lisban','ally', 2, false],
    ['orrick','stormcrow','ally', 2, true],
    ['cove','coral','ally', 2, true],
  ];

  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));
  const [drag, setDrag] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const [selected, setSelected] = React.useState(null);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({x:0, y:0});
  const [panning, setPanning] = React.useState(null);
  const svgRef = React.useRef(null);

  const onNodeMouseDown = (e, id) => {
    e.stopPropagation();
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    setDrag({ id, offsetX:(e.clientX-rect.left)/zoom - pan.x/zoom - nodeById[id].x, offsetY:(e.clientY-rect.top)/zoom - pan.y/zoom - nodeById[id].y });
    setSelected(id);
  };
  const onMouseMove = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    if (drag) {
      const x = (e.clientX - rect.left)/zoom - pan.x/zoom - drag.offsetX;
      const y = (e.clientY - rect.top)/zoom - pan.y/zoom - drag.offsetY;
      setNodes(ns => ns.map(n => n.id === drag.id ? { ...n, x, y } : n));
    } else if (panning) {
      setPan({ x: panning.startX + (e.clientX - panning.x), y: panning.startY + (e.clientY - panning.y) });
    }
  };
  const onMouseUp = () => { setDrag(null); setPanning(null); };
  const onBgMouseDown = (e) => {
    setPanning({ x: e.clientX, y: e.clientY, startX: pan.x, startY: pan.y });
    setSelected(null);
  };
  const onWheel = (e) => {
    e.preventDefault();
    const dz = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.4, Math.min(2, z * dz)));
  };

  const typeStyle = {
    npc:     { fill:'#2b4f7a', stroke:'#5b9bd5' },
    pc:      { fill:'#7b3a0f', stroke:'var(--primary)' },
    faction: { fill:'#5c3a1a', stroke:'#d98b3a' },
    location:{ fill:'#2a4f3a', stroke:'#5fb57a' },
    deity:   { fill:'#4a2e5e', stroke:'#b583e0' },
  };
  const edgeColor = (t) => t==='ally' ? '#7ec27e' : t==='enemy' ? 'var(--destructive)' : '#d6a85a';

  return (
    <div style={{padding:'16px 20px', height:'100%', display:'flex', flexDirection:'column', minHeight:0}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, flexWrap:'wrap', gap:10}}>
        <div>
          <div className="font-serif" style={{fontSize:20}}>Relationship Web</div>
          <div style={{fontSize:12, color:'var(--muted-foreground)'}}>Drag nodes · scroll to zoom · click for detail. {isDM ? 'Dashed = secret (DM only).' : 'Hidden connections will not appear here.'}</div>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <div style={{display:'flex', gap:10, fontSize:11, color:'var(--muted-foreground)', marginRight:10}}>
            <Legend color="#7ec27e" label="Ally"/>
            <Legend color="var(--destructive)" label="Enemy"/>
            <Legend color="#d6a85a" label="Rival"/>
          </div>
          <button className="sc-btn sc-btn-sm" onClick={() => { setZoom(1); setPan({x:0,y:0}); }}><Icon name="reset" size={12}/>Reset</button>
          <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>Node</button>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 260px', gap:14, flex:1, minHeight:0}}>
        <div className="sc-card" style={{overflow:'hidden', position:'relative', background:'var(--background)'}}>
          <svg
            ref={svgRef}
            width="100%" height="100%"
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid meet"
            className="bg-dot"
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onMouseDown={onBgMouseDown}
            onWheel={onWheel}
            style={{cursor: panning ? 'grabbing' : 'grab', userSelect:'none'}}
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
              {/* Edges */}
              {edges.filter(([,,,,secret]) => isDM || !secret).map(([a,b,type,strength,secret], i) => {
                const na = nodeById[a], nb = nodeById[b];
                if (!na || !nb) return null;
                const mx = (na.x+nb.x)/2, my = (na.y+nb.y)/2;
                const color = edgeColor(type);
                return (
                  <g key={i}>
                    <line x1={na.x} y1={na.y} x2={nb.x} y2={nb.y} stroke={color} strokeWidth={strength} opacity={0.55} strokeDasharray={secret ? '6 4' : null}/>
                    <g transform={`translate(${mx} ${my})`}>
                      <rect x={-22} y={-8} width={44} height={16} rx={8} fill="var(--popover)" stroke={color} strokeOpacity="0.5" strokeWidth={0.8}/>
                      <text textAnchor="middle" y={4} fontSize={9} fill="var(--popover-foreground)" fontFamily="Inter" style={{textTransform:'capitalize'}}>{type}</text>
                    </g>
                  </g>
                );
              })}
              {/* Nodes */}
              {nodes.map(n => {
                const st = typeStyle[n.type];
                const isHover = hover === n.id, isSel = selected === n.id;
                const r = n.type === 'pc' ? 22 : n.type === 'faction' ? 20 : 18;
                return (
                  <g key={n.id}
                    transform={`translate(${n.x} ${n.y})`}
                    onMouseDown={(e) => onNodeMouseDown(e, n.id)}
                    onMouseEnter={() => setHover(n.id)}
                    onMouseLeave={() => setHover(null)}
                    style={{cursor: drag?.id === n.id ? 'grabbing':'grab'}}
                  >
                    {isSel && <circle r={r+7} fill="none" stroke="var(--primary)" strokeWidth={1.5} opacity={0.7}/>}
                    <circle r={r} fill={st.fill} stroke={st.stroke} strokeWidth={isHover ? 3 : 2} strokeDasharray={n.secret && isDM ? '4 2' : null}/>
                    <text textAnchor="middle" y={4} fontSize={10} fontWeight={600} fill="white" fontFamily="Inter">
                      {n.label.split(' ').map(w=>w[0]).slice(0,2).join('')}
                    </text>
                    <text textAnchor="middle" y={r + 14} fontSize={11} fill="var(--foreground)" fontFamily="Inter">{n.label}</text>
                  </g>
                );
              })}
            </g>
          </svg>
          <div style={{position:'absolute', bottom:10, right:10, display:'flex', flexDirection:'column', gap:4}}>
            <button className="sc-btn sc-btn-icon sc-btn-sm" onClick={() => setZoom(z => Math.min(2, z*1.15))}><Icon name="plus" size={12}/></button>
            <button className="sc-btn sc-btn-icon sc-btn-sm" onClick={() => setZoom(z => Math.max(0.4, z*0.87))}><Icon name="minus" size={12}/></button>
          </div>
          <div style={{position:'absolute', top:10, left:10, fontSize:11, color:'var(--muted-foreground)', background:'color-mix(in srgb, var(--background) 80%, transparent)', padding:'4px 8px', borderRadius:4, border:'1px solid var(--border)'}}>
            {Math.round(zoom*100)}% · {nodes.length} nodes · {edges.filter(e => isDM || !e[4]).length} edges
          </div>
        </div>

        {/* Side panel */}
        <div className="sc-card" style={{padding:14, display:'flex', flexDirection:'column', gap:12, overflow:'auto'}}>
          {selected ? (
            <NodeDetail node={nodeById[selected]} edges={edges} nodeById={nodeById} isDM={isDM}/>
          ) : (
            <>
              <div className="sc-label">Filters</div>
              {['NPCs','Factions','Locations','Deities','PCs'].map(f => (
                <label key={f} style={{display:'flex', alignItems:'center', gap:8, fontSize:12, cursor:'pointer'}}>
                  <input type="checkbox" defaultChecked style={{accentColor:'var(--primary)'}}/>
                  <span>{f}</span>
                  <span style={{marginLeft:'auto', fontSize:10, color:'var(--muted-foreground)'}}>
                    {{NPCs:nodes.filter(n=>n.type==='npc').length, Factions:nodes.filter(n=>n.type==='faction').length, Locations:nodes.filter(n=>n.type==='location').length, Deities:nodes.filter(n=>n.type==='deity').length, PCs:nodes.filter(n=>n.type==='pc').length}[f]}
                  </span>
                </label>
              ))}
              <hr className="sc-divider"/>
              <div className="sc-label">Tips</div>
              <div style={{fontSize:12, color:'var(--muted-foreground)', lineHeight:1.55}}>
                Drag any node to reposition. Click a node to see its ties. Secret edges only appear for the DM.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Legend = ({color, label}) => (
  <span style={{display:'inline-flex', alignItems:'center', gap:5}}>
    <span style={{width:10, height:2, background:color, display:'inline-block'}}/>{label}
  </span>
);

const NodeDetail = ({node, edges, nodeById, isDM}) => {
  if (!node) return null;
  const connections = edges.filter(([a,b,,,secret]) => (a===node.id || b===node.id) && (isDM || !secret));
  return (
    <>
      <div>
        <div className="sc-label" style={{marginBottom:4, textTransform:'uppercase'}}>{node.type}</div>
        <div className="font-serif" style={{fontSize:18}}>{node.label}</div>
      </div>
      <div className="sc-label">Ties ({connections.length})</div>
      <div style={{display:'flex', flexDirection:'column', gap:6}}>
        {connections.map(([a,b,t,,secret], i) => {
          const other = a === node.id ? nodeById[b] : nodeById[a];
          if (!other) return null;
          return (
            <div key={i} style={{display:'flex', alignItems:'center', gap:8, fontSize:12, padding:'6px 8px', background:'var(--muted)', borderRadius:6}}>
              <span style={{width:6, height:6, borderRadius:99, background: t==='ally' ? '#7ec27e' : t==='enemy' ? 'var(--destructive)' : '#d6a85a'}}/>
              <span style={{flex:1}}>{other.label}</span>
              <span style={{fontSize:10, color:'var(--muted-foreground)', textTransform:'capitalize'}}>{t}{secret && ' ·🔒'}</span>
            </div>
          );
        })}
      </div>
      <button className="sc-btn sc-btn-sm"><Icon name="edit" size={12}/>Open entity</button>
    </>
  );
};

/* ---------- Quests Tab ---------- */
const QuestsTab = ({isDM}) => {
  const quests = [
    { t:'The Drowned Bell', tag:'Urgent', status:'Active', desc:'Recover the spice guild\'s reliquary from the Drowned Chapel.', giver:'Madam Orrick'},
    { t:'Ghost of the Lantern', tag:'Mystery', status:'Active', desc:'Lights at the old lighthouse have returned. Investigate who — or what — is keeping them.', giver:'Harbormaster Oss'},
    { t:'Salt and Silver', tag:'Side', status:'Active', desc:'Escort a Spice Guild shipment past the Stormcrow Reavers.', giver:'Captain Vhan'},
    { t:'The Coral Tithe', tag:'Faction', status:'Offered', desc:'The Coral Court requests tribute in exchange for safe passage.', giver:'Coral Court envoy'},
    { t:'Blood in the Bilge', tag:'Story', status:'Completed', desc:'Found the missing bosun — alive, briefly.', giver:'Captain Vhan'},
  ];
  return (
    <div style={{padding:'16px 20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12}}>
        <div className="font-serif" style={{fontSize:20}}>Quests</div>
        <button className="sc-btn sc-btn-primary sc-btn-sm"><Icon name="plus" size={12}/>New quest</button>
      </div>
      <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))', gap:12}}>
        {quests.map(q => (
          <div key={q.t} className="sc-card sc-card-hover" style={{padding:14, cursor:'pointer'}}>
            <div style={{display:'flex', gap:6, marginBottom:8}}>
              <span className="sc-badge sc-badge-primary">{q.tag}</span>
              <span className="sc-badge" style={{opacity:q.status==='Completed'?0.5:1}}>{q.status}</span>
            </div>
            <div className="font-serif" style={{fontSize:16, marginBottom:4}}>{q.t}</div>
            <div style={{fontSize:12, color:'var(--muted-foreground)', lineHeight:1.55, marginBottom:10}}>{q.desc}</div>
            <div style={{fontSize:11, color:'var(--muted-foreground)', display:'flex', alignItems:'center', gap:5}}>
              <Icon name="users" size={11}/>Given by {q.giver}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Generic tab placeholder ---------- */
const GenericTab = ({tab, tabs}) => {
  const meta = tabs.find(t => t[0] === tab);
  return (
    <div style={{padding:'40px 20px'}} className="empty-state">
      <div style={{width:56, height:56, borderRadius:12, background:'var(--muted)', display:'grid', placeItems:'center', color:'var(--muted-foreground)', marginBottom:14}}>
        <Icon name={meta?.[2] || 'book'} size={26}/>
      </div>
      <div className="font-serif" style={{fontSize:22, color:'var(--foreground)', marginBottom:6}}>{meta?.[1]}</div>
      <div style={{fontSize:13, maxWidth:420, marginBottom:16}}>
        The {meta?.[1].toLowerCase()} tab follows the same sidebar-and-cards pattern.
        Try the Relationships or Quests tabs above for fully-styled examples.
      </div>
      <button className="sc-btn sc-btn-primary"><Icon name="plus" size={13}/>Create {meta?.[1].slice(0,-1).toLowerCase()}</button>
    </div>
  );
};

window.ForgePage = ForgePage;
