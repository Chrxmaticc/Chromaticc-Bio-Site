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
    case 'text':
      return `<div style="${style} font-size:${s.fontSize}px; color:${s.color}; font-weight:${s.bold ? 'bold' : 'normal'}; font-style:${s.italic ? 'italic' : 'normal'}; text-align:${s.align || 'left'}; font-family:${s.fontFamily || 'Inter'}; overflow:hidden;">${esc(s.content)}</div>`;

    case 'gradient-text':
      return `<div style="${style} font-size:${s.fontSize}px; background:${s.gradient}; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; font-family:${s.fontFamily || 'Inter'}; overflow:hidden;">${esc(s.content)}</div>`;

    case 'neon-text':
      return `<div style="${style} font-size:${s.fontSize}px; color:${s.color}; text-shadow: 0 0 10px ${s.color}, 0 0 20px ${s.color}; overflow:hidden;">${esc(s.content)}</div>`;

    case 'marquee-text':
      return `<marquee behavior="scroll" direction="left" scrollamount="${s.speed}" style="${style}">${esc(s.content)}</marquee>`;

    case 'image':
      return `<img src="${esc(s.src)}" alt="${esc(s.alt)}" style="${style} object-fit:${s.objectFit || 'cover'}; border-radius:12px;">`;

    case 'video':
      return `<video src="${esc(s.src)}" ${s.controls ? 'controls' : ''} ${s.autoplay ? 'autoplay' : ''} ${s.loop ? 'loop' : ''} style="${style} border-radius:12px;"></video>`;

    case 'audio':
      return `<div style="${style} display:flex; flex-direction:column; justify-content:center;"><strong>${esc(s.title || 'Track')}</strong><audio controls src="${esc(s.src)}" style="width:100%;"></audio></div>`;

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

    case 'clock':
      return `<div style="${style} display:flex; align-items:center; justify-content:center; font-size:${s.fontSize || 24}px; font-weight:bold;" id="clock-${widget.id}"></div><script>(function(){const el=document.getElementById('clock-${widget.id}');setInterval(()=>{el.textContent=new Date().toLocaleTimeString('en-US',{hour12:${s.format==='12h'},second:${s.showSeconds}});},1000);})();</script>`;

    case 'badges':
      const badges = s.badges || ['OG', 'Beta'];
      return `<div style="${style} display:flex; flex-wrap:wrap; gap:6px; align-items:center;">${badges.map(b => `<span style="background:#000;color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;">${esc(b)}</span>`).join('')}</div>`;

    case 'shape':
      const shapeStyle = s.shape === 'circle' ? 'border-radius:50%;' : '';
      return `<div style="${style} background:${s.color}; ${shapeStyle}"></div>`;

    case 'divider':
      return `<hr style="${style} border-top:2px ${s.style} ${s.color}; width:${s.widthPercent || 100}%; margin:0; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%);">`;

    case 'social-link':
      return `<a href="${esc(s.url)}" target="_blank" style="${style} display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.2); border-radius:12px; text-decoration:none; color:#000; font-weight:600;">${esc(s.label)}</a>`;

    case 'link-embed':
      return `<a href="${esc(s.url)}" target="_blank" style="${style} display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.2); border-radius:12px; text-decoration:none; color:#000; padding:8px;">${esc(s.title)}</a>`;

    case 'lyric-sync':
      return `<div style="${style} display:flex; flex-direction:column; overflow:auto;"><audio controls src="${esc(s.audioUrl)}" style="width:100%;"></audio><pre style="margin:0; font-size:0.8rem;">${esc(s.lrc || 'No lyrics')}</pre></div>`;

    case 'click-enter':
      return `<div id="clickEnter" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999; cursor:pointer;"><h2 style="color:#fff;">${esc(s.message || 'Click to enter')}</h2></div><script>document.getElementById('clickEnter').addEventListener('click',function(){this.remove();});</script>`;

    case 'custom-cursor':
      return `<style>body{cursor:url('${esc(s.url)}'),auto;}</style>`;

    case 'volume-control':
      return `<input type="range" min="0" max="100" value="80" style="${style}" oninput="document.querySelectorAll('audio').forEach(a=>a.volume=this.value/100)">`;

    case 'glass-toggle':
      return `<style>body .canvas-widget { backdrop-filter:blur(${s.enabled ? '12px' : '0px'}); }</style>`;

    case 'overlay-effect':
      return `<div style="position:fixed; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:999; ${s.effect === 'rain' ? 'background:url(data:image/svg+xml,...);' : ''}${s.effect === 'sparkles' ? 'animation: sparkle 2s infinite;' : ''}"></div>`;

    case 'background':
      return `<style>body{background:${s.type === 'gradient' ? s.value : `url(${s.value}) center/cover fixed`};}</style>`;

    case 'bg-animation':
      return `<style>body::before{content:'';position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:-1;background:url('data:image/svg+xml,...');}</style>`;

    case 'code':
      return `<div>${s.html || ''}<style>${s.css || ''}</style><script>${s.js || ''}<\/script></div>`;

    case 'font-selector':
      return `<style>body * { font-family: '${s.font}', sans-serif; }</style>`;

    case 'ttf-upload':
      return ``; // handled by font-selector or custom CSS

    case 'page-indicator':
      return `<div style="${style} display:flex; align-items:center; justify-content:center; font-size:0.9rem; color:#666;">Page ${s.current} of ${s.total}</div>`;

    default:
      return `<div style="${style} border:1px dashed #ccc; display:flex; align-items:center; justify-content:center; overflow:hidden;">${widget.type}</div>`;
  }
}

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

    // Background handling (no more double‑wrapping)
    if (settings.background && settings.background.value) {
      const bg = settings.background;
      if (bg.type === 'image' || bg.type === 'video') {
        // value is a raw URL (no url() wrapper) – we wrap it safely
        const cleanUrl = bg.value.replace(/^url\(['"]?|['"]?\)$/g, '');
        globalStyles += `body{background:url('${cleanUrl}') center/cover fixed;}`;
      } else {
        // CSS gradient/color – use exactly as stored
        globalStyles += `body{background:${bg.value};}`;
      }
    }
    if (settings.cursor) globalStyles += `body{cursor:url('${settings.cursor}'),auto;}`;
    if (settings.favicon) globalStyles += `<link rel="icon" href="${settings.favicon}">`;

    const widgetsHTML = widgets.map(w => renderWidget(w)).join('\n');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${user.username} — Chromaticc</title>
${globalStyles}
<style>
  body { margin:0; padding:0; overflow-x:hidden; font-family: 'Inter', sans-serif; }
  .profile-canvas { position:relative; width:100vw; height:100vh; }
</style>
</head>
<body>
  <div class="profile-canvas">${widgetsHTML}</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}
