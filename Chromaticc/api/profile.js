import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderWidget(widget) {
  const s = widget.settings || {};
  const style = `position:absolute; left:${widget.x}%; top:${widget.y}%; width:${widget.w}%; height:${widget.h}%; transform:rotate(${widget.rotation || 0}deg);`;

  switch (widget.type) {
    // ── Text widgets ──
    case 'text':
      if (s.style === 'gradient') {
        return `<div style="${style} font-size:${s.fontSize}px; background:${s.gradient}; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; font-family:${s.fontFamily || 'Inter'}; font-weight:${s.bold ? 'bold' : 'normal'}; font-style:${s.italic ? 'italic' : 'normal'}; text-align:${s.align || 'left'}; overflow:hidden;">${esc(s.content)}</div>`;
      }
      if (s.style === 'neon') {
        return `<div style="${style} font-size:${s.fontSize}px; color:${s.color}; text-shadow:0 0 10px ${s.color},0 0 20px ${s.color}; font-weight:${s.bold ? 'bold' : 'normal'}; font-style:${s.italic ? 'italic' : 'normal'}; text-align:${s.align || 'left'}; overflow:hidden;">${esc(s.content)}</div>`;
      }
      return `<div style="${style} font-size:${s.fontSize}px; color:${s.color}; font-weight:${s.bold ? 'bold' : 'normal'}; font-style:${s.italic ? 'italic' : 'normal'}; text-align:${s.align || 'left'}; font-family:${s.fontFamily || 'Inter'}; overflow:hidden;">${esc(s.content)}</div>`;

    // ── Profile Circle ──
    case 'profile-circle':
      return `<div style="${style} display:flex; align-items:center; justify-content:center;"><img src="${esc(s.src)}" style="width:100%; height:100%; border-radius:50%; border:${s.borderWidth || 2}px solid ${s.borderColor || '#000'}; object-fit:cover;" onerror="this.style.display='none'"></div>`;

    // ── Media widgets ──
    case 'image':
      return `<img src="${esc(s.src)}" alt="${esc(s.alt)}" style="${style} object-fit:${s.objectFit || 'cover'}; border-radius:12px;" onerror="this.style.display='none'">`;

    case 'video':
      return `<video src="${esc(s.src)}" ${s.controls ? 'controls' : ''} ${s.autoplay ? 'autoplay' : ''} ${s.loop ? 'loop' : ''} style="${style} border-radius:12px;"></video>`;

    case 'audio':
      if (s.mode === 'glass') {
        return `<div style="${style} background:rgba(255,255,255,0.15); backdrop-filter:blur(20px); border-radius:16px; padding:12px; display:flex; flex-direction:column; gap:6px; overflow:hidden;">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:600;">
            <span>${esc(s.title || 'Unknown')}</span><span>${esc(s.artist || '')}</span>
          </div>
          <audio controls src="${esc(s.src)}" style="width:100%;"></audio>
        </div>`;
      }
      return `<div style="${style} display:flex; flex-direction:column; justify-content:center; overflow:hidden;"><strong>${esc(s.title || 'Track')}</strong><audio controls src="${esc(s.src)}" style="width:100%;"></audio></div>`;

    // ── Section Divider (spans full width, uses widget y and height) ──
    case 'section-divider':
      return `<div style="position:absolute; left:0; top:${widget.y}%; width:100%; height:${widget.h}%; transform:rotate(${widget.rotation || 0}deg); display:flex; align-items:center; justify-content:center; overflow:hidden;">
        <hr style="border:none; border-top:${s.thickness || 2}px ${s.style || 'solid'} ${s.color || '#000'}; width:100%;">
        ${s.label ? `<span style="position:absolute; background:inherit; padding:0 10px; color:${s.color || '#000'};">${esc(s.label)}</span>` : ''}
      </div>`;

    // ── Embed / Social widgets ──
    case 'youtube':
      return `<iframe style="${style} border:0;" src="https://www.youtube.com/embed/${esc(s.videoId)}" allowfullscreen></iframe>`;
    case 'discord':
      return `<iframe style="${style} border:0;" src="https://discord.com/widget?id=${esc(s.serverId)}&theme=dark" allowfullscreen></iframe>`;
    case 'spotify':
      return `<iframe style="${style} border:0;" src="https://open.spotify.com/embed/track/${esc(s.uri)}" allowfullscreen></iframe>`;
    case 'github':
      return `<div class="github-card" data-user="${esc(s.username)}" style="${style}"></div><script src="//cdn.jsdelivr.net/github-cards/latest/widget.js"><\/script>`;
    case 'twitter':
      return `<a class="twitter-timeline" data-width="100%" data-height="100%" href="https://twitter.com/${esc(s.username)}" style="${style} display:block;">Tweets</a><script async src="https://platform.twitter.com/widgets.js"><\/script>`;
    case 'instagram':
      return `<iframe style="${style} border:0;" src="https://www.instagram.com/${esc(s.username)}/embed"></iframe>`;
    case 'twitch':
      return `<iframe style="${style} border:0;" src="https://player.twitch.tv/?channel=${esc(s.channel)}&parent=chromaticc.vercel.app" allowfullscreen></iframe>`;
    case 'reddit':
      return `<iframe style="${style} border:0;" src="https://www.reddit.com/r/${esc(s.subreddit)}/hot?embed=true"></iframe>`;
    case 'tiktok':
      return `<blockquote class="tiktok-embed" cite="https://www.tiktok.com/@${esc(s.username)}" data-video-id="" style="${style}"><section></section></blockquote><script async src="https://www.tiktok.com/embed.js"><\/script>`;
    case 'soundcloud':
      return `<iframe width="100%" height="100%" style="${style} border:0;" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(s.trackUrl)}"></iframe>`;

    // ── Utility widgets ──
    case 'clock':
      return `<div style="${style} display:flex; align-items:center; justify-content:center; font-size:${s.fontSize || 24}px; font-weight:bold; overflow:hidden;" id="clock-${widget.id}"></div>
        <script>(function(){const el=document.getElementById('clock-${widget.id}');setInterval(()=>{el.textContent=new Date().toLocaleTimeString('en-US',{hour12:${s.format === '12h'},second:${s.showSeconds}});},1000);})();</script>`;

    case 'badges':
      const badges = s.badges || ['OG', 'Beta'];
      return `<div style="${style} display:flex; flex-wrap:wrap; gap:6px; align-items:center; overflow:hidden;">${badges.map(b => `<span style="background:#000;color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;">${esc(b)}</span>`).join('')}</div>`;

    case 'shape':
      const shapeStyle = s.shape === 'circle' ? 'border-radius:50%;' : '';
      return `<div style="${style} background:${s.color}; ${shapeStyle} overflow:hidden;"></div>`;

    case 'divider':
      return `<hr style="${style} border-top:2px ${s.style} ${s.color}; width:100%; margin:0; position:absolute; top:50%; left:0; transform:translateY(-50%);">`;

    case 'social-link':
      return `<a href="${esc(s.url)}" target="_blank" style="${style} display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.2); border-radius:12px; text-decoration:none; color:#000; font-weight:600; overflow:hidden;">${esc(s.label)}</a>`;

    case 'link-embed':
      return `<a href="${esc(s.url)}" target="_blank" style="${style} display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.2); border-radius:12px; text-decoration:none; color:#000; padding:8px; overflow:hidden;">${esc(s.title)}</a>`;

    case 'lyric-sync':
      return `<div style="${style} display:flex; flex-direction:column; overflow:auto;"><audio controls src="${esc(s.audioUrl)}" style="width:100%;"></audio><pre style="margin:0; font-size:0.8rem;">${esc(s.lrc || 'No lyrics')}</pre></div>`;

    // ── Interactive / overlay widgets ──
    case 'click-enter':
      // Fixed overlay, not affected by widget position
      let clickJS = '';
      if (s.audioEnabled && s.audioUrl) {
        clickJS = `<script>
          (function(){
            const audio = new Audio('${esc(s.audioUrl)}');
            const overlay = document.getElementById('clickEnter');
            if (overlay) {
              overlay.addEventListener('click', function(){
                audio.play().catch(function(){});
                overlay.remove();
              });
            } else {
              document.body.addEventListener('click', function firstClick(){
                audio.play().catch(function(){});
                document.body.removeEventListener('click', firstClick);
              });
            }
          })();
        </script>`;
      } else {
        clickJS = `<script>
          document.getElementById('clickEnter').addEventListener('click', function(){
            this.remove();
          });
        </script>`;
      }
      return `<div id="clickEnter" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; cursor:pointer;"><h2 style="color:#fff;">${esc(s.message || 'Click anywhere to enter')}</h2></div>${clickJS}`;

    case 'custom-cursor':
      return `<style>body{cursor:url('${esc(s.url)}'),auto;}</style>`;

    case 'volume-control':
      return `<input type="range" min="0" max="100" value="80" style="${style}" oninput="document.querySelectorAll('audio').forEach(a=>a.volume=this.value/100)">`;

    case 'glass-toggle':
      return `<style>body .canvas-widget{backdrop-filter:blur(${s.enabled ? '12px' : '0px'});}</style>`;

    case 'overlay-effect':
      return `<div style="position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:999; ${s.effect === 'rain' ? 'background:url(data:image/svg+xml,...);' : ''}${s.effect === 'sparkles' ? 'animation: sparkle 2s infinite;' : ''}"></div>`;

    // ── Code Widget (now fully positionable!) ──
    case 'code':
      // Wrap raw HTML in a positioned container so it obeys widget position/size
      return `<div style="${style} overflow:hidden;">${s.html || ''}<style>${s.css || ''}</style><script>${s.js || ''}<\/script></div>`;

    case 'font-selector':
      return `<style>body * { font-family: '${s.font}', sans-serif; }</style>`;

    case 'ttf-upload':
      return '';

    case 'page-indicator':
      return `<div style="${style} display:flex; align-items:center; justify-content:center; font-size:0.9rem; color:#666; overflow:hidden;">Page ${s.current} of ${s.total}</div>`;

      // ── Lanyard Discord Card ──
case 'lanyard': {
  const userId = s.userId || '';
  const widgetId = 'lanyard-' + widget.id;
  return `<div id="${widgetId}" style="${style} display:flex; align-items:center; justify-content:center; gap:12px; overflow:hidden; color:#fff;"></div>
  <script>
    (async function(){
      const c = document.getElementById('${widgetId}');
      try {
        const r = await fetch('https://api.lanyard.rest/v1/users/${userId}');
        const d = await r.json();
        if (!d.success) throw new Error();
        const u = d.data;
        let html = '';
        if (${s.showStatus}) {
          const status = u.discord_status;
          html += '<span style="font-size:0.9rem;">' + status + '</span>';
        }
        if (${s.showGame} && u.activities) {
          const game = u.activities.find(a => a.type === 0);
          if (game) html += '<span>🎮 ' + game.name + '</span>';
        }
        c.innerHTML = html || 'No data';
      } catch(e) { c.innerHTML = '❌'; }
    })();
  </script>`;
}

// ── Game Library (manual) ──
case 'game-library': {
  const games = s.games || [];
  return `<div style="${style} display:flex; flex-wrap:wrap; gap:8px; align-items:center; justify-content:center; overflow:hidden;">
    ${games.map(g => `<span style="background:rgba(255,255,255,0.15); padding:4px 10px; border-radius:12px; font-size:0.8rem; color:#fff;">${esc(g)}</span>`).join('')}
  </div>`;
}

// ── Audio Visualizer (Canvas) ──
case 'audio-visualizer': {
  const widgetId = 'viz-' + widget.id;
  return `<div style="${style} overflow:hidden;">
    <canvas id="${widgetId}-canvas" style="width:100%; height:100%;"></canvas>
    <audio id="${widgetId}-audio" src="${esc(s.src)}" style="display:none;"></audio>
    <script>
      (function(){
        const canvas = document.getElementById('${widgetId}-canvas');
        const ctx = canvas.getContext('2d');
        const audio = document.getElementById('${widgetId}-audio');
        const color = '${s.color}';
        const mode = '${s.mode}';
        let audioCtx, analyser, source;
        // … rest of visualizer code (bars/circle)
      })();
    </script>
  </div>`;
}
// (Include full visualizer JS – bars/rings reacting to audio)

    // ── Theme Switcher (fixed bottom‑right panel) ──
    case 'theme-switcher': {
      const themesCSS = {
        red: `*:not([class*="a-f"]):not([class*="0-9"]){background-color:#2d0000!important;color:#ffcccc!important;border-color:#550000!important}a{color:#ff6666!important}`,
        blue: `*:not([class*="a-f"]):not([class*="0-9"]){background-color:#001a33!important;color:#aaccff!important;border-color:#003366!important}a{color:#66aaff!important}`,
        purple: `*:not([class*="a-f"]):not([class*="0-9"]){background-color:#1a0033!important;color:#ddbbff!important;border-color:#400060!important}a{color:#cc99ff!important}`,
        green: `*:not([class*="a-f"]):not([class*="0-9"]){background-color:#002200!important;color:#99dd99!important;border-color:#005500!important}a{color:#66cc66!important}`,
        white: `*:not([class*="a-f"]):not([class*="0-9"]){background-color:#ffffff!important;color:#111!important;border-color:#cccccc!important}a{color:#555!important}`,
        black: `*:not([class*="a-f"]):not([class*="0-9"]){background-color:#000000!important;color:#cccccc!important;border-color:#333!important}a{color:#888!important}`,
      };
      const activeThemes = s.themes || ['red', 'blue'];
      let panelHTML = `<div id="theme-panel" style="position:fixed; bottom:20px; right:20px; z-index:99999; background:rgba(18,18,18,0.9); backdrop-filter:blur(12px); border:1px solid rgba(192,192,192,0.2); border-radius:16px; padding:12px; color:#e0e0e0; font-family:Inter,sans-serif; width:200px; box-shadow:0 10px 25px rgba(0,0,0,0.7);">
        <h3 style="font-size:14px;margin:0 0 8px;color:#fff;">Theme</h3>
        <button onclick="document.getElementById('theme-panel').remove()" style="position:absolute;top:6px;right:8px;background:none;border:none;color:#888;cursor:pointer;font-size:16px;">✕</button>`;
      activeThemes.forEach(theme => {
        panelHTML += `<button onclick="document.getElementById('cw-theme-style')?.remove();var s=document.createElement('style');s.id='cw-theme-style';s.textContent=\`${themesCSS[theme]}\`;document.head.appendChild(s);" style="display:block;width:100%;margin:4px 0;padding:6px 10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#c0c0c0;border-radius:8px;cursor:pointer;font-size:12px;">${theme}</button>`;
      });
      panelHTML += `</div>`;
      return panelHTML;
    }

    default:
      return `<div style="${style} border:1px dashed #ccc; display:flex; align-items:center; justify-content:center; overflow:hidden;">${widget.type}</div>`;
  }
}

// ─── MAIN HANDLER ─────────────────────────
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
      res.status(404).send('<h1>User not found</h1>');
      return;
    }
    const user = userRes.rows[0];

    const layoutRes = await pool.query('SELECT layout_data FROM profiles WHERE user_id = $1', [user.id]);
    const data = layoutRes.rows[0]?.layout_data || { layout: [], settings: {} };
    const widgets = data.layout || [];
    const settings = data.settings || {};

    let globalStyles = '';
    if (settings.cursor) globalStyles += `body{cursor:url('${settings.cursor}'),auto;}`;
    if (settings.favicon) globalStyles += `<link rel="icon" href="${settings.favicon}">`;

    // ── Background engine ──
    let bodyStyle = '';
    if (settings.background && settings.background.value) {
      const bg = settings.background;
      const raw = bg.value.trim();
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

    // ── Global Click‑to‑Enter overlay ──
    let clickEnterHTML = '';
    if (settings.clickToEnter) {
      clickEnterHTML = `<div id="globalClickEnter" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; cursor:pointer;"><h2 style="color:#fff;">Click anywhere to enter</h2></div>
      <script>document.getElementById('globalClickEnter').addEventListener('click', function(){ this.remove(); });</script>`;
    }

    const widgetsHTML = widgets.map(w => renderWidget(w)).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${user.username} — Chromaticc</title>${globalStyles}
<style>body{margin:0;overflow:hidden;font-family:Inter,sans-serif;}</style>
</head>
<body style="${bodyStyle}">
  ${clickEnterHTML}
  <div class="profile-canvas" style="background: transparent !important; width:100vw; height:100vh; position:relative;">
    ${widgetsHTML}
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}
