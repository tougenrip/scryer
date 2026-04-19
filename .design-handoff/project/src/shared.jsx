/* Shared helpers, icons, and context for the Scryer demo */

// Lucide-style icons inline (thin, 1.5 stroke). Returns SVG elements.
const Icon = ({ name, size = 16, className = "", style = {} }) => {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style,
  };
  const paths = {
    home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.3 3-6 6.5-6s6.5 2.7 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M15.5 20c0-2.3 1.8-4.5 5-4.5"/></>,
    map: <><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6z"/><path d="M9 3v15"/><path d="M15 6v15"/></>,
    sword: <><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m16 8-5 3-3 5 5-3 3-5z"/></>,
    dice: <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.2"/><circle cx="16" cy="8" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="8" cy="16" r="1.2"/><circle cx="16" cy="16" r="1.2"/></>,
    hammer: <><path d="m15 12-8 8a2.8 2.8 0 1 1-4-4l8-8"/><path d="M17.6 6.4 14 10l4 4 3.6-3.6a2.5 2.5 0 0 0 0-3.5l-1.5-1.5a2.5 2.5 0 0 0-3.5 0Z"/></>,
    scroll: <><path d="M8 21h8a3 3 0 0 0 3-3V6a3 3 0 0 0-3-3H6a3 3 0 0 0-3 3v1h3"/><path d="M6 7v11a3 3 0 0 0 6 0V9"/></>,
    star: <path d="M12 2.5 14.8 8.8l6.7.6-5 4.4 1.5 6.5L12 17l-6 3.3 1.5-6.5-5-4.4 6.7-.6z"/>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.6-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.6V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.6 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>,
    plus: <><path d="M12 5v14"/><path d="M5 12h14"/></>,
    minus: <path d="M5 12h14"/>,
    chevronRight: <path d="m9 6 6 6-6 6"/>,
    chevronDown: <path d="m6 9 6 6 6-6"/>,
    chevronLeft: <path d="m15 6-6 6 6 6"/>,
    chevronUp: <path d="m6 15 6-6 6 6"/>,
    x: <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
    check: <path d="m5 12 4.5 4.5L19 7"/>,
    eye: <><path d="M1.5 12S6 4.5 12 4.5 22.5 12 22.5 12 18 19.5 12 19.5 1.5 12 1.5 12"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M10 10a3 3 0 0 0 4 4"/><path d="M2 12s4-8 10-8a10 10 0 0 1 5 1.5"/><path d="M22 12s-4 8-10 8a10 10 0 0 1-5-1.5"/><path d="m2 2 20 20"/></>,
    shield: <path d="M12 3 4 6v6c0 4.5 3.5 8 8 9 4.5-1 8-4.5 8-9V6z"/>,
    heart: <path d="M12 20s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z"/>,
    zap: <path d="M13 2 3 14h7l-1 8 10-12h-7z"/>,
    flame: <path d="M12 2s5 4 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 3 3 0-4-3-6 0-9z"/>,
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.9 4.9 1.4 1.4"/><path d="m17.7 17.7 1.4 1.4"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m4.9 19.1 1.4-1.4"/><path d="m17.7 6.3 1.4-1.4"/></>,
    crown: <><path d="M3 18h18l-1.5-10-4 4-3.5-6-3.5 6-4-4z"/></>,
    book: <><path d="M4 4v16a1 1 0 0 0 1 1h14"/><path d="M20 3H7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h13z"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4"/><path d="M16 3v4"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    mapPin: <><path d="M12 22s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12Z"/><circle cx="12" cy="10" r="2.5"/></>,
    network: <><circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M10.5 6.5 6.5 17"/><path d="m13.5 6.5 4 10.5"/><path d="M7.5 19h9"/></>,
    list: <><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/></>,
    table: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></>,
    play: <path d="M7 5v14l12-7z"/>,
    pause: <><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></>,
    wand: <><path d="m15 4 1 3 3 1-3 1-1 3-1-3-3-1 3-1z"/><path d="M13 11 4 20"/></>,
    palette: <><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7" r="1.2"/><circle cx="16" cy="10" r="1.2"/><circle cx="16" cy="14" r="1.2"/><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2.2-.9 2.2-2 0-.6-.3-1-.6-1.3-.3-.4-.6-.8-.6-1.4 0-1.1.9-2 2-2h2.3A3.7 3.7 0 0 0 21 10.7 9 9 0 0 0 12 3"/></>,
    package: <><path d="M21 16V8l-9-5-9 5v8l9 5 9-5z"/><path d="m3.3 8 8.7 5 8.7-5"/><path d="M12 13v10"/></>,
    anchor: <><circle cx="12" cy="5" r="2.5"/><path d="M12 7.5V22"/><path d="M5 12h14"/><path d="M5 12a7 7 0 0 0 14 0"/></>,
    ship: <><path d="M12 3v7"/><path d="M5 10h14l-2 7H7z"/><path d="M3 20a4 4 0 0 0 3-1 4 4 0 0 0 3 1 4 4 0 0 0 3-1 4 4 0 0 0 3 1 4 4 0 0 0 3-1 4 4 0 0 0 3 1"/></>,
    skull: <><path d="M12 3a8 8 0 0 0-8 8v3l2 2v3h3v-2h6v2h3v-3l2-2v-3a8 8 0 0 0-8-8z"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/></>,
    feather: <><path d="M20 4C17 4 7 8 7 17v3h3c9 0 13-10 13-13z"/><path d="M16 8 4 20"/><path d="M12 12h5"/></>,
    send: <path d="m3 11 18-8-8 18-2-8z"/>,
    reset: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></>,
    sparkles: <><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/><path d="m5.6 5.6 2.8 2.8"/><path d="m15.6 15.6 2.8 2.8"/><path d="M5.6 18.4 8.4 15.6"/><path d="m15.6 8.4 2.8-2.8"/></>,
    link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1-1"/></>,
    edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2 2 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 16v-5"/><circle cx="12" cy="8" r="0.8"/></>,
    lock: <><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    alert: <><path d="M12 3 2 21h20z"/><path d="M12 10v5"/><circle cx="12" cy="18" r="0.8"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/></>,
    more: <><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></>,
  };
  return <svg {...common}>{paths[name] || null}</svg>;
};

// Brand mark
const ScryerMark = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <linearGradient id="sc-mark" x1="0" y1="0" x2="24" y2="24">
        <stop offset="0" stopColor="var(--primary)"/>
        <stop offset="1" stopColor="color-mix(in srgb, var(--primary) 60%, var(--foreground))"/>
      </linearGradient>
    </defs>
    <path d="M12 2 L20 7 V13 C20 17.5 16.5 21 12 22 C7.5 21 4 17.5 4 13 V7 Z"
      fill="url(#sc-mark)" opacity="0.18" stroke="var(--primary)" strokeWidth="1.2"/>
    <circle cx="12" cy="11" r="3.5" stroke="var(--primary)" strokeWidth="1.4" fill="none"/>
    <circle cx="12" cy="11" r="1.2" fill="var(--primary)"/>
    <path d="M14.5 13.5 17 16" stroke="var(--primary)" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
);

// d20 icon
const D20Icon = ({ size = 18, color = "currentColor" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round">
    <path d="M12 2 21 7v10l-9 5-9-5V7z"/>
    <path d="M12 2v9"/><path d="M3 7l9 4 9-4"/>
    <path d="M12 11 3 17"/><path d="m12 11 9 6"/>
    <path d="M12 22V11"/>
  </svg>
);

// Dice roller util
const roll = (sides, count = 1) => {
  let total = 0;
  const rolls = [];
  for (let i = 0; i < count; i++) {
    const r = Math.floor(Math.random() * sides) + 1;
    rolls.push(r);
    total += r;
  }
  return { total, rolls, expr: `${count}d${sides}` };
};

// Expose to window for shared access
Object.assign(window, { Icon, ScryerMark, D20Icon, roll });
