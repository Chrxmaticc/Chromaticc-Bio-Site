import { Pool } from 'pg';
import crypto from 'crypto';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

// Simple profile page (replace with your full design later)
function profilePage(user) {
  return `<!DOCTYPE html>
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
}

// Sandbox edit page (placeholder – you’ll expand this later)
function editPage(user) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Edit ${user.username} — Chromaticc</title></head>
<body style="background:#000;color:#fff;font-family:Inter,sans-serif;padding:40px;">
  <h1>Editing <span style="color:#c0c0c0;">${user.username}</span></h1>
  <p>Toolbar + drag & drop coming soon. You can code here.</p>
  <a href="/${user.username}" style="color:#c0c0c0;">Back to profile</a>
</body>
</html>`;
}

export default async function handler(req, res) {
  // Get path and split it
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.toLowerCase(); // e.g., "/chrxmaticc/edit"
  const parts = path.split('/').filter(Boolean); // ['chrxmaticc', 'edit'] or ['chrxmaticc']

  if (parts.length === 0) {
    // root path, redirect to home
    res.writeHead(302, { Location: '/index.html' });
    return res.end();
  }

  const username = parts[0];
  const action = parts[1] || 'profile'; // 'profile' or 'edit'

  // Check if user exists
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

    // If action is 'edit', we need to verify the requester is the owner
    if (action === 'edit') {
      // Get token from cookie or Authorization header
      let token = req.cookies?.token;
      const authHeader = req.headers.authorization;
      if (!token && authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }

      // Not logged in? redirect to login
      if (!token) {
        res.writeHead(302, { Location: '/accounts.html' });
        return res.end();
      }

      // Verify token belongs to this user
      const tokenCheck = await pool.query(
        'SELECT username FROM users WHERE token = $1',
        [token]
      );
      if (tokenCheck.rows.length === 0 || tokenCheck.rows[0].username.toLowerCase() !== username) {
        res.status(403).send('<h1>Forbidden – you can only edit your own profile</h1>');
        return;
      }

      // Token valid → show edit page
      const html = editPage(user);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    }

    // Default: show public profile page
    const html = profilePage(user);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}
