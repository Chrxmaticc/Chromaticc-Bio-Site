// api/login.js
import crypto from 'crypto';
import { pool } from './_auth.js';

function verifyPassword(password, stored) {
  return new Promise((resolve, reject) => {
    const [salt, key] = stored.split(':');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(key === derivedKey.toString('hex'));
    });
  });
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const result = await pool.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1 OR email = $1',
      [username]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = crypto.randomBytes(32).toString('hex');
    const userAgent = (req.headers['user-agent'] || '').slice(0, 200);
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim().slice(0, 60) || null;

    // Write to BOTH places so either auth path works
    let sessionOk = false;
    try {
      await pool.query(
        `INSERT INTO sessions (token, user_id, user_agent, ip)
         VALUES ($1, $2, $3, $4)`,
        [token, user.id, userAgent, ip]
      );
      sessionOk = true;
    } catch (err) {
      console.error('[login] sessions insert failed:', err.message);
    }

    try {
      await pool.query('UPDATE users SET token = $1 WHERE id = $2', [token, user.id]);
    } catch (err) {
      console.error('[login] users.token update failed:', err.message);
      // If BOTH writes fail, this login is useless — bail loudly
      if (!sessionOk) return res.status(500).json({ message: 'Session write failed' });
    }

    // Opportunistic cleanup, fire and forget
    pool.query('DELETE FROM sessions WHERE user_id = $1 AND expires_at < NOW()', [user.id]).catch(() => {});

    const cookieSecure = req.headers.host && !req.headers.host.includes('localhost') ? '; Secure' : '';
    res.setHeader('Set-Cookie', `token=${token}; Path=/; SameSite=Lax; Max-Age=2592000${cookieSecure}`);

    return res.status(200).json({
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error('[login] error:', err.message);
    return res.status(500).json({ message: 'Internal server error' });
  }
}
