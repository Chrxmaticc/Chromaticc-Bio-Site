import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

// Helper: escape HTML
function esc(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Render a single widget into HTML
function renderWidget(widget) {
  const s = widget.settings || {};
  switch (widget.type) {
    case 'text':
      return `<div style="font-size:${s.fontSize}px; color:${s.color}; ${s.bold ? 'font-weight:bold;' : ''}">${esc(s.content)}</div>`;
    case 'gradient-text':
      return `<div style="font-size:${s.fontSize}px; background:${s.gradient}; -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">${esc(s.content)}</div>`;
    case 'neon-text':
      return `<div style="font-size:${s.fontSize}px; color:${s.color}; text-shadow: 0 0 10px ${s.color}, 0 0 20px ${s.color};">${esc(s.content)}</div>`;
    case 'marquee-text':
      return `<marquee behavior="scroll" direction="left" scrollamount="${s.speed}">${esc(s.content)}</marquee>`;
    case 'image':
      return `<img src="${esc(s.url)}" alt="${esc(s.alt)}" style="max-width:100%; border-radius:12px;">`;
    case 'video':
      return `<video controls src="${esc(s.url)}" style="max-width:100%; border-radius:12px;"></video>`;
    case 'audio':
      return `<div><strong>${esc(s.title)}</strong><br><audio controls src="${esc(s.url)}" style="width:100%;"></audio></div>`;
    case 'youtube-embed':
      return `<iframe width="100%" height="200" src="https://www.youtube.com/embed/${esc(s.videoId)}" frameborder="0" allowfullscreen></iframe>`;
    case 'soundcloud':
      return `<iframe width="100%" height="166" src="https://w.soundcloud.com/player/?url=${encodeURIComponent(s.trackUrl)}" frameborder="0"></iframe>`;
    case 'spotify':
      return `<iframe src="https://open.spotify.com/embed/track/${esc(s.uri)}" width="100%" height="80" frameborder="0"></iframe>`;
    case 'discord':
      return `<iframe src="https://discord.com/widget?id=${esc(s.serverId)}&theme=dark" width="100%" height="300" frameborder="0"></iframe>`;
    case 'twitch':
      return `<iframe src="https://player.twitch.tv/?channel=${esc(s.channel)}&parent=chromaticc.vercel.app" width="100%" height="300" frameborder="0"></iframe>`;
    case 'github':
      return `<div class="github-card" data-user="${esc(s.username)}"></div><script src="//cdn.jsdelivr.net/github-cards/latest/widget.js"><\/script>`;
    case 'twitter':
      return `<a class="twitter-timeline" data-width="100%" data-height="300" href="https://twitter.com/${esc(s.username)}">Tweets</a><script async src="https://platform.twitter.com/widgets.js"><\/script>`;
    case 'clock':
      return `<div id="clock-${widget.id}" style="font-size:24px;font-weight:bold;"></div><script>setInterval(()=>{document.getElementById('clock-${widget.id}').textContent=new Date().toLocaleTimeString('en-US',{hour12:${s.format==='12h'}});},1000);</script>`;
    case 'shape':
      const shapeStyle = s.shape === 'circle' ? 'border-radius:50%;' : '';
      return `<div style="width:${s.size}px;height:${s.size}px;background:${s.color};${shapeStyle}"></div>`;
    case 'divider':
      return `<hr style="border-top:2px ${s.style} ${s.color}; width:${s.width}%; margin:10px auto;">`;
    case 'spacer':
      return `<div style="height:${s.height}px;"></div>`;
    case 'badges':
      const badges = s.badges || ['OG'];
      return `<div style="display:flex; gap:6px;">${badges.map(b => `<span style="background:#000;color:#fff;padding:4px 10px;border-radius:20px;font-size:12px;">${esc(b)}</span>`).join('')}</div>`;
    case 'link-embed':
      return `<a href="${esc(s.url)}" target="_blank" style="display:block; padding:10px; background:rgba(255,255,255,0.2); border-radius:12px; text-decoration:none; color:#000;">${esc(s.title)}</a>`;
    case 'social-link':
      return `<a href="${esc(s.url)}" target="_blank" style="display:inline-block; padding:8px 16px; background:rgba(0,0,0,0.1); border-radius:8px; text-decoration:none; color:#000;">${esc(s.platform)}</a>`;
    case 'code':
      return `<div>${s.html || ''}<style>${s.css || ''}</style><script>${s.js || ''}<\/script></div>`;
    case 'click-enter':
      return `<div id="clickEnter" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer;"><h2 style="color:#fff;">${esc(s.message || 'Click to enter')}</h2></div><script>document.getElementById('clickEnter').addEventListener('click',function(){this.remove();});</script>`;
    case 'custom-cursor':
      return `<style>body{cursor:url('${esc(s.url)}'),auto;}</style>`;
    case 'lyric-sync':
      return `<div><audio controls src="${esc(s.audioUrl)}"></audio><pre>${esc(s.lrc || 'No lyrics')}</pre></div>`;
    case 'volume-control':
      return `<input type="range" min="0" max="100" value="80" oninput="document.querySelectorAll('audio').forEach(a=>a.volume=this.value/100)">`;
    case 'background':
      return `<style>body{background:${s.type === 'gradient' ? s.value : (s.type === 'image' ? `url(${s.value}) center/cover` : s.value)};}</style>`;
    case 'bg-animation':
      return `<style>body::before{content:'';position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;background:url('${s.type === 'particles' ? 'data:image/svg+xml,...' : ''}');}</style>`;
    default:
      return `<div>${esc(widget.type)} widget</div>`;
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
    // Fetch user
    const userResult = await pool.query(
      'SELECT id, username FROM users WHERE LOWER(username) = $1',
      [username]
    );
    if (userResult.rows.length === 0) {
      res.status(404).send('<h1>User not found</h1>');
      return;
    }
    const user = userResult.rows[0];

    // Fetch layout
    const layoutRes = await pool.query(
      'SELECT layout_data FROM profiles WHERE user_id = $1',
      [user.id]
    );
    const layoutData = layoutRes.rows[0]?.layout_data || { layout: [], settings: {} };
    const widgets = layoutData.layout || [];
    const settings = layoutData.settings || {};

    // Build profile HTML
    const widgetHTML = widgets.map(w => {
      const style = `position:absolute; left:${w.x}px; top:${w.y}px; width:${w.width || 150}px; height:${w.height || 80}px; transform:rotate(${w.rotation || 0}deg);`;
      return `<div style="${style}">${renderWidget(w)}</div>`;
    }).join('\n');

    // Global page settings
    let globalStyles = '';
    if (settings.background) {
      if (settings.background.type === 'image') globalStyles += `body{background:url('${settings.background.value}') center/cover fixed;}`;
      else if (settings.background.type === 'gradient') globalStyles += `body{background:${settings.background.value};}`;
      else if (settings.background.type === 'video') globalStyles += `body::before{content:'';position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;background:black;overflow:hidden;}`;
    }
    if (settings.cursor) globalStyles += `body{cursor:url('${settings.cursor}'),auto;}`;
    if (settings.favicon) {
      globalStyles += `<link rel="icon" href="${settings.favicon}">`;
    }

    const profileHTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${user.username} — Chromaticc</title>
<link rel="icon" type="image/png" href="Chromaticc.png">
${globalStyles}
<style>
body { margin:0; font-family:Inter,sans-serif; color:#fff; overflow-x:hidden; }
.canvas { position:relative; width:100vw; min-height:100vh; }
</style>
</head>
<body>
<div class="canvas">
${widgetHTML}
</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(profileHTML);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}
