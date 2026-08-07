import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Basic HTML template – you can make this as goofy as index.html later
function generateProfilePage(user) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${user.username} — Chromaticc Profile</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Inter', sans-serif;
      background: linear-gradient(180deg, #fff, #e0e0e0, #808080, #1a1a1a);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #000;
    }
    .profile-card {
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 28px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }
    h1 {
      font-size: 3rem;
      background: linear-gradient(135deg, #000, #fff, #444);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .username { font-size: 1.2rem; color: #000; margin: 10px 0 20px; }
    .links a {
      display: inline-block;
      margin: 0 10px;
      padding: 8px 20px;
      background: rgba(0,0,0,0.1);
      border-radius: 20px;
      color: #000;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="profile-card">
    <h1>${user.username}</h1>
    <p class="username">@${user.username}</p>
    <div class="links">
      <a href="/">Home</a>
      <a href="/accounts.html">Account</a>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  // Get the original URL path (e.g., /chrxmaticc)
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;
  const username = path.slice(1).toLowerCase(); // remove leading slash

  if (!username || username === '') {
    // You could redirect to index.html or show a landing page
    res.writeHead(302, { Location: '/index.html' });
    return res.end();
  }

  try {
    const result = await pool.query(
      'SELECT username FROM users WHERE LOWER(username) = $1',
      [username]
    );

    if (result.rows.length === 0) {
      res.status(404).send('<h1>User not found</h1>');
      return;
    }

    const user = result.rows[0];
    const html = generateProfilePage(user);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}
