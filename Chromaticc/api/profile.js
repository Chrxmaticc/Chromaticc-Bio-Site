import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

// ─── Helpers ──────────────────────────────────────────
function esc(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toArr(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

// Favicon resolver — maps URLs to inline SVGs
const FAVICON_MAP = {
  'discord.com': '<svg viewBox="0 0 24 24" fill="#5865F2" style="width:100%;height:100%;"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>',
  'discord.gg': '<svg viewBox="0 0 24 24" fill="#5865F2" style="width:100%;height:100%;"><path d="M20.317 4.37a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.3 12.3 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.84 19.84 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/></svg>',
  'github.com': '<svg viewBox="0 0 24 24" fill="#e8e8f0" style="width:100%;height:100%;"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>',
  'youtube.com': '<svg viewBox="0 0 24 24" fill="#ff0000" style="width:100%;height:100%;"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 00.5 6.2 31.4 31.4 0 000 12a31.4 31.4 0 00.5 5.8 3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1A31.4 31.4 0 0024 12a31.4 31.4 0 00-.5-5.8zM9.6 15.6V8.4l6.3 3.6z"/></svg>',
  'twitter.com': '<svg viewBox="0 0 24 24" fill="#1DA1F2" style="width:100%;height:100%;"><path d="M23.95 4.57a10 10 0 01-2.82.77 4.96 4.96 0 002.16-2.72c-.95.56-2 .96-3.13 1.18a4.92 4.92 0 00-8.38 4.48A13.94 13.94 0 011.64 3.16a4.92 4.92 0 001.52 6.57 4.9 4.9 0 01-2.23-.61v.06a4.92 4.92 0 003.95 4.83 4.93 4.93 0 01-2.21.08 4.93 4.93 0 004.6 3.42A9.87 9.87 0 010 19.54a13.94 13.94 0 007.55 2.21c9.06 0 14.01-7.5 14.01-14.01 0-.21 0-.42-.02-.63A10 10 0 0024 4.59z"/></svg>',
  'x.com': '<svg viewBox="0 0 24 24" fill="#e8e8f0" style="width:100%;height:100%;"><path d="M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.6l5.24 6.93zm-1.29 19.5h2.04L6.49 3.24H4.3z"/></svg>',
  'spotify.com': '<svg viewBox="0 0 24 24" fill="#1DB954" style="width:100%;height:100%;"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14C9.6 9.9 15 10.56 18.72 12.84c.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.3z"/></svg>',
  'twitch.tv': '<svg viewBox="0 0 24 24" fill="#9146FF" style="width:100%;height:100%;"><path d="M11.57 4.71h1.72v5.14h-1.72zm4.72 0H18v5.14h-1.71zM6 0L1.71 4.29v15.43h5.15V24l4.28-4.29h3.43L22.29 12V0H6zm14.57 11.14l-3.43 3.43h-3.43l-3 3v-3H6.86V1.71h13.71v9.43z"/></svg>',
  'instagram.com': '<svg viewBox="0 0 24 24" fill="#E4405F" style="width:100%;height:100%;"><path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92C2.17 15.58 2.16 15.2 2.16 12c0-3.2.01-3.58.07-4.85.15-3.23 1.66-4.77 4.92-4.92C8.42 2.17 8.8 2.16 12 2.16z"/></svg>',
  'reddit.com': '<svg viewBox="0 0 24 24" fill="#FF4500" style="width:100%;height:100%;"><path d="M24 11.78c0-1.46-1.19-2.65-2.66-2.65-.71 0-1.36.29-1.84.75-1.81-1.19-4.26-1.95-6.97-2.05l1.48-4.67 4.02.94c0 1.19.97 2.16 2.17 2.16 1.2 0 2.17-.97 2.17-2.16 0-1.2-.97-2.16-2.17-2.16-.92 0-1.7.57-2.02 1.38l-4.33-1.02c-.19-.05-.38.06-.44.25l-1.65 5.21c-2.84.03-5.41.8-7.3 2.02-.47-.44-1.1-.71-1.8-.71C1.19 9.13 0 10.32 0 11.78c0 1.02.59 1.91 1.45 2.36-.03.21-.05.42-.05.63 0 3.57 4.17 6.47 9.31 6.47 5.14 0 9.31-2.9 9.31-6.47 0-.21-.02-.42-.05-.63.86-.45 1.45-1.34 1.45-2.36z"/></svg>',
  'tiktok.com': '<svg viewBox="0 0 24 24" fill="#e8e8f0" style="width:100%;height:100%;"><path d="M12.53.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>'
};

function getFavicon(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (FAVICON_MAP[host]) return FAVICON_MAP[host];
    for (const key in FAVICON_MAP) {
      if (host === key || host.endsWith('.' + key)) return FAVICON_MAP[key];
    }
    return null;
  } catch { return null; }
}

// ─── Widget Renderer ─────────────────────────────────
function renderWidget(widget) {
  const s = widget.settings || {};
  const style = `position:absolute; left:${widget.x}%; top:${widget.y}%; width:${widget.w}%; height:${widget.h}%; transform:rotate(${widget.rotation || 0}deg);`;

  switch (widget.type) {

    // ── TEXT ──
    case 'text':
      return `<div style="${style} font-size:${s.fontSize || 16}px; color:${s.color || '#e8e8f0'}; text-align:${s.align || 'left'}; font-weight:${s.bold ? 'bold' : 'normal'}; font-style:${s.italic ? 'italic' : 'normal'}; overflow:hidden; padding:6px 10px;">${esc(s.content)}</div>`;

    case 'gradient-text':
      return `<div style="${style} font-size:${s.fontSize || 20}px; background:${s.gradient || 'linear-gradient(90deg, #F4C2C2, #fff)'}; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; padding:6px 10px; overflow:hidden;">${esc(s.content)}</div>`;

    case 'neon-text':
      return `<div style="${style} font-size:${s.fontSize || 22}px; color:${s.color || '#F4C2C2'}; text-shadow:0 0 10px ${s.color || '#F4C2C2'},0 0 20px ${s.color || '#F4C2C2'}; padding:6px 10px; overflow:hidden;">${esc(s.content)}</div>`;

    case 'marquee-text':
      return `<div style="${style} overflow:hidden;"><marquee behavior="scroll" direction="left" scrollamount="${s.speed || 5}" style="font-size:1rem; color:#e8e8f0;">${esc(s.content)}</marquee></div>`;

    // ── MEDIA ──
    case 'image':
      return `<img src="${esc(s.src)}" alt="${esc(s.alt)}" style="${style} object-fit:cover; border-radius:12px;" onerror="this.style.display='none'">`;

    case 'video':
      return `<video src="${esc(s.src)}" ${s.controls ? 'controls' : ''} style="${style} border-radius:12px;"></video>`;

    case 'audio':
      if (s.mode === 'glass') {
        return `<div style="${style} background:rgba(244,194,194,0.08); backdrop-filter:blur(20px); border-radius:16px; padding:12px; display:flex; flex-direction:column; gap:6px; overflow:hidden;"><div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; color:#F4C2C2;"><span>${esc(s.title || 'Track')}</span><span>${esc(s.artist || '')}</span></div><audio controls src="${esc(s.src)}" style="width:100%;"></audio></div>`;
      }
      return `<div style="${style} display:flex; flex-direction:column; justify-content:center; padding:8px; overflow:hidden;"><strong style="color:#F4C2C2; font-size:0.8rem;">${esc(s.title || 'Track')}</strong><audio controls src="${esc(s.src)}" style="width:100%;"></audio></div>`;

    case 'glass-audio':
      return `<div style="${style} background:rgba(244,194,194,0.1); backdrop-filter:blur(20px); border:1px solid rgba(244,194,194,0.3); border-radius:16px; padding:12px; display:flex; flex-direction:column; gap:6px; overflow:hidden;"><div style="display:flex; justify-content:space-between; font-size:0.75rem; font-weight:600; color:#F4C2C2;"><span>${esc(s.title || 'Track')}</span><span>${esc(s.artist || '')}</span></div><audio controls src="${esc(s.src)}" style="width:100%;"></audio></div>`;

    case 'audio-viz':
      return `<div style="${style} overflow:hidden;"><canvas class="audio-viz-canvas" data-src="${esc(s.src)}" data-color="${esc(s.color || '#F4C2C2')}" style="width:100%;height:100%;background:rgba(244,194,194,0.05);border-radius:12px;"></canvas></div>`;

    // ── PROFILE ──
    case 'profile-circle':
      return `<div style="${style} display:flex; align-items:center; justify-content:center;"><img src="${esc(s.src)}" style="width:100%; height:100%; border-radius:50%; border:3px solid ${s.borderColor || '#F4C2C2'}; object-fit:cover; box-shadow:0 0 24px ${s.borderColor || '#F4C2C2'}88;" onerror="this.style.display='none'"></div>`;

    case 'profile-card': {
      const avatar = s.avatar || '';
      const username = s.username || 'you';
      const statusText = s.statusText || 'Online';
      const roleText = s.roleText || 'dev';
      const glass = s.glass !== false;
      const cardBg = glass ? 'background:rgba(20,20,30,0.4); backdrop-filter:blur(20px); border:1px solid rgba(244,194,194,0.3);' : 'background:#1e1e2e; border:1px solid rgba(244,194,194,0.3);';
      return `<div style="${style} display:flex; align-items:center; gap:14px; padding:16px; border-radius:20px; ${cardBg} box-shadow:0 8px 32px rgba(0,0,0,0.4); overflow:hidden;">
        <div style="position:relative; flex-shrink:0;">
          <img src="${esc(avatar)}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid #F4C2C2;" onerror="this.style.display='none'">
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-weight:700;font-size:1rem;color:#fff;">${esc(username)}</span>
            <span style="background:rgba(244,194,194,0.15);border:1px solid rgba(244,194,194,0.35);border-radius:20px;padding:2px 10px;font-size:0.65rem;font-weight:600;color:#F4C2C2;">${esc(roleText)}</span>
          </div>
          <div style="font-style:italic;color:rgba(200,200,200,0.7);font-size:0.8rem;margin-top:2px;">${esc(statusText)}</div>
        </div>
      </div>`;
    }

    case 'badges': {
      const badges = toArr(s.badges);
      const list = badges.length ? badges : ['OG', 'Beta'];
      return `<div style="${style} display:flex; flex-wrap:wrap; gap:6px; align-items:center; justify-content:center; padding:6px; overflow:hidden;">${list.map(b => `<span style="background:rgba(244,194,194,0.15); color:#F4C2C2; border:1px solid rgba(244,194,194,0.35); padding:4px 12px; border-radius:20px; font-size:0.72rem; font-weight:600;">${esc(b)}</span>`).join('')}</div>`;
    }

    // ── EMBEDS ──
    case 'youtube':
      return `<iframe style="${style} border:0; border-radius:12px;" src="https://www.youtube.com/embed/${esc(s.videoId)}" allowfullscreen></iframe>`;

    case 'discord':
      return `<iframe style="${style} border:0; border-radius:12px;" src="https://discord.com/widget?id=${esc(s.serverId)}&theme=dark" allowfullscreen></iframe>`;

    case 'spotify':
      return `<iframe style="${style} border:0; border-radius:12px;" src="https://open.spotify.com/embed/track/${esc(s.uri)}" allowfullscreen></iframe>`;

    case 'github':
      return `<div class="github-card" data-user="${esc(s.username)}" style="${style}"></div><script src="//cdn.jsdelivr.net/github-cards/latest/widget.js"><\/script>`;

    case 'twitter':
      return `<a class="twitter-timeline" data-width="100%" data-height="100%" href="https://twitter.com/${esc(s.username)}" style="${style} display:block; color:#F4C2C2;">Tweets</a><script async src="https://platform.twitter.com/widgets.js"><\/script>`;

    case 'twitch':
      return `<iframe style="${style} border:0; border-radius:12px;" src="https://player.twitch.tv/?channel=${esc(s.channel)}&parent=chromaticc.creepers.lol" allowfullscreen></iframe>`;

    case 'instagram':
      return `<iframe style="${style} border:0; border-radius:12px;" src="https://www.instagram.com/${esc(s.username)}/embed"></iframe>`;

    case 'reddit':
      return `<iframe style="${style} border:0; border-radius:12px;" src="https://www.reddit.com/r/${esc(s.subreddit)}/hot?embed=true"></iframe>`;

    case 'tiktok':
      return `<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@${esc(s.username)}" style="${style}"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"><\/script>`;

    case 'soundcloud':
      return `<iframe width="100%" height="100%" style="${style} border:0; border-radius:12px;" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(s.trackUrl || '')}"></iframe>`;

    case 'link-embed': {
      const url = s.url || '';
      const fav = s.autoFavicon ? getFavicon(url) : null;
      const icon = fav || `<svg viewBox="0 0 24 24" fill="none" stroke="#F4C2C2" stroke-width="2" style="width:100%;height:100%;"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`;
      return `<a href="${esc(url)}" target="_blank" style="${style} display:flex; align-items:center; gap:10px; padding:10px 14px; background:rgba(244,194,194,0.08); border:1px solid rgba(244,194,194,0.3); border-radius:12px; text-decoration:none; color:#e8e8f0; font-weight:600; font-size:0.85rem; backdrop-filter:blur(10px); overflow:hidden;">
        <span style="width:24px;height:24px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">${icon}</span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(s.title || url)}</span>
      </a>`;
    }

    case 'social-link': {
      const url = s.url || '';
      const fav = getFavicon(url);
      const icon = fav || `<svg viewBox="0 0 24 24" fill="none" stroke="#F4C2C2" stroke-width="2" style="width:100%;height:100%;"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`;
      return `<a href="${esc(url)}" target="_blank" style="${style} display:flex; align-items:center; justify-content:center; gap:10px; background:rgba(244,194,194,0.1); border:1px solid rgba(244,194,194,0.35); border-radius:12px; text-decoration:none; color:#F4C2C2; font-weight:600; font-size:0.85rem; backdrop-filter:blur(10px); overflow:hidden;">
        <span style="width:20px;height:20px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">${icon}</span>
        <span>${esc(s.label || 'Link')}</span>
      </a>`;
    }

    case 'lyric-sync':
      return `<div style="${style} display:flex; flex-direction:column; overflow:auto; padding:8px; background:rgba(244,194,194,0.06); border-radius:12px;"><audio controls src="${esc(s.audioUrl)}" style="width:100%;"></audio><pre style="margin:8px 0 0; font-size:0.75rem; color:#e8e8f0; white-space:pre-wrap;">${esc(s.lrc || 'No lyrics')}</pre></div>`;

    // ── UTILITY ──
    case 'clock':
      return `<div id="clock-${widget.id}" style="${style} display:flex; align-items:center; justify-content:center; font-size:1.6rem; font-weight:700; color:#F4C2C2; font-variant-numeric:tabular-nums;"></div>
        <script>(function(){const el=document.getElementById('clock-${widget.id}');if(!el)return;setInterval(()=>{el.textContent=new Date().toLocaleTimeString('en-US',{hour12:${s.format !== '24h'},second:${s.showSeconds !== false}});},1000);})();<\/script>`;

    case 'countdown': {
      const target = s.targetDate ? new Date(s.targetDate).getTime() : 0;
      const now = Date.now();
      if (!target || target < now) return `<div style="${style} display:flex;align-items:center;justify-content:center;color:#F4C2C2;font-weight:600;">Passed</div>`;
      const diff = target - now;
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      return `<div id="cd-${widget.id}" data-target="${target}" style="${style} display:flex;align-items:center;justify-content:center;color:#F4C2C2;font-weight:700;font-size:1.2rem;">${d}d ${h}h ${m}m ${sec}s</div>
        <script>(function(){const el=document.getElementById('cd-${widget.id}');if(!el)return;const t=+el.dataset.target;setInterval(()=>{const diff=t-Date.now();if(diff<=0){el.textContent='Passed';return;}const d=Math.floor(diff/86400000),h=Math.floor((diff%86400000)/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000);el.textContent=d+'d '+h+'h '+m+'m '+s+'s';},1000);})();<\/script>`;
    }

    case 'days-counter': {
      const start = new Date(s.startDate);
      if (!s.startDate || isNaN(start.getTime())) return `<div style="${style} display:flex;align-items:center;justify-content:center;color:#F4C2C2;">Set date</div>`;
      const days = Math.floor((Date.now() - start.getTime()) / 86400000);
      return `<div style="${style} display:flex;flex-direction:column;align-items:center;justify-content:center;color:#F4C2C2;font-weight:700;"><span style="font-size:0.7rem;color:rgba(244,194,194,0.6);">${esc(s.label || '')}</span><span style="font-size:1.5rem;">${days}d</span></div>`;
    }

    case 'click-counter': {
      return `<div style="${style} display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;">
        <div id="cc-${widget.id}" style="font-size:1.3rem;font-weight:800;color:#F4C2C2;">${s.startCount || 0}</div>
        <button onclick="(function(){const el=document.getElementById('cc-${widget.id}');el.textContent=+el.textContent+1;})()" style="background:rgba(244,194,194,0.15);border:1px solid #F4C2C2;color:#F4C2C2;padding:6px 14px;border-radius:10px;cursor:pointer;font-weight:600;font-size:0.8rem;">${esc(s.buttonText || 'Click me')}</button>
      </div>`;
    }

    case 'visitor-counter':
      return `<div id="vc-${widget.id}" style="${style} display:flex;align-items:center;justify-content:center;color:#F4C2C2;font-weight:700;font-size:1.1rem;"><span>...</span></div>
        <script>(async function(){const el=document.getElementById('vc-${widget.id}');if(!el)return;const u=location.pathname.split('/').filter(Boolean)[0];try{const r=await fetch('/api/increment-view',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u})});const d=await r.json();el.querySelector('span').textContent=(d.count||0).toLocaleString()+' views';}catch(e){el.querySelector('span').textContent='views';}})();<\/script>`;

    case 'weather':
      return `<div id="w-${widget.id}" style="${style} display:flex;align-items:center;justify-content:center;color:#F4C2C2;font-weight:600;font-size:0.9rem;"></div>
        <script>(async function(){const el=document.getElementById('w-${widget.id}');if(!el)return;try{const c='${esc(s.city || 'London')}';const r=await fetch('https://wttr.in/'+encodeURIComponent(c)+'?format=j1');const d=await r.json();const t=d.current_condition[0]['temp_${s.unit === 'F' ? 'F' : 'C'}'];const desc=d.current_condition[0].weatherDesc[0].value;el.textContent=t+'°${s.unit === 'F' ? 'F' : 'C'} · '+desc;}catch(e){el.textContent='Weather N/A';}})();<\/script>`;

    case 'quote-ticker':
      return `<div style="${style} overflow:hidden;"><marquee scrollamount="${s.speed || 5}" style="font-size:0.9rem;color:#F4C2C2;">${esc(s.text || '')}</marquee></div>`;

    case 'random-quote':
      return `<div id="rq-${widget.id}" style="${style} display:flex;align-items:center;justify-content:center;color:#F4C2C2;font-size:0.85rem;text-align:center;padding:8px;"></div>
        <script>(async function(){const el=document.getElementById('rq-${widget.id}');if(!el)return;try{const r=await fetch('${esc(s.api || 'https://api.quotable.io/random')}');const d=await r.json();el.textContent='"'+d.content+'" — '+d.author;}catch(e){el.textContent='Quote N/A';}})();<\/script>`;

    case 'qr-code':
      return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=${s.size || 120}x${s.size || 120}&data=${encodeURIComponent(s.url || '')}" style="${style} object-fit:contain; border-radius:8px;">`;

    case 'progress-bar': {
      const pct = Math.min(100, Math.round(((s.value || 0) / (s.max || 100)) * 100));
      return `<div style="${style} display:flex;align-items:center;justify-content:center;padding:8px;"><div style="width:100%;height:14px;background:rgba(244,194,194,0.1);border-radius:8px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${s.color || '#F4C2C2'};border-radius:8px;transition:width 0.6s;"></div></div></div>`;
    }

    case 'streak-counter': {
      const start = new Date(s.startDate);
      const days = s.startDate && !isNaN(start.getTime()) ? Math.floor((Date.now() - start.getTime()) / 86400000) + 1 : 0;
      return `<div style="${style} display:flex;flex-direction:column;align-items:center;justify-content:center;color:#F4C2C2;font-weight:700;"><span style="font-size:0.7rem;color:rgba(244,194,194,0.6);">${esc(s.label || 'Streak')}</span><span style="font-size:1.4rem;">${days}d</span></div>`;
    }

    // ── SOCIAL ──
    case 'lanyard':
      return `<div id="ln-${widget.id}" style="${style} display:flex;align-items:center;justify-content:center;gap:8px;color:#F4C2C2;font-size:0.8rem;font-weight:600;padding:6px;"></div>
        <script>(async function(){const el=document.getElementById('ln-${widget.id}');if(!el)return;try{const r=await fetch('https://api.lanyard.rest/v1/users/${esc(s.userId || '')}');const d=await r.json();if(!d.success)throw 0;const u=d.data;let html='<span style="width:10px;height:10px;border-radius:50%;background:'+(u.discord_status==='online'?'#4ade80':u.discord_status==='idle'?'#fbbf24':'#666')+';display:inline-block;"></span>';${s.showStatus !== false ? "html+='<span>'+u.discord_status+'</span>';" : ''}${s.showGame !== false ? "const g=u.activities.find(a=>a.type===0);if(g)html+='<span>· '+g.name+'</span>';" : ''}el.innerHTML=html;}catch(e){el.textContent='Discord N/A';}})();<\/script>`;

    case 'github-stats':
      return `<div id="gh-${widget.id}" style="${style} display:flex;align-items:center;justify-content:center;gap:14px;color:#F4C2C2;font-size:0.8rem;font-weight:600;padding:8px;"></div>
        <script>(async function(){const el=document.getElementById('gh-${widget.id}');if(!el)return;try{const r=await fetch('https://api.github.com/users/${esc(s.username || '')}');if(!r.ok)throw 0;const d=await r.json();let h='';if(${s.showFollowers !== false})h+='<div><div style="font-size:1rem;color:#fff;">'+(d.followers||0)+'</div><div style="font-size:0.65rem;opacity:0.6;">Followers</div></div>';if(${s.showRepos !== false})h+='<div><div style="font-size:1rem;color:#fff;">'+(d.public_repos||0)+'</div><div style="font-size:0.65rem;opacity:0.6;">Repos</div></div>';el.innerHTML=h;}catch(e){el.textContent='GitHub N/A';}})();<\/script>`;

    case 'tech-stack': {
      const items = toArr(s.items);
      const list = items.length ? items : ['React','Node','TS'];
      const cols = s.columns || 3;
      return `<div style="${style} display:grid; grid-template-columns:repeat(${cols},1fr); gap:8px; align-items:center; justify-items:center; padding:10px; overflow:hidden;">${list.map(i => `<span style="background:rgba(244,194,194,0.12); border:1px solid rgba(244,194,194,0.3); padding:6px 12px; border-radius:10px; font-size:0.72rem; color:#F4C2C2; font-weight:600;">${esc(i)}</span>`).join('')}</div>`;
    }

    case 'game-library': {
      const games = toArr(s.games);
      const list = games.length ? games : ['Valorant','Minecraft'];
      return `<div style="${style} display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;padding:6px;overflow:hidden;">${list.map(g => `<span style="background:rgba(244,194,194,0.12);border:1px solid rgba(244,194,194,0.3);padding:4px 10px;border-radius:20px;font-size:0.7rem;color:#F4C2C2;font-weight:600;">${esc(g)}</span>`).join('')}</div>`;
    }

    case 'friend-code':
      return `<div style="${style} display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#F4C2C2;letter-spacing:1px;">${esc(s.code || 'YOUR-CODE')}</div>`;

    // ── INTERACTIVE ──
    case 'guestbook': {
      const wid = 'gb-' + widget.id;
      return `<div id="${wid}" style="${style} display:flex; flex-direction:column; padding:12px; background:rgba(244,194,194,0.06); border:1px solid rgba(244,194,194,0.25); border-radius:14px; backdrop-filter:blur(12px); overflow:hidden;">
        <h4 style="margin:0 0 8px;font-size:0.85rem;color:#F4C2C2;font-weight:700;">${esc(s.title || 'Leave a message')}</h4>
        <div id="${wid}-msgs" style="flex:1;overflow-y:auto;margin-bottom:8px;font-size:0.75rem;color:#e8e8f0;display:flex;flex-direction:column;gap:4px;"></div>
        <input id="${wid}-name" placeholder="Name" style="width:100%;padding:6px 8px;margin-bottom:4px;border-radius:6px;border:1px solid rgba(244,194,194,0.3);background:rgba(0,0,0,0.3);color:#e8e8f0;font-size:0.72rem;outline:none;">
        <textarea id="${wid}-text" placeholder="Message" rows="2" style="width:100%;padding:6px 8px;margin-bottom:4px;border-radius:6px;border:1px solid rgba(244,194,194,0.3);background:rgba(0,0,0,0.3);color:#e8e8f0;font-size:0.72rem;outline:none;resize:none;font-family:inherit;"></textarea>
        <button id="${wid}-send" style="background:linear-gradient(135deg,#F4C2C2,#ffb6c1);color:#1a0a0a;border:none;padding:6px;border-radius:6px;font-weight:700;font-size:0.72rem;cursor:pointer;">Send</button>
        <script>
          (function(){
            const esc2=function(x){return String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');};
            const u=location.pathname.split('/').filter(Boolean)[0];
            const msgs=document.getElementById('${wid}-msgs');
            const ni=document.getElementById('${wid}-name');
            const ti=document.getElementById('${wid}-text');
            const sb=document.getElementById('${wid}-send');
            async function load(){
              try{const r=await fetch('/api/guestbook?username='+u);const arr=await r.json();msgs.innerHTML=(arr||[]).map(m=>'<div><b style="color:#F4C2C2;">'+esc2(m.author||'Anon')+'</b>: '+esc2(m.text)+'</div>').join('');}catch(e){}
            }
            sb.onclick=async()=>{
              const t=ti.value.trim();if(!t)return;
              try{await fetch('/api/guestbook',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,text:t,author:ni.value.trim()||'Anonymous'})});ti.value='';load();}catch(e){}
            };
            load();
          })();
        <\/script>
      </div>`;
    }

    case 'mini-poll': {
      const opts = toArr(s.options);
      const list = opts.length ? opts : ['Yes','No'];
      return `<div style="${style} display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px;background:rgba(244,194,194,0.06);border-radius:12px;color:#F4C2C2;gap:8px;">
        <div style="font-weight:700;font-size:0.85rem;text-align:center;">${esc(s.question || 'What do you think?')}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;">${list.map(o => `<button onclick="this.style.background='#F4C2C2';this.style.color='#1a0a0a';" style="background:rgba(244,194,194,0.15);border:1px solid #F4C2C2;color:#F4C2C2;padding:5px 12px;border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:600;">${esc(o)}</button>`).join('')}</div>
      </div>`;
    }

    case 'flip-card':
      return `<div style="${style} display:flex;align-items:center;justify-content:center;padding:10px;background:rgba(244,194,194,0.08);border:1px solid rgba(244,194,194,0.3);border-radius:12px;color:#F4C2C2;font-weight:600;font-size:0.85rem;cursor:pointer;" onclick="(function(el){const f=el.dataset.front==='1';el.dataset.front=f?'0':'1';el.textContent=f?'${esc(s.front)}':'${esc(s.back)}';})(this)" data-front="1">${esc(s.front)}</div>`;

    case 'accordion': {
      const items = toArr(s.items);
      const list = items.length ? items : ['Item 1','Item 2','Item 3'];
      return `<div style="${style} display:flex;flex-direction:column;gap:4px;padding:6px;overflow:auto;">${list.map(i => `<details style="background:rgba(244,194,194,0.08);border-radius:8px;padding:6px 10px;font-size:0.78rem;color:#F4C2C2;"><summary style="cursor:pointer;font-weight:600;">${esc(i)}</summary><div style="padding-top:4px;color:#e8e8f0;">Content</div></details>`).join('')}</div>`;
    }

    // ── DECORATION ──
    case 'divider':
    case 'section-divider':
      return `<div style="position:absolute;left:0;top:${widget.y}%;width:100%;height:${widget.h}%;display:flex;align-items:center;justify-content:center;"><hr style="border:none;border-top:${s.thickness || 2}px ${s.style || 'solid'} ${s.color || '#F4C2C2'};width:100%;margin:0;">${s.label ? `<span style="position:absolute;background:#000001;padding:0 12px;color:${s.color || '#F4C2C2'};font-size:0.7rem;font-weight:600;">${esc(s.label)}</span>` : ''}</div>`;

    case 'shape': {
      const r = s.shape === 'circle' ? 'border-radius:50%;' : '';
      return `<div style="${style} background:${s.color || '#F4C2C2'}; ${r}"></div>`;
    }

    case 'badges-row': {
      const list = toArr(s.badges).length ? toArr(s.badges) : ['OG','Beta','Dev'];
      return `<div style="${style} display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;">${list.map(b => `<span style="background:rgba(244,194,194,0.15);color:#F4C2C2;border:1px solid rgba(244,194,194,0.35);padding:4px 12px;border-radius:20px;font-size:0.72rem;font-weight:600;">${esc(b)}</span>`).join('')}</div>`;
    }

    // ── ADVANCED ──
    case 'code':
      return `<div style="${style} overflow:hidden;">${s.html || ''}<style>${s.css || ''}</style><script>${s.js || ''}<\/script></div>`;

    case 'custom-cursor':
      return `<style>body{cursor:url('${esc(s.url)}'),auto;}</style>`;

    case 'font-selector':
      return `<style>body * { font-family: '${esc(s.font)}', sans-serif !important; }</style>`;

    case 'overlay-effect':
      return `<div class="nitro-skip" style="position:fixed;inset:0;pointer-events:none;z-index:99;${s.effect === 'rain' ? 'background:repeating-linear-gradient(120deg,transparent 0 15px,rgba(244,194,194,0.08) 15px 16px);' : ''}${s.effect === 'sparkles' ? 'background:radial-gradient(circle,rgba(244,194,194,0.2) 1px,transparent 1px);background-size:40px 40px;animation:overlayDrift 30s linear infinite;' : ''}${s.effect === 'snow' ? 'background:radial-gradient(circle,#fff 1px,transparent 2px);background-size:50px 50px;animation:overlayDrift 20s linear infinite;' : ''}${s.effect === 'bubbles' ? 'background:radial-gradient(circle,rgba(244,194,194,0.15) 3px,transparent 4px);background-size:60px 60px;animation:overlayDrift 40s linear infinite;' : ''}"></div>`;

    case 'background-anim':
      return `<div class="nitro-skip" style="position:fixed;inset:0;pointer-events:none;z-index:-1;background:radial-gradient(circle at 30% 30%,rgba(244,194,194,0.15),transparent 60%),radial-gradient(circle at 70% 70%,rgba(255,182,193,0.1),transparent 60%);animation:bgShift 12s ease-in-out infinite;"></div>`;

    case 'theme-switcher': {
      const themes = toArr(s.themes).length ? toArr(s.themes) : ['pink','dark','light'];
      return `<div class="nitro-skip" style="position:fixed;bottom:20px;right:20px;z-index:9999;background:rgba(10,10,16,0.9);backdrop-filter:blur(20px);border:1px solid rgba(244,194,194,0.3);border-radius:14px;padding:10px;display:flex;flex-direction:column;gap:6px;font-family:Inter,sans-serif;">
        ${themes.map(t => `<button onclick="document.documentElement.style.setProperty('--pink','${t === 'pink' ? '#F4C2C2' : t === 'dark' ? '#666' : '#ccc'}')" style="background:rgba(244,194,194,0.1);border:1px solid rgba(244,194,194,0.3);color:#F4C2C2;padding:5px 12px;border-radius:8px;cursor:pointer;font-size:0.72rem;font-weight:600;text-transform:capitalize;">${esc(t)}</button>`).join('')}
      </div>`;
    }

    case 'page-indicator':
      return `<div style="${style} display:flex;align-items:center;justify-content:center;gap:6px;">${Array.from({length: s.total || 1}, (_, i) => `<span style="width:8px;height:8px;border-radius:50%;background:${i === (s.current || 1) - 1 ? '#F4C2C2' : 'rgba(244,194,194,0.3)'};"></span>`).join('')}</div>`;

    // ── FUN ──
    case 'typewriter':
      return `<div id="tw-${widget.id}" style="${style} font-size:1rem;color:${s.color || '#F4C2C2'};font-weight:600;padding:8px;"></div>
        <script>(function(){const el=document.getElementById('tw-${widget.id}');if(!el)return;const txt='${esc(s.text || 'Hello')}';const sp=${s.speed || 80};let i=0;function go(){if(i<txt.length){el.textContent+=txt.charAt(i++);setTimeout(go,sp);}}go();})();<\/script>`;

    case 'mood-tracker': {
      const moods = { happy: '◕‿◕', sad: '◕︵◕', neutral: '◕_◕', angry: '◕皿◕', excited: '★‿★' };
      const m = s.mood || 'happy';
      return `<div style="${style} display:flex;align-items:center;justify-content:center;font-size:1.8rem;color:#F4C2C2;font-weight:700;">${moods[m] || moods.happy}</div>`;
    }

    case 'virtual-pet':
      return `<div style="${style} display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;color:#F4C2C2;font-weight:600;cursor:pointer;" onclick="(function(el){el.style.transform=el.style.transform.includes('scale(1.2)')?'rotate(0deg)':'scale(1.2) rotate(10deg)';})(this)"><span style="font-size:2rem;">◉◡◉</span><span style="font-size:0.75rem;">${esc(s.name || 'Pet')}</span></div>`;

    case 'soundboard': {
      const sounds = toArr(s.sounds);
      return `<div style="${style} display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;padding:8px;overflow:hidden;">${(sounds.length ? sounds : ['🔊']).map((snd, i) => `<button onclick="try{new Audio('${esc(snd)}').play();}catch(e){}" style="background:rgba(244,194,194,0.15);border:1px solid #F4C2C2;color:#F4C2C2;padding:8px 14px;border-radius:10px;cursor:pointer;font-weight:700;">${i + 1}</button>`).join('')}</div>`;
    }

    case 'image-carousel': {
      const imgs = toArr(s.images);
      if (!imgs.length) return `<div style="${style} display:flex;align-items:center;justify-content:center;background:rgba(244,194,194,0.08);border-radius:12px;color:#F4C2C2;font-size:0.8rem;">No images</div>`;
      return `<div id="cr-${widget.id}" style="${style} overflow:hidden;border-radius:12px;"><img src="${esc(imgs[0])}" style="width:100%;height:100%;object-fit:cover;"><script>(function(){const el=document.getElementById('cr-${widget.id}');if(!el)return;const imgs=${JSON.stringify(imgs)};let i=0;setInterval(()=>{i=(i+1)%imgs.length;const img=el.querySelector('img');if(img)img.src=imgs[i];},3500);})();<\/script></div>`;
    }

    case 'stopwatch':
      return `<div id="sw-${widget.id}" style="${style} display:flex;align-items:center;justify-content:center;color:#F4C2C2;font-weight:700;font-size:1.2rem;font-variant-numeric:tabular-nums;cursor:pointer;" onclick="(function(el){if(el._t){clearInterval(el._t);el._t=null;}else{let s=parseInt(el.dataset.s||'0');el._t=setInterval(()=>{s++;el.dataset.s=s;const m=Math.floor(s/60),sec=s%60;el.textContent=m+':'+(sec<10?'0':'')+sec;},1000);}})(this)" data-s="0">0:00</div>`;

    case 'pomodoro':
      return `<div style="${style} display:flex;flex-direction:column;align-items:center;justify-content:center;color:#F4C2C2;font-weight:700;"><span style="font-size:1.5rem;">${s.work || 25}:00</span><span style="font-size:0.7rem;opacity:0.7;">Work</span></div>`;

    case 'color-picker':
      return `<div style="${style} display:flex;align-items:center;justify-content:center;font-weight:700;color:#1a0a0a;background:${s.color || '#F4C2C2'};border-radius:12px;font-size:0.85rem;">${esc(s.color || '#F4C2C2')}</div>`;

    case 'breathing-timer':
      return `<div id="bt-${widget.id}" style="${style} display:flex;align-items:center;justify-content:center;color:#F4C2C2;font-weight:700;transition:transform 4s ease;" onclick="(function(el){el.style.transform='scale(1.3)';setTimeout(()=>el.style.transform='scale(1)',2000);})(this)">Breathe</div>`;

    case 'audio-embed':
      return `<audio src="${esc(s.src)}" controls style="${style}"></audio>`;

    case 'video-embed':
      return `<video src="${esc(s.src)}" controls style="${style} border-radius:12px;"></video>`;

    case 'map-widget':
      return `<div style="${style} display:flex;align-items:center;justify-content:center;background:rgba(244,194,194,0.08);border-radius:12px;color:#F4C2C2;font-size:0.8rem;">${s.lat || 0}, ${s.lng || 0}</div>`;

    case 'news-ticker':
      return `<div style="${style} overflow:hidden;"><marquee scrollamount="5" style="color:#F4C2C2;font-size:0.82rem;">${esc(s.source || 'News coming soon...')}</marquee></div>`;

    // ── CLICK-TO-ENTER ──
    case 'click-enter': {
      const audioEnabled = !!s.audioEnabled && !!s.audioUrl;
      const audioSrc = audioEnabled ? esc(s.audioUrl) : '';
      return `<div id="clickEnter" class="nitro-skip" style="position:fixed;inset:0;background:rgba(0,0,1,0.92);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;z-index:9998;cursor:pointer;flex-direction:column;gap:16px;">
        <div style="font-size:1.4rem;font-weight:800;color:#F4C2C2;text-shadow:0 0 30px rgba(244,194,194,0.5);text-align:center;padding:0 20px;">${esc(s.message || 'Click anywhere to enter')}</div>
        <div style="font-size:0.75rem;color:rgba(244,194,194,0.6);">Tap or click to continue</div>
        <script>
          (function(){
            const ov=document.getElementById('clickEnter');
            const audioSrc='${audioSrc}';
            let audio=null;
            if(audioSrc){audio=new Audio(audioSrc);audio.loop=false;}
            ov.addEventListener('click',function(){
              if(audio){audio.play().catch(()=>{});}
              ov.style.opacity='0';
              setTimeout(()=>{
                ov.remove();
                document.querySelectorAll('.audio-viz-canvas').forEach(c=>c.click());
              },300);
            },{once:true});
          })();
        <\/script>
      </div>`;
    }

    // ── FALLBACK ──
    default:
      return `<div style="${style} border:1px dashed rgba(244,194,194,0.4); border-radius:12px; display:flex; align-items:center; justify-content:center; color:#F4C2C2; font-size:0.75rem; background:rgba(244,194,194,0.05);">${esc(widget.type)}</div>`;
  }
}

// ─── Audio Visualizer init script ─────────────────────
const AUDIO_VIZ_SCRIPT = `
<script>
(function(){
  document.querySelectorAll('.audio-viz-canvas').forEach(function(canvas){
    const ctx = canvas.getContext('2d');
    const audio = new Audio(canvas.dataset.src || '');
    audio.crossOrigin = 'anonymous';
    const color = canvas.dataset.color || '#F4C2C2';
    let started = false, audioCtx, analyser, source, animId;
    function start(){
      if(started) return; started = true;
      if(!audioCtx){
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioCtx.createAnalyser();
        try {
          source = audioCtx.createMediaElementSource(audio);
          source.connect(analyser);
          analyser.connect(audioCtx.destination);
        } catch(e){}
      }
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const buf = analyser.frequencyBinCount;
      const data = new Uint8Array(buf);
      function draw(){
        animId = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(data);
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = color;
        const barW = (canvas.width / buf) * 2.5;
        let x = 0;
        for(let i=0;i<buf;i++){
          const h = (data[i] / 255) * canvas.height;
          ctx.fillRect(x, canvas.height - h, barW, h);
          x += barW + 1;
        }
      }
      audio.play().catch(()=>{});
      draw();
    }
    canvas.addEventListener('click', start);
  });
})();
<\/script>`;

// ─── Aurora Mode CSS ─────────────────────────────────
function buildAuroraCSS(a) {
  const accent = a.accent || '#F4C2C2';
  const glowMap = { low: '16px', medium: '32px', high: '55px', extreme: '80px' };
  const glow = glowMap[a.glow] || '32px';
  const speedMap = { slow: '6s', normal: '3s', fast: '1.5s' };
  const dur = speedMap[a.speed] || '3s';
  const glass = a.glass ? 'backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);' : '';
  const hover = a.hover ? 'transition: transform 0.25s ease, box-shadow 0.25s ease;' : '';
  const shimmer = a.shimmer ? `
    .profile-canvas > *:not(.nitro-skip)::after {
      content: '';
      position: absolute;
      top: 0; left: -100%;
      width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
      animation: auroraShimmer ${dur} infinite;
      pointer-events: none;
    }
    @keyframes auroraShimmer { to { left: 100%; } }
  ` : '';

  return `<style>
    .profile-canvas > *:not(.nitro-skip) {
      position: absolute;
      border: 1.5px solid transparent !important;
      background-clip: padding-box, border-box !important;
      background-origin: border-box !important;
      background-image:
        linear-gradient(rgba(0,0,1,0.35), rgba(0,0,1,0.35)),
        linear-gradient(135deg, ${accent}, #ffffff, ${accent}, #ffffff, ${accent}) !important;
      background-size: 100% 100%, 300% 300% !important;
      border-radius: 14px !important;
      ${glass}
      ${hover}
      box-shadow: 0 0 ${glow} rgba(244,194,194,0.35), 0 8px 24px rgba(0,0,0,0.4) !important;
      animation: auroraBorder ${dur} ease infinite, auroraPulse ${dur} ease infinite !important;
    }
    .profile-canvas > *:not(.nitro-skip):hover {
      transform: translateY(-3px);
      box-shadow: 0 0 ${glow} rgba(244,194,194,0.65), 0 12px 32px rgba(0,0,0,0.5) !important;
    }
    @keyframes auroraBorder {
      0%, 100% { background-position: 0% 50%, 0% 50%; }
      50% { background-position: 0% 50%, 100% 50%; }
    }
    @keyframes auroraPulse {
      0%, 100% { box-shadow: 0 0 ${glow} rgba(244,194,194,0.3); }
      50% { box-shadow: 0 0 ${glow} rgba(244,194,194,0.7); }
    }
    @keyframes overlayDrift {
      from { background-position: 0 0; }
      to { background-position: 100px 100px; }
    }
    @keyframes bgShift {
      0%, 100% { transform: scale(1) rotate(0deg); }
      50% { transform: scale(1.1) rotate(5deg); }
    }
    ${shimmer}
  </style>`;
}

// ─── MAIN HANDLER ────────────────────────────────────
export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.toLowerCase();
  const parts = path.split('/').filter(Boolean);

  if (parts.length === 0) {
    res.writeHead(302, { Location: '/index.html' });
    return res.end();
  }

  const username = parts[0];

  try {
    const userRes = await pool.query('SELECT id, username FROM users WHERE LOWER(username) = $1', [username]);
    if (userRes.rows.length === 0) {
      res.status(404).send('<h1 style="color:#F4C2C2;font-family:Inter,sans-serif;text-align:center;padding:80px;">User not found</h1>');
      return;
    }
    const user = userRes.rows[0];

    const layoutRes = await pool.query('SELECT layout_data FROM profiles WHERE user_id = $1', [user.id]);
    const data = layoutRes.rows[0]?.layout_data || { layout: [], settings: {} };
    const widgets = Array.isArray(data.layout) ? data.layout : [];
    const settings = data.settings || {};

    // Defensive defaults
    settings.background = settings.background || {};
    settings.aurora = settings.aurora || { enabled: false };

    // Global styles
    let globalStyles = '';
    if (settings.cursor) globalStyles += `body{cursor:url('${settings.cursor}'),auto;}`;
    if (settings.favicon) globalStyles += `<link rel="icon" href="${settings.favicon}">`;

    // Background engine (inline !important)
    let bodyStyle = '';
    if (settings.background && settings.background.value) {
      const bg = settings.background;
      const raw = String(bg.value).trim();
      let bgRule = '';
      if (/^(https?:\/\/|blob:|data:)/i.test(raw)) {
        bgRule = `url('${raw}') center/cover fixed`;
      } else if (bg.type === 'image' || bg.type === 'video') {
        bgRule = `url('${raw}') center/cover fixed`;
      } else {
        bgRule = raw;
      }
      bodyStyle = `background: ${bgRule} !important;`;
    }

    // Aurora CSS
    let auroraCSS = '';
    if (settings.aurora && settings.aurora.enabled) {
      auroraCSS = buildAuroraCSS(settings.aurora);
    }

    // Global click-to-enter overlay (only if enabled AND no widget provides it)
    let clickEnterHTML = '';
    const hasWidgetClickEnter = widgets.some(w => w.type === 'click-enter');
    if (settings.clickToEnter && !hasWidgetClickEnter) {
      clickEnterHTML = `<div id="globalClickEnter" class="nitro-skip" style="position:fixed;inset:0;background:rgba(0,0,1,0.92);display:flex;align-items:center;justify-content:center;z-index:9998;cursor:pointer;"><h2 style="color:#F4C2C2;font-family:Inter,sans-serif;font-size:1.4rem;font-weight:800;">Click anywhere to enter</h2></div>
      <script>document.getElementById('globalClickEnter').addEventListener('click',function(){this.remove();document.querySelectorAll('.audio-viz-canvas').forEach(c=>c.click());},{once:true});<\/script>`;
    }

    // Render widgets
    const widgetsHTML = widgets.map(w => renderWidget(w)).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(user.username)} — Chromaticc</title>
${globalStyles}
${auroraCSS}
<style>
  *{box-sizing:border-box;}
  body{margin:0;padding:0;overflow:hidden;font-family:'Inter',system-ui,sans-serif;background:#000001;color:#e8e8f0;}
  .profile-canvas{position:relative;width:100vw;height:100vh;}
  a{color:inherit;}
  @media(max-width:768px){
    .profile-canvas{font-size:90%;}
  }
</style>
</head>
<body style="${bodyStyle}">
  ${clickEnterHTML}
  <div class="profile-canvas" style="background:transparent !important;">
    ${widgetsHTML}
  </div>
  ${AUDIO_VIZ_SCRIPT}
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).send(html);

  } catch (err) {
    console.error('Profile render error:', err);
    res.status(500).send(`<pre style="color:#F4C2C2;background:#000001;padding:20px;font-family:monospace;">Error: ${esc(err.message)}\n\n${esc(err.stack || '')}</pre>`);
  }
}
