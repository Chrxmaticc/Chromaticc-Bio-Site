import { Pool } from 'pg';
import crypto from 'crypto'; // not used here, but available

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const path = new URL(req.url, `http://${req.headers.host}`).pathname;
  const username = path.slice(1).toLowerCase();

  if (!username) {
    res.writeHead(302, { Location: '/index.html' });
    return res.end();
  }

  // Check for token (from cookie or Authorization header)
  let token = req.cookies?.token;
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  try {
    const userResult = await pool.query(
      'SELECT username FROM users WHERE LOWER(username) = $1',
      [username]
    );
    if (userResult.rows.length === 0) {
      res.status(404).send('<h1>User not found</h1>');
      return;
    }
    const user = userResult.rows[0];

    // If the user is viewing their own profile (optional check)
    if (token) {
      const tokenOwner = await pool.query(
        'SELECT username FROM users WHERE token = $1',
        [token]
      );
      if (tokenOwner.rows.length > 0 && tokenOwner.rows[0].username.toLowerCase() === username) {
        // Logged‑in owner – maybe show edit options later
      }
    }

    // Build profile page (use your goofy template)
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${user.username} — Chromaticc</title></head>
<body style="background:#111;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:Inter,sans-serif;">
  <div style="background:rgba(255,255,255,0.1);backdrop-filter:blur(12px);padding:40px;border-radius:28px;text-align:center;">
    <h1 style="font-size:3rem;">${user.username}</h1>
    <p>@${user.username}</p>
    <a href="/" style="color:#c0c0c0;">Back home</a>
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
