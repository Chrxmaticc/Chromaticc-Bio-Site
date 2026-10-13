import crypto from 'crypto';
import { pool } from './_auth.js';

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, key) => {
      if (err) reject(err);
      else resolve(salt + ':' + key.toString('hex'));
    });
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { username, email, password } = req.body || {};
  if (!username || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  if (!/^[a-zA-Z0-9_.-]{2,32}$/.test(username)) {
    return res.status(400).json({ message: 'Username: 2-32 chars, letters/numbers/._- only' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be 6+ characters' });
  }

  try {
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($2)',
      [username, email]
    );
    if (existing.rows.length) {
      return res.status(409).json({ message: 'Username or email already taken' });
    }

    const password_hash = await hashPassword(password);

    const created = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, created_at',
      [username, email, password_hash]
    );
    const user = created.rows[0];

    // seed empty profile row
    await pool.query(
      'INSERT INTO profiles (user_id, layout_data, view_count) VALUES ($1, $2, 0) ON CONFLICT (user_id) DO NOTHING',
      [user.id, JSON.stringify({ layout: [], settings: {} })]
    );

    const token = crypto.randomBytes(32).toString('hex');
    const userAgent = (req.headers['user-agent'] || '').slice(0, 200);
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 60);

    await pool.query(
      'INSERT INTO sessions (token, user_id, user_agent, ip) VALUES ($1, $2, $3, $4)',
      [token, user.id, userAgent, ip]
    );

    res.setHeader('Set-Cookie', `token=${token}; Path=/; SameSite=Lax; Max-Age=2592000`);

    return res.status(200).json({
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error('[signup] error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
