import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function toArr(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return v.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}
function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); }
  catch { return url || ''; }
}

/* ═══════════════════════════════════════════════════════
   BADGE CATALOG
   ═══════════════════════════════════════════════════════ */
const BADGES = {
  'bot':            { name: 'Bot',            file: 'Bot.png',                rarity: 'special' },
  'verified':       { name: 'Verified',       file: 'Verified.png',           rarity: 'uncommon' },
  'discord-member': { name: 'Discord Member', file: 'Discord-member.png',     rarity: 'common' },
  'coder':          { name: 'Coder',          file: 'Coder.png',              rarity: 'uncommon' },
  'developer':      { name: 'Developer',      file: 'Developer.png',          rarity: 'uncommon' },
  'bug-hunter':     { name: 'Bug Hunter',     file: 'Blurple-Bug-Hunter.png', rarity: 'rare' },
  'ppa':            { name: 'PPA',            file: 'PPA.png',                rarity: 'epic' },
  'staff':          { name: 'Staff',          file: 'Staff.png',              rarity: 'epic' },
  'owner':          { name: 'Owner',          file: 'Owner.png',              rarity: 'mythic' },
  'hidden':         { name: 'Hidden',         file: 'Hidden.png',             rarity: 'special' },
  'banned':         { name: 'Banned',         file: 'Banned.png',             rarity: 'special' },
  'terminated':     { name: 'Terminated',     file: 'Terminated.png',         rarity: 'special' },
};
const RARITY_GLOW = {
  common: '0 0 10px rgba(192,192,192,0.5)',
  uncommon: '0 0 12px rgba(125,211,252,0.55)',
  rare: '0 0 14px rgba(192,132,252,0.6)',
  epic: '0 0 16px rgba(251,191,36,0.65)',
  mythic: '0 0 20px rgba(255,100,180,0.75)',
  special: '0 0 8px rgba(120,120,120,0.4)',
};
function renderBadges(badgeIds, size) {
  if (!badgeIds || !badgeIds.length) return '';
  const px = size || 22;
  const order = ['mythic', 'epic', 'rare', 'uncommon', 'common', 'special'];
  return [...badgeIds]
    .map(id => ({ id, ...BADGES[id] }))
    .filter(b => b.file)
    .sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity))
    .map(b => `<img src="${b.file}" alt="${esc(b.name)}" title="${esc(b.name)}" style="width:${px}px;height:${px}px;object-fit:contain;border-radius:6px;filter:drop-shadow(${RARITY_GLOW[b.rarity]});" />`)
    .join('');
}

/* ═══════════════════════════════════════════════════════
   TIER 1 INTERPOLATION
   ═══════════════════════════════════════════════════════ */
function interpolate(str, ctx) {
  if (typeof str !== 'string') return str;
  return str.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p) => {
    let cur = ctx;
    for (const k of p.split('.')) {
      if (cur == null) return '';
      cur = cur[k];
    }
    return cur == null ? '' : String(cur);
  });
}

/* ═══════════════════════════════════════════════════════
   FAVICON MAP
   ═══════════════════════════════════════════════════════ */
const FAVICON_MAP = {
  'discord.com': '<svg viewBox="0 0 24 24" fill="#5865F2" style="width:100%;height:100%"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>',
  'discord.gg': '<svg viewBox="0 0 24 24" fill="#5865F2" style="width:100%;height:100%"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>',
  'github.com': '<svg viewBox="0 0 24 24" fill="#e8e8f0" style="width:100%;height:100%"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>',
  'youtube.com': '<svg viewBox="0 0 24 24" fill="#ff0000" style="width:100%;height:100%"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6z"/></svg>',
  'twitter.com': '<svg viewBox="0 0 24 24" fill="#1DA1F2" style="width:100%;height:100%"><path d="M23.95 4.57a10 10 0 01-2.82.77 4.96 4.96 0 002.16-2.72c-.95.56-2 .96-3.13 1.18a4.92 4.92 0 00-8.38 4.48A13.94 13.94 0 011.64 3.16a4.92 4.92 0 001.52 6.57 4.9 4.9 0 01-2.23-.61v.06a4.92 4.92 0 003.95 4.83 4.93 4.93 0 01-2.21.08 4.93 4.93 0 004.6 3.42A9.87 9.87 0 010 19.54a13.94 13.94 0 007.55 2.21c9.06 0 14.01-7.5 14.01-14.01 0-.21 0-.42-.02-.63A10 10 0 0024 4.59z"/></svg>',
  'x.com': '<svg viewBox="0 0 24 24" fill="#e8e8f0" style="width:100%;height:100%"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.6l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z"/></svg>',
  'spotify.com': '<svg viewBox="0 0 24 24" fill="#1DB954" style="width:100%;height:100%"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z"/></svg>',
  'twitch.tv': '<svg viewBox="0 0 24 24" fill="#9146FF" style="width:100%;height:100%"><path d="M11.57 4.71h1.72v5.14h-1.72zm4.72 0H18v5.14h-1.71zM6 0L1.71 4.29v15.43h5.15V24l4.28-4.29h3.43L22.29 12V0H6zm14.57 11.14l-3.43 3.43h-3.43l-3 3v-3H6.86V1.71h13.71v9.43z"/></svg>',
  'instagram.com': '<svg viewBox="0 0 24 24" fill="#E4405F" style="width:100%;height:100%"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12c0-3.2.01-3.58.07-4.85.15-3.23 1.66-4.77 4.92-4.92C8.42 2.17 8.8 2.16 12 2.16z"/></svg>',
  'reddit.com': '<svg viewBox="0 0 24 24" fill="#FF4500" style="width:100%;height:100%"><path d="M24 11.78c0-1.46-1.19-2.65-2.66-2.65-.71 0-1.36.29-1.84.75-1.81-1.19-4.26-1.95-6.97-2.05l1.48-4.67 4.02.94c0 1.19.97 2.16 2.17 2.16 1.2 0 2.17-.97 2.17-2.16 0-1.2-.97-2.16-2.17-2.16-.92 0-1.7.57-2.02 1.38l-4.33-1.02c-.19-.05-.38.06-.44.25l-1.65 5.21c-2.84.03-5.41.8-7.3 2.02-.47-.44-1.1-.71-1.8-.71C1.19 9.13 0 10.32 0 11.78c0 1.02.59 1.91 1.45 2.36-.03.21-.05.42-.05.63 0 3.57 4.17 6.47 9.31 6.47 5.14 0 9.31-2.9 9.31-6.47 0-.21-.02-.42-.05-.63.86-.45 1.45-1.34 1.45-2.36z"/></svg>',
  'tiktok.com': '<svg viewBox="0 0 24 24" fill="#e8e8f0" style="width:100%;height:100%"><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>',
};
function getFavicon(url) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (FAVICON_MAP[host]) return FAVICON_MAP[host];
    for (const k in FAVICON_MAP) if (host === k || host.endsWith('.' + k)) return FAVICON_MAP[k];
    return null;
  } catch { return null; }
}

/* ═══════════════════════════════════════════════════════
   WIDGET STYLE ENGINE
   ═══════════════════════════════════════════════════════ */
function buildWidgetClasses(st) {
  const cls = [];
  if (st.animation && st.animation !== 'none') cls.push('w-anim-' + st.animation);
  if (st.hover && st.hover !== 'none') cls.push('w-hover-' + st.hover);
  if (st.textEffect === 'gradient') cls.push('w-text-gradient');
  else if (st.textEffect === 'neon') cls.push('w-text-neon');
  else if (st.textEffect === 'glitch') cls.push('w-text-glitch');
  else if (st.textEffect === 'shimmer') cls.push('w-text-shimmer');
  if (st.hideMobile) cls.push('w-hide-mobile');
  if (st.customClass) cls.push(...st.customClass.split(/\s+/).filter(Boolean));
  return cls.join(' ');
}
function buildWidgetStyleString(w) {
  const st = w.style || {};
  const bg = st.bg || {}, b = st.border || {}, sh = st.shadow || {}, ty = st.typography || {};
  const css = [];
  if (bg.type === 'color' && bg.value) css.push(`background:${bg.value}`);
  else if (bg.type === 'gradient' && bg.value) css.push(`background:${bg.value}`);
  else if (bg.type === 'image' && bg.value) css.push(`background:url('${bg.value}') center/cover`);
  else if (bg.type === 'glass') {
    css.push(`background:rgba(255,255,255,0.08)`);
    css.push(`backdrop-filter:blur(${bg.blur || 12}px)`);
    css.push(`-webkit-backdrop-filter:blur(${bg.blur || 12}px)`);
  } else if (bg.type === 'flowing') {
    css.push(`background:linear-gradient(135deg,rgba(255,255,255,0.15),transparent,rgba(255,255,255,0.15))`);
    css.push(`background-size:300% 300%`);
  } else if (bg.type === 'none') css.push(`background:transparent`);
  css.push(`opacity:${bg.opacity ?? 1}`);
  css.push(`border-radius:${b.radius ?? 14}px`);
  if (b.style && b.style !== 'none' && b.width > 0) css.push(`border:${b.width}px ${b.style} ${b.color}`);
  css.push(`padding:${st.padding ?? 0}px`);
  css.push(`z-index:${st.zIndex ?? 1}`);
  if (sh.type === 'soft') css.push(`box-shadow:0 8px 24px rgba(0,0,0,0.35)`);
  else if (sh.type === 'hard') css.push(`box-shadow:4px 4px 0 rgba(0,0,0,0.6)`);
  else if (sh.type === 'glow') css.push(`box-shadow:0 0 ${sh.blur}px ${sh.color}`);
  else if (sh.type === 'custom') css.push(`box-shadow:${sh.x}px ${sh.y}px ${sh.blur}px ${sh.color}`);
  if (ty.family && ty.family !== 'inherit') css.push(`font-family:'${ty.family}',sans-serif`);
  if (ty.size) css.push(`font-size:${ty.size}px`);
  if (ty.weight) css.push(`font-weight:${ty.weight}`);
  if (ty.spacing !== undefined) css.push(`letter-spacing:${ty.spacing}px`);
  if (ty.lineHeight) css.push(`line-height:${ty.lineHeight}`);
  if (ty.align) css.push(`text-align:${ty.align}`);
  if (ty.color && ty.color !== 'inherit') css.push(`color:${ty.color}`);
  return css.join(';');
}
function wrapStyled(widget, inner, ctx) {
  const st = widget.style || {};
  const classes = ['chroma-widget', buildWidgetClasses(st)].filter(Boolean).join(' ');
  const base = `position:absolute;left:${widget.x}%;top:${widget.y}%;width:${widget.w}%;height:${widget.h}%;transform:rotate(${widget.rotation || 0}deg);`;
  const styleStr = buildWidgetStyleString(widget);
  const customCSS = st.customCSS ? `<style>${st.customCSS}</style>` : '';
  const childrenHTML = (widget.children && widget.children.length)
    ? widget.children.map(c => renderWidget(c, ctx)).join('')
    : '';
  return `${customCSS}<div class="${classes}" style="${base}${styleStr}">${inner}${childrenHTML}</div>`;
}

function timeAgoServer(date) {
  if (!date) return 'recently';
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
  if (diff < 2592000) return Math.floor(diff / 604800) + 'w ago';
  if (diff < 31536000) return Math.floor(diff / 2592000) + 'mo ago';
  return Math.floor(diff / 31536000) + 'y ago';
}

/* ═══════════════════════════════════════════════════════
   GLOBAL CSS
   ═══════════════════════════════════════════════════════ */
const GLOBAL_WIDGET_CSS = `<style>
  .chroma-widget { position: absolute; }
  .w-anim-float { animation: wFloat 4s ease-in-out infinite; }
  .w-anim-pulse { animation: wPulse 2.4s ease-in-out infinite; }
  .w-anim-shimmer { animation: wShimmer 4s linear infinite; background-size:300% 300% !important; }
  .w-anim-wobble { animation: wWobble 3s ease-in-out infinite; }
  .w-anim-glitch { animation: wGlitch 2.5s steps(2,end) infinite; }
  @keyframes wFloat { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
  @keyframes wPulse { 0%,100% { opacity:1; } 50% { opacity:0.75; } }
  @keyframes wShimmer { 0% { background-position:0% 50%; } 100% { background-position:300% 50%; } }
  @keyframes wWobble { 0%,100% { transform:rotate(-1deg); } 50% { transform:rotate(1deg); } }
  @keyframes wGlitch { 0%,100% { transform:translate(0); } 20% { transform:translate(-1px,1px); } 40% { transform:translate(1px,-1px); } 60% { transform:translate(-1px,-1px); } 80% { transform:translate(1px,1px); } }
  .w-hover-lift:hover { transform:translateY(-4px); transition:transform 0.25s ease; }
  .w-hover-scale:hover { transform:scale(1.03); transition:transform 0.25s ease; }
  .w-hover-glow:hover { box-shadow:0 0 32px rgba(255,255,255,0.5) !important; transition:box-shadow 0.25s ease; }
  .w-hover-tilt:hover { transform:perspective(800px) rotateX(4deg) rotateY(-4deg); transition:transform 0.3s ease; }
  .w-text-gradient { background:linear-gradient(90deg,#fff,#aaa,#fff); background-size:200% auto; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; animation:wShimmer 4s linear infinite; }
  .w-text-neon { text-shadow:0 0 8px currentColor,0 0 20px currentColor; }
  .w-text-glitch { animation:wGlitch 2.5s steps(2,end) infinite; }
  .w-text-shimmer { background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent); background-size:200% auto; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:wShimmer 3s linear infinite; }
  @media (max-width:640px) { .w-hide-mobile { display:none !important; } }

  /* ═══ Link card — shared design language ═══ */
  .link-card {
    display: flex; align-items: center; gap: 14px;
    width: 100%; height: 100%;
    padding: 12px 16px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 16px;
    text-decoration: none;
    color: #fff;
    font-family: inherit;
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), background 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
    position: relative;
    overflow: hidden;
    box-sizing: border-box;
    cursor: pointer;
  }
  .link-card::before {
    content: '';
    position: absolute; top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    transition: left 0.6s ease;
    pointer-events: none;
  }
  .link-card:hover {
    transform: translateY(-2px);
    background: rgba(255,255,255,0.10);
    border-color: rgba(255,255,255,0.24);
    box-shadow: 0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset;
  }
  .link-card:hover::before { left: 100%; }
  .link-card:active { transform: translateY(0) scale(0.99); }

  .link-card-avatar {
    width: 48px; height: 48px;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04));
    border: 1px solid rgba(255,255,255,0.14);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    position: relative;
  }
  .link-card-avatar img {
    width: 100%; height: 100%; object-fit: cover;
  }
  .link-card-avatar svg { width: 60%; height: 60%; }

  .link-card-body {
    flex: 1; min-width: 0;
    display: flex; flex-direction: column; gap: 2px;
  }
  .link-card-name {
    font-size: 0.92rem; font-weight: 700;
    line-height: 1.2;
    color: #fff;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    letter-spacing: -0.2px;
  }
  .link-card-handle {
    font-size: 0.72rem;
    color: rgba(255,255,255,0.55);
    line-height: 1.2;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    font-weight: 500;
    letter-spacing: 0.1px;
  }
  .link-card-badges {
    display: flex; gap: 4px; flex-shrink: 0; align-items: center;
  }
  .link-card-badges img {
    width: 16px; height: 16px; object-fit: contain;
    border-radius: 4px;
  }
  .link-card-arrow {
    width: 28px; height: 28px;
    border-radius: 9px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.10);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    color: rgba(255,255,255,0.55);
    transition: all 0.22s ease;
  }
  .link-card:hover .link-card-arrow {
    background: rgba(255,255,255,0.16);
    border-color: rgba(255,255,255,0.28);
    color: #fff;
    transform: translateX(2px);
  }
  .link-card-arrow svg { width: 14px; height: 14px; }
  .link-card-verified {
    width: 14px; height: 14px; flex-shrink: 0;
    display: inline-block; vertical-align: middle;
  }
</style>`;

function buildAuroraCSS(a) {
  const accent = a.accent || '#ffffff';
  const glowMap = { low: '16px', medium: '32px', high: '55px', extreme: '80px' };
  const glow = glowMap[a.glow] || '32px';
  const speedMap = { slow: '6s', normal: '3s', fast: '1.5s' };
  const dur = speedMap[a.speed] || '3s';
  const glass = a.glass ? 'backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);' : '';
  const shimmer = a.shimmer ? `
    .chroma-widget::after { content:''; position:absolute; top:0; left:-100%; width:100%; height:100%; background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent); animation:auroraShimmer ${dur} infinite; pointer-events:none; border-radius:inherit; }
    @keyframes auroraShimmer { to { left:100%; } }
  ` : '';
  return `<style>
    .chroma-widget { border:1.5px solid transparent !important; background-clip:padding-box,border-box !important; background-origin:border-box !important;
      background-image: linear-gradient(rgba(0,0,1,0.35),rgba(0,0,1,0.35)), linear-gradient(135deg, ${accent}, #ffffff, ${accent}, #ffffff, ${accent}) !important;
      background-size:100% 100%, 300% 300% !important;
      ${glass} box-shadow:0 0 ${glow} rgba(255,255,255,0.3), 0 8px 24px rgba(0,0,0,0.4) !important;
      animation: auroraBorder ${dur} ease infinite, auroraPulse ${dur} ease infinite !important; }
    ${a.hover ? `.chroma-widget:hover { transform:translateY(-3px) !important; box-shadow:0 0 ${glow} rgba(255,255,255,0.6), 0 12px 32px rgba(0,0,0,0.5) !important; transition: transform 0.25s ease, box-shadow 0.25s ease; }` : ''}
    @keyframes auroraBorder { 0%,100% { background-position:0% 50%,0% 50%; } 50% { background-position:0% 50%,100% 50%; } }
    @keyframes auroraPulse { 0%,100% { box-shadow:0 0 ${glow} rgba(255,255,255,0.25); } 50% { box-shadow:0 0 ${glow} rgba(255,255,255,0.65); } }
    ${shimmer}
  </style>`;
}

/* ═══════════════════════════════════════════════════════
   WIDGET RENDERER
   ═══════════════════════════════════════════════════════ */
function renderWidget(widget, ctx) {
  if (!widget) return '';
  const s = widget.settings || {};
  const inner = renderWidgetInner(widget, s, ctx);
  return wrapStyled(widget, inner, ctx);
}

function renderWidgetInner(widget, s, ctx) {
  const rc = (key) => interpolate(s[key] ?? '', ctx);

  switch (widget.type) {

    /* ═══ TEXT ═══ */
    case 'text':
      return `<div style="overflow:hidden;width:100%;height:100%;display:flex;align-items:center;justify-content:center;padding:4px;box-sizing:border-box;">${esc(rc('content'))}</div>`;
    case 'gradient-text':
      return `<div style="background:${esc(s.gradient || 'linear-gradient(90deg,#fff,#aaa)')};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;overflow:hidden;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${esc(rc('content'))}</div>`;
    case 'neon-text':
      return `<div style="color:${esc(s.color || '#fff')};text-shadow:0 0 10px currentColor,0 0 20px currentColor;overflow:hidden;width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${esc(rc('content'))}</div>`;
    case 'marquee-text':
      return `<div style="overflow:hidden;width:100%;height:100%;display:flex;align-items:center;"><marquee scrollamount="${s.speed || 5}" style="color:inherit;">${esc(rc('content'))}</marquee></div>`;
    case 'typewriter':
      return `<div id="tw-${widget.id}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"></div>
        <script>(function(){const el=document.getElementById('tw-${widget.id}');if(!el)return;const t=${JSON.stringify(rc('text') || '')};let i=0;(function go(){if(i<t.length){el.textContent+=t.charAt(i++);setTimeout(go,${s.speed || 80});}})();})();<\/script>`;
    case 'glitch-text':
      return `<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><span class="w-text-glitch" style="color:${esc(s.color || '#fff')};">${esc(rc('content'))}</span></div>`;

    /* ═══ MEDIA ═══ */
    case 'image':
      return `<img src="${esc(s.src)}" alt="${esc(s.alt || '')}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;" onerror="this.style.opacity='0.2'">`;
    case 'video':
      return `<video src="${esc(s.src)}" ${s.controls ? 'controls' : 'autoplay muted loop playsinline'} style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"></video>`;
    case 'audio':
      return `<div style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;gap:6px;padding:8px;overflow:hidden;"><strong style="font-size:.8rem;color:inherit;">${esc(rc('title') || 'Track')}</strong><audio controls src="${esc(s.src)}" style="width:100%;"></audio></div>`;
    case 'audio-player': {
      const imgSrc = s.albumArt || s.fallbackImage || 'AudioImage.png';
      const wid = widget.id;
      return `<div style="display:flex;align-items:center;gap:14px;width:100%;height:100%;padding:12px 16px;background:rgba(18,18,24,0.6);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);border:1px solid rgba(255,255,255,0.1);border-radius:16px;box-sizing:border-box;">
        <div style="width:60px;height:60px;border-radius:14px;background:linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.03));border:1px solid rgba(255,255,255,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;box-shadow:0 8px 20px rgba(0,0,0,0.3);"><img src="${esc(imgSrc)}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.style.display='none'"></div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:.92rem;font-weight:700;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;letter-spacing:-0.2px;">${esc(rc('trackName') || 'Track')}</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:8px;font-size:.65rem;color:rgba(255,255,255,0.55);font-variant-numeric:tabular-nums;font-weight:600;">
            <span class="ap-cur-${wid}">0:00</span>
            <div class="ap-bar-${wid}" style="flex:1;height:4px;background:rgba(255,255,255,0.12);border-radius:3px;overflow:hidden;cursor:pointer;position:relative;"><div class="ap-fill-${wid}" style="height:100%;width:0;background:linear-gradient(90deg,#fff,#b0b0b0);border-radius:3px;transition:width 0.1s linear;"></div></div>
            <span class="ap-dur-${wid}">0:00</span>
          </div>
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;align-items:center;">
          <button class="ap-play-${wid}" style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);border-radius:50%;color:#fff;cursor:pointer;width:40px;height:40px;display:flex;align-items:center;justify-content:center;transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.16)'" onmouseout="this.style.background='rgba(255,255,255,0.08)'"><svg class="ap-icon-${wid}" viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px;"><path d="M6 4l15 8-15 8z"/></svg></button>
        </div>
        <audio class="ap-audio-${wid}" src="${esc(s.src)}" preload="metadata"></audio>
        <script>(function(){const a=document.querySelector('.ap-audio-${wid}'),btn=document.querySelector('.ap-play-${wid}'),icon=document.querySelector('.ap-icon-${wid}'),fill=document.querySelector('.ap-fill-${wid}'),bar=document.querySelector('.ap-bar-${wid}'),cur=document.querySelector('.ap-cur-${wid}'),dur=document.querySelector('.ap-dur-${wid}');if(!a)return;const fmt=t=>{const m=Math.floor(t/60),s=Math.floor(t%60);return m+':'+(s<10?'0':'')+s;};btn.onclick=()=>a.paused?a.play():a.pause();a.onplay=()=>icon.innerHTML='<path d="M6 4h4v16H6zM14 4h4v16h-4z"/>';a.onpause=()=>icon.innerHTML='<path d="M6 4l15 8-15 8z"/>';a.onloadedmetadata=()=>dur.textContent=fmt(a.duration);a.ontimeupdate=()=>{fill.style.width=(a.currentTime/a.duration*100)+'%';cur.textContent=fmt(a.currentTime);};bar.onclick=e=>{const r=bar.getBoundingClientRect();a.currentTime=((e.clientX-r.left)/r.width)*a.duration;};})();<\/script>
      </div>`;
    }
    case 'audio-viz':
      return `<canvas class="audio-viz-canvas" data-src="${esc(s.src)}" data-color="${esc(s.color || '#fff')}" style="width:100%;height:100%;background:rgba(255,255,255,0.04);border-radius:inherit;cursor:pointer;"></canvas>`;

    /* ═══ PROFILE ═══ */
    case 'profile-circle': {
      const avatar = rc('src') || ctx.user.avatar || '';
      const dot = s.showPresence !== false ? `<span style="position:absolute;bottom:6%;right:6%;width:16%;height:16%;border-radius:50%;background:#4ade80;border:2px solid #000;box-shadow:0 0 10px #4ade80;"></span>` : '';
      return `<div style="width:100%;height:100%;position:relative;display:flex;align-items:center;justify-content:center;"><img src="${esc(avatar)}" style="width:100%;height:100%;border-radius:50%;border:3px solid ${esc(s.borderColor || '#fff')};object-fit:cover;box-shadow:0 0 24px rgba(255,255,255,0.35);">${dot}</div>`;
    }
    case 'profile-card': {
      const preset = s.preset || 'minimal';
      const slots = toArr(s.slots || 'avatar,name,badges,tagline,location,socials,views');
      const u = ctx.user, p = ctx.profile;
      const avatar = p.avatar || u.avatar || '';
      const displayName = p.displayName || u.username;
      const tagline = p.tagline || '';
      const location = p.location || '';
      const socials = (p.socials || []).filter(x => x.url);
      const parts = [];
      if (slots.includes('avatar')) parts.push(`<div style="position:relative;width:${preset === 'discord-focused' ? '96px' : '88px'};height:${preset === 'discord-focused' ? '96px' : '88px'};margin:0 auto 16px;"><img src="${esc(avatar)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.35);box-shadow:0 0 32px rgba(255,255,255,0.2);"></div>`);
      if (slots.includes('name')) {
        const eff = s.nameEffect || 'none';
        const nameClass = eff === 'glitch' ? 'w-text-glitch' : eff === 'neon' ? 'w-text-neon' : eff === 'gradient' ? 'w-text-gradient' : '';
        parts.push(`<div class="${nameClass}" style="font-size:1.7rem;font-weight:800;letter-spacing:-0.5px;text-align:center;margin-bottom:10px;color:#fff;">${esc(displayName)}</div>`);
      }
      if (slots.includes('badges') && ctx.badges && ctx.badges.length) parts.push(`<div style="display:flex;gap:6px;justify-content:center;margin-bottom:12px;flex-wrap:wrap;">${renderBadges(ctx.badges)}</div>`);
      if (slots.includes('tagline') && tagline) parts.push(`<div style="font-size:.95rem;color:rgba(255,255,255,0.72);text-align:center;line-height:1.55;margin-bottom:14px;max-width:92%;margin-left:auto;margin-right:auto;">${esc(tagline)}</div>`);
      if (slots.includes('location') && location) parts.push(`<div style="display:flex;align-items:center;justify-content:center;gap:6px;font-size:.82rem;color:rgba(255,255,255,0.55);margin-bottom:16px;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>${esc(location)}</div>`);
      if (slots.includes('socials') && socials.length) {
        parts.push(`<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-bottom:16px;">${socials.map(so => `<a href="${esc(so.url)}" target="_blank" rel="noopener" style="width:40px;height:40px;border-radius:12px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;text-decoration:none;overflow:hidden;transition:all 0.2s ease;" onmouseover="this.style.background='rgba(255,255,255,0.14)';this.style.transform='translateY(-2px)'" onmouseout="this.style.background='rgba(255,255,255,0.06)';this.style.transform=''">${so.iconUrl ? `<img src="${esc(so.iconUrl)}" style="width:70%;height:70%;object-fit:contain;">` : (getFavicon(so.url) || `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" style="width:18px;height:18px;"><circle cx="12" cy="12" r="10"/></svg>`)}</a>`).join('')}</div>`);
      }
      if (slots.includes('joined')) parts.push(`<div style="font-size:.72rem;color:rgba(255,255,255,0.4);text-align:center;margin-bottom:8px;">joined ${timeAgoServer(ctx.user.createdAt)}</div>`);
      if (slots.includes('views')) parts.push(`<div style="position:absolute;left:18px;bottom:14px;display:flex;align-items:center;gap:6px;font-size:.72rem;color:rgba(255,255,255,0.5);font-weight:600;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>${(ctx.user.views || 0).toLocaleString()}</div>`);
      const frameStyle = s.frameEnabled !== false
        ? `background:rgba(18,18,24,0.55);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);border:1.5px solid ${esc(s.frameColor || 'rgba(255,255,255,0.16)')};border-radius:26px;padding:36px 26px 52px;box-shadow:0 24px 64px rgba(0,0,0,0.5),0 0 0 1px rgba(255,255,255,0.03) inset;`
        : '';
      return `<div style="${frameStyle}position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;box-sizing:border-box;">${parts.join('')}</div>`;
    }
    case 'badges':
    case 'badges-row': {
      const list = toArr(s.badges);
      const ids = s.autoFromAccount ? (ctx.badges || []) : list;
      return `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:center;width:100%;height:100%;">${renderBadges(ids)}</div>`;
    }

    /* ═══ LINKS — NEW MINI PROFILE CARD STYLE ═══ */
    case 'link-list': {
      const rows = widget.children || [];
      if (!rows.length) return `<div style="padding:14px;text-align:center;color:rgba(255,255,255,0.4);font-size:.78rem;">Empty link list</div>`;
      return `<div style="display:flex;flex-direction:column;gap:10px;width:100%;height:100%;">${rows.map(r => renderWidget(r, ctx)).join('')}</div>`;
    }

    case 'link-row':
    case 'link-embed':
    case 'social-link': {
      const url = rc('url') || '#';
      const label = rc('label') || rc('title') || domainOf(url) || 'Link';
      const iconUrl = s.iconUrl || '';
      const domain = domainOf(url);

      // Pick icon: custom upload > auto favicon > generic globe
      let iconHTML = '';
      if (iconUrl) {
        iconHTML = `<img src="${esc(iconUrl)}" alt="">`;
      } else {
        const fav = getFavicon(url);
        if (fav) iconHTML = fav;
        else iconHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" style="opacity:0.7;"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z"/></svg>`;
      }

      const badges = ctx.badges && ctx.badges.length
        ? `<div class="link-card-badges">${renderBadges(ctx.badges, 16)}</div>`
        : '';

      return `<a class="link-card" href="${esc(url)}" target="_blank" rel="noopener">
        <div class="link-card-avatar">${iconHTML}</div>
        <div class="link-card-body">
          <div class="link-card-name">${esc(label)}</div>
          ${domain ? `<div class="link-card-handle">${esc(domain)}</div>` : ''}
        </div>
        ${badges}
        <div class="link-card-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>
        </div>
      </a>`;
    }

    /* ═══ EMBEDS ═══ */
    case 'youtube':
      return `<iframe src="https://www.youtube.com/embed/${esc(s.videoId)}" style="width:100%;height:100%;border:0;border-radius:inherit;" allowfullscreen></iframe>`;
    case 'spotify':
      return `<iframe src="https://open.spotify.com/embed/track/${esc(s.uri)}" style="width:100%;height:100%;border:0;border-radius:inherit;" allowfullscreen></iframe>`;
    case 'twitch':
      return `<iframe src="https://player.twitch.tv/?channel=${esc(s.channel)}&parent=${esc(ctx.host)}" style="width:100%;height:100%;border:0;border-radius:inherit;" allowfullscreen></iframe>`;
    case 'soundcloud':
      return `<iframe src="https://w.soundcloud.com/player/?url=${encodeURIComponent(s.trackUrl || '')}" style="width:100%;height:100%;border:0;border-radius:inherit;"></iframe>`;

    /* ═══ UTILITY ═══ */
    case 'clock':
      return `<div id="clk-${widget.id}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-variant-numeric:tabular-nums;"></div>
        <script>(function(){const el=document.getElementById('clk-${widget.id}');if(!el)return;function tick(){el.textContent=new Date().toLocaleTimeString('en-US',{hour12:${s.format !== '24h'},second:${s.showSeconds !== false}});}tick();setInterval(tick,1000);})();<\/script>`;
    case 'countdown':
      return `<div id="cd-${widget.id}" data-target="${s.targetDate ? new Date(s.targetDate).getTime() : 0}" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-weight:700;">loading...</div>
        <script>(function(){const el=document.getElementById('cd-${widget.id}');if(!el)return;const t=+el.dataset.target;function tick(){const d=t-Date.now();if(d<=0){el.textContent='passed';return;}const D=Math.floor(d/86400000),H=Math.floor((d%86400000)/3600000),M=Math.floor((d%3600000)/60000),S=Math.floor((d%60000)/1000);el.textContent=D+'d '+H+'h '+M+'m '+S+'s';}tick();setInterval(tick,1000);})();<\/script>`;
    case 'days-counter': {
      const start = new Date(s.startDate);
      const days = s.startDate && !isNaN(start.getTime()) ? Math.floor((Date.now() - start.getTime()) / 86400000) : 0;
      return `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;gap:4px;"><span style="font-size:.7rem;opacity:0.6;">${esc(s.label || 'Since')}</span><span style="font-size:1.6rem;font-weight:800;">${days}d</span></div>`;
    }
    case 'visitor-counter':
      return `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-weight:700;">${(ctx.user.views || 0).toLocaleString()} views</div>`;
    case 'progress-bar': {
      const pct = Math.min(100, Math.round(((s.value || 0) / (s.max || 100)) * 100));
      return `<div style="display:flex;align-items:center;width:100%;height:100%;padding:8px;box-sizing:border-box;"><div style="width:100%;height:14px;background:rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${esc(s.color || '#fff')};border-radius:8px;"></div></div></div>`;
    }
      case 'code': {
  const html = s.html || '';
  const css  = s.css  || '';
  const js   = s.js   || '';

  if (!html && !css && !js) {
    return `<div style="width:100%;height:100%;"></div>`;
  }

  // Escape any </script> inside the JS so it doesn't break out of the tag
  const safeJs = String(js).replace(/<\/script>/gi, '<\\/script>');

  return `<div class="chroma-code-widget" style="width:100%;height:100%;position:relative;">
    ${css ? `<style>${css}</style>` : ''}
    ${html}
    ${safeJs ? `<script>${safeJs}<\/script>` : ''}
  </div>`;
}
    case 'qr-code':
      return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${s.size || 200}x${s.size || 200}&data=${encodeURIComponent(rc('url'))}" style="width:100%;height:100%;object-fit:contain;">`;

    /* ═══ SOCIAL ═══ */
    case 'lanyard':
      return `<div id="ln-${widget.id}" data-user="${esc(s.userId || '')}" style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:100%;font-size:.8rem;font-weight:600;"></div>
        <script>(async function(){const el=document.getElementById('ln-${widget.id}');if(!el)return;const uid=el.dataset.user;if(!uid){el.textContent='Set userId';return;}try{const r=await fetch('https://api.lanyard.rest/v1/users/'+uid);const d=await r.json();if(!d.success)throw 0;const u=d.data;const color=u.discord_status==='online'?'#4ade80':u.discord_status==='idle'?'#fbbf24':u.discord_status==='dnd'?'#ff5566':'#666';el.innerHTML='<span style="width:10px;height:10px;border-radius:50%;background:'+color+';display:inline-block;"></span><span>'+u.discord_status+'</span>';}catch(e){el.textContent='N/A';}})();<\/script>`;
    case 'github-stats':
      return `<div id="gh-${widget.id}" data-user="${esc(s.username)}" style="display:flex;align-items:center;justify-content:center;gap:14px;width:100%;height:100%;font-size:.8rem;font-weight:600;"></div>
        <script>(async function(){const el=document.getElementById('gh-${widget.id}');if(!el)return;const uid=el.dataset.user;if(!uid){el.textContent='Set username';return;}try{const r=await fetch('https://api.github.com/users/'+uid);if(!r.ok)throw 0;const d=await r.json();el.innerHTML='<div><div style="font-size:1rem;">'+(d.followers||0)+'</div><div style="font-size:.62rem;opacity:0.6;">Followers</div></div><div><div style="font-size:1rem;">'+(d.public_repos||0)+'</div><div style="font-size:.62rem;opacity:0.6;">Repos</div></div>';}catch(e){el.textContent='N/A';}})();<\/script>`;
    case 'tech-stack': {
      const list = toArr(s.items);
      const cols = s.columns || 3;
      return `<div style="display:grid;grid-template-columns:repeat(${cols},1fr);gap:8px;place-items:center;width:100%;height:100%;">${(list.length ? list : ['React','Node','TS']).map(i => `<span style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);padding:5px 11px;border-radius:10px;font-size:.72rem;font-weight:600;">${esc(i)}</span>`).join('')}</div>`;
    }

    /* ═══ INTERACTIVE ═══ */
    case 'guestbook': {
      const wid = 'gb-' + widget.id;
      return `<div id="${wid}" style="display:flex;flex-direction:column;width:100%;height:100%;padding:14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;overflow:hidden;box-sizing:border-box;backdrop-filter:blur(16px);">
        <h4 style="margin:0 0 10px;font-size:.88rem;font-weight:700;letter-spacing:-0.2px;">${esc(rc('title') || 'Leave a message')}</h4>
        <div id="${wid}-msgs" style="flex:1;overflow-y:auto;margin-bottom:8px;font-size:.74rem;display:flex;flex-direction:column;gap:8px;"></div>
        <input id="${wid}-name" placeholder="Name" style="width:100%;padding:7px 10px;margin-bottom:5px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#fff;font-size:.72rem;outline:none;box-sizing:border-box;font-family:inherit;">
        <textarea id="${wid}-text" placeholder="Message" rows="2" style="width:100%;padding:7px 10px;margin-bottom:5px;border-radius:8px;border:1px solid rgba(255,255,255,0.15);background:rgba(0,0,0,0.3);color:#fff;font-size:.72rem;outline:none;resize:none;font-family:inherit;box-sizing:border-box;"></textarea>
        <button id="${wid}-send" style="background:linear-gradient(135deg,#fff,#b0b0b0);color:#000;border:none;padding:7px;border-radius:8px;font-weight:700;font-size:.72rem;cursor:pointer;font-family:inherit;transition:transform 0.2s ease;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">Send</button>
        <script>(function(){const u='${esc(ctx.user.username)}';const msgs=document.getElementById('${wid}-msgs');const ni=document.getElementById('${wid}-name');const ti=document.getElementById('${wid}-text');const sb=document.getElementById('${wid}-send');const e2=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');async function load(){try{const r=await fetch('/api/guestbook?username='+u);const a=await r.json();msgs.innerHTML=(a||[]).map(m=>'<div><b style="color:#fff;">'+e2(m.author||'Anon')+'</b>: <span style="opacity:0.75;">'+e2(m.text)+'</span></div>').join('');}catch(e){}}sb.onclick=async()=>{const t=ti.value.trim();if(!t)return;try{await fetch('/api/guestbook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,text:t,author:ni.value.trim()||'Anonymous'})});ti.value='';load();}catch(e){}};load();})();<\/script>
      </div>`;
    }

    /* ═══ DECORATION ═══ */
    case 'divider':
    case 'section-divider':
      return `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;position:relative;"><hr style="border:none;border-top:${s.thickness || 2}px ${esc(s.style || 'solid')} ${esc(s.color || '#fff')};width:100%;margin:0;"></div>`;
    case 'shape': {
      const r = s.shape === 'circle' ? 'border-radius:50%;' : s.shape === 'square' ? '' : 'border-radius:14px;';
      return `<div style="width:100%;height:100%;background:${esc(s.color || '#fff')};${r}"></div>`;
    }

    default:
      return `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:.72rem;opacity:0.5;border:1px dashed currentColor;border-radius:8px;">${esc(widget.type)}</div>`;
  }
}

/* ═══════════════════════════════════════════════════════
   MAIN HANDLER
   ═══════════════════════════════════════════════════════ */
export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments.length !== 1) {
    res.statusCode = 404;
    return res.end();
  }

  const slug = decodeURIComponent(segments[0]).toLowerCase();

  try {
    let userRow = null;
    try {
      const r = await pool.query(
        `SELECT id, username, alias, created_at, banned_until, banned_permanent,
                ban_reason, ban_keep_profile, terminated, profile_data
         FROM users
         WHERE LOWER(username) = $1 OR LOWER(alias) = $1
         LIMIT 1`,
        [slug]
      );
      userRow = r.rows[0];
    } catch (e) {
      console.warn('[profile.js] full user query failed:', e.message);
      try {
        const r = await pool.query(
          `SELECT id, username, created_at FROM users WHERE LOWER(username) = $1 LIMIT 1`,
          [slug]
        );
        userRow = r.rows[0];
      } catch (e2) { console.error('[profile.js] fallback failed:', e2.message); }
    }

    if (!userRow) { res.statusCode = 404; return res.end(); }
    if (userRow.terminated) { res.statusCode = 404; return res.end(); }

    let profileData = {};
    if (userRow.profile_data) {
      profileData = typeof userRow.profile_data === 'string'
        ? JSON.parse(userRow.profile_data)
        : userRow.profile_data;
    }

    const hidden = profileData.hidden || {};
    const isRealUsername = slug === userRow.username.toLowerCase();
    const isAlias = userRow.alias && slug === userRow.alias.toLowerCase();
    if (hidden.enabled && isRealUsername && hidden['404RealUsername'] && !isAlias) {
      res.statusCode = 404; return res.end();
    }

    const isBanned = userRow.banned_permanent
      || (userRow.banned_until && new Date(userRow.banned_until).getTime() > Date.now());
    if (isBanned && userRow.ban_keep_profile === false) { res.statusCode = 404; return res.end(); }

    let layoutData = { layout: [], settings: {} };
    try {
      const layoutRow = (await pool.query(
        `SELECT layout_data FROM profiles WHERE user_id = $1`,
        [userRow.id]
      )).rows[0];
      if (layoutRow?.layout_data) {
        layoutData = typeof layoutRow.layout_data === 'string'
          ? JSON.parse(layoutRow.layout_data)
          : layoutRow.layout_data;
      }
    } catch (e) { console.warn('[profile.js] layout fetch failed:', e.message); }

    const widgets = Array.isArray(layoutData.layout) ? layoutData.layout : [];
    const settings = layoutData.settings || {};
    settings.background = settings.background || {};
    settings.aurora = settings.aurora || { enabled: false };

    let badges = [];
    try {
      const br = await pool.query(`SELECT badge_id FROM user_badges WHERE user_id = $1`, [userRow.id]);
      badges = br.rows.map(r => r.badge_id);
    } catch (e) {}
    if (isBanned && !badges.includes('banned')) badges.push('banned');

    pool.query(`UPDATE profiles SET view_count = COALESCE(view_count, 0) + 1 WHERE user_id = $1`, [userRow.id]).catch(() => {});

    const avatar = profileData.avatar
      || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(userRow.username)}&backgroundColor=1a1a1a&textColor=ffffff`;

    const ctx = {
      host: req.headers.host || 'localhost',
      user: {
        username: userRow.username,
        displayName: profileData.displayName || userRow.username,
        avatar,
        views: 0,
        createdAt: userRow.created_at,
      },
      profile: {
        displayName: profileData.displayName || userRow.username,
        tagline: profileData.tagline || '',
        bio: profileData.bio || '',
        location: profileData.location || '',
        pronouns: profileData.pronouns || '',
        avatar,
        socials: profileData.socials || [],
      },
      discord: profileData.discord || {},
      stats: { views: 0, guestbook: 0, widgets: widgets.length },
      badges,
    };

    const widgetsHTML = widgets.map(w => renderWidget(w, ctx)).join('\n');

    let globalStyles = '';
    if (settings.cursor) globalStyles += `<style>body{cursor:url('${settings.cursor}'),auto;}</style>`;
    if (settings.favicon) globalStyles += `<link rel="icon" href="${settings.favicon}">`;
    else globalStyles += `<link rel="icon" type="image/png" href="Chromaticc.png">`;

    let bodyStyle = 'background:#000001;';
    if (settings.background && settings.background.value) {
      const bg = settings.background;
      const raw = String(bg.value).trim();
      let rule = '';
      if (/^(https?:\/\/|blob:|data:)/i.test(raw)) rule = `url('${raw}') center/cover fixed`;
      else if (bg.type === 'image' || bg.type === 'video') rule = `url('${raw}') center/cover fixed`;
      else rule = raw;
      bodyStyle = `background:${rule} !important;`;
    }

    const auroraCSS = settings.aurora.enabled ? buildAuroraCSS(settings.aurora) : '';

    let banBanner = '';
    if (isBanned) {
      const until = userRow.banned_permanent ? 'permanently' : 'until ' + new Date(userRow.banned_until).toLocaleString();
      banBanner = `<div style="position:fixed;top:0;left:0;right:0;z-index:9999;background:linear-gradient(90deg,rgba(176,0,32,0.9),rgba(255,68,68,0.9));color:#fff;padding:10px 20px;text-align:center;font-family:Inter,sans-serif;font-size:0.82rem;font-weight:600;">This account is banned ${until}.</div>`;
    }

    /* ═══════════════════════════════════════════════
       CLICK-TO-ENTER — iOS playback session fix
       ═══════════════════════════════════════════════ */
    let clickEnterHTML = '';
    const hasClickEnterWidget = widgets.some(w => w.type === 'click-enter');
    if (settings.clickToEnter && !hasClickEnterWidget) {
      const audioUrl = settings.clickAudioUrl || settings.audioUrl || '';
      const shouldPlayAudio = audioUrl && (settings.autoplay !== false);

      clickEnterHTML = `
        ${shouldPlayAudio ? `<audio id="clickEnterAudio" src="${esc(audioUrl)}" preload="auto" loop playsinline webkit-playsinline crossorigin="anonymous" style="position:fixed;top:0;left:0;width:1px;height:1px;opacity:0.001;pointer-events:none;"></audio>` : ''}
        <div id="globalClickEnter" style="position:fixed;inset:0;background:rgba(0,0,1,0.94);display:flex;align-items:center;justify-content:center;z-index:9998;cursor:pointer;flex-direction:column;gap:16px;font-family:Inter,sans-serif;-webkit-tap-highlight-color:transparent;-webkit-user-select:none;user-select:none;">
          <div style="font-size:1.4rem;font-weight:800;color:#fff;text-align:center;padding:0 20px;letter-spacing:-0.3px;">${esc(settings.clickEnterMessage || 'Click anywhere to enter')}</div>
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.5);letter-spacing:0.3px;">Tap to continue</div>
        </div>
        <script>
          (function(){
            var overlay = document.getElementById('globalClickEnter');
            var audio = document.getElementById('clickEnterAudio');
            var dismissed = false;

            // Force iOS into playback session — ignores the silent switch on iOS 16.4+
            if (audio && 'audioSession' in navigator) {
              try { navigator.audioSession.type = 'playback'; } catch(e) {}
            }

            function dismiss() {
              if (dismissed) return;
              dismissed = true;

              if (audio) {
                audio.volume = 1;
                audio.muted = false;
                try {
                  var p = audio.play();
                  if (p && p.then) {
                    p.catch(function(){
                      setTimeout(function(){ audio.play().catch(function(){}); }, 100);
                    });
                  }
                } catch(e){}
              }

              overlay.style.transition = 'opacity 0.3s';
              overlay.style.opacity = '0';
              overlay.style.pointerEvents = 'none';
              setTimeout(function(){ overlay.style.display = 'none'; }, 300);
            }

            overlay.addEventListener('touchend', dismiss, { once: true });
            overlay.addEventListener('click', dismiss, { once: true });
            overlay.addEventListener('pointerup', dismiss, { once: true });
          })();
        <\/script>`;
    }

    let promoHTML = '';
    if (settings.promo?.enabled !== false) {
      promoHTML = `<div id="chromaPromo" style="position:fixed;bottom:16px;right:16px;z-index:9997;background:rgba(10,10,16,0.92);border:1px solid rgba(255,255,255,0.14);border-radius:16px;padding:12px 16px;font-family:Inter,sans-serif;font-size:0.75rem;color:#fff;max-width:280px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;gap:10px;box-shadow:0 12px 40px rgba(0,0,0,0.5);">
        <div style="flex:1;line-height:1.4;">Made with <b>Chromaticc</b>! Join users today and make your own link in bio page!</div>
        <button onclick="this.parentElement.remove();try{localStorage.setItem('chromaPromoDismissed_${esc(userRow.username)}','1')}catch(e){}" style="background:none;border:none;color:rgba(255,255,255,0.5);cursor:pointer;font-size:1.1rem;padding:0 4px;flex-shrink:0;">×</button>
      </div>
      <script>try{if(localStorage.getItem('chromaPromoDismissed_${esc(userRow.username)}')){document.getElementById('chromaPromo').remove();}}catch(e){}<\/script>`;
    }

    const seo = profileData.seo || {};
    const pageTitle = seo.title || (profileData.displayName
      ? `${profileData.displayName} — Chromaticc`
      : `${userRow.username} — Chromaticc`);
    const pageDesc = seo.description || profileData.tagline || `Check out ${userRow.username}'s profile on Chromaticc`;
    const ogImage = seo.ogImage || profileData.avatar || '';
    const themeColor = seo.themeColor || '#000001';
    const isIndexable = seo.indexable !== false;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>${esc(pageTitle)}</title>
<meta name="description" content="${esc(pageDesc)}">
<meta name="theme-color" content="${esc(themeColor)}">
${isIndexable ? '' : '<meta name="robots" content="noindex,nofollow">'}
<meta property="og:title" content="${esc(seo.ogTitle || pageTitle)}">
<meta property="og:description" content="${esc(seo.ogDesc || pageDesc)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta property="og:type" content="profile">
<meta name="twitter:card" content="${esc(seo.twitterCard || 'summary_large_image')}">
<meta name="twitter:title" content="${esc(seo.ogTitle || pageTitle)}">
<meta name="twitter:description" content="${esc(seo.ogDesc || pageDesc)}">
${ogImage ? `<meta name="twitter:image" content="${esc(ogImage)}">` : ''}
${globalStyles}
${GLOBAL_WIDGET_CSS}
${auroraCSS}
<style>
  *{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
  html,body{overflow:hidden;height:100%;font-family:'Inter',system-ui,sans-serif;color:#fff;}
  .profile-canvas{position:relative;width:100vw;height:100vh;overflow:hidden;}
  a{color:inherit;-webkit-tap-highlight-color:transparent;}
  img{max-width:100%;height:auto;}
  @media(max-width:768px){ .profile-canvas{font-size:90%;} }
</style>
</head>
<body style="${bodyStyle}">
  ${banBanner}
  ${clickEnterHTML}
  <div class="profile-canvas">${widgetsHTML}</div>
  ${promoHTML}
  <script>
  (function(){
    document.querySelectorAll('.audio-viz-canvas').forEach(function(canvas){
      const ctx = canvas.getContext('2d');
      const audio = new Audio(canvas.dataset.src || '');
      audio.crossOrigin = 'anonymous';
      const color = canvas.dataset.color || '#fff';
      let started = false, audioCtx, analyser, source;
      function start(){
        if(started) return; started = true;
        if(!audioCtx){
          audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          analyser = audioCtx.createAnalyser();
          try { source = audioCtx.createMediaElementSource(audio); source.connect(analyser); analyser.connect(audioCtx.destination); } catch(e){}
        }
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        const buf = analyser.frequencyBinCount;
        const data = new Uint8Array(buf);
        function draw(){
          requestAnimationFrame(draw);
          analyser.getByteFrequencyData(data);
          ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.fillStyle = color;
          const bw = (canvas.width / buf) * 2.5;
          let x = 0;
          for(let i=0;i<buf;i++){ const h=(data[i]/255)*canvas.height; ctx.fillRect(x,canvas.height-h,bw,h); x+=bw+1; }
        }
        audio.play().catch(()=>{});
        draw();
      }
      canvas.addEventListener('click', start);
    });
  })();
  <\/script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=30');
    return res.status(200).send(html);

  } catch (err) {
    console.error('[profile.js] unhandled error:', err);
    res.statusCode = 404;
    return res.end();
  }
}
