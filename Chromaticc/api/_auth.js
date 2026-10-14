// api/_auth.js
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

function readToken(req) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7).trim();
  if (req.headers.cookie) {
    const m = req.headers.cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (m) return decodeURIComponent(m[1]);
  }
  return null;
}

export async function getSession(req) {
  const token = readToken(req);
  if (!token) return null;

  // Primary: sessions table
  try {
    const r = await pool.query(
      `SELECT u.id, u.username, u.email, u.created_at, s.token, s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW()
       LIMIT 1`,
      [token]
    );
    if (r.rows.length) return { user: r.rows[0], token };
  } catch (err) {
    console.error('[auth] session lookup failed:', err.message);
  }

  // Fallback: users.token column
  try {
    const r = await pool.query(
      'SELECT id, username, email, created_at, token FROM users WHERE token = $1 LIMIT 1',
      [token]
    );
    if (r.rows.length) {
      // Auto-repair: if sessions row is missing but user.token matches, create it
      try {
        await pool.query(
          `INSERT INTO sessions (token, user_id, user_agent, ip)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (token) DO NOTHING`,
          [token, r.rows[0].id, (req.headers['user-agent'] || '').slice(0, 200), null]
        );
      } catch (e) { /* silent */ }
      return { user: r.rows[0], token };
    }
  } catch (err) {
    console.error('[auth] fallback lookup failed:', err.message);
  }

  return null;
}

export async function requireAuth(req, res) {
  const session = await getSession(req);
  if (!session) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(401).json({ message: 'Invalid or expired token' });
    return null;
  }
  return session;
}

export function readRawToken(req) {
  return readToken(req);
}
