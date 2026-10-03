import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ valid: false });
  try {
    const r = await pool.query('SELECT id, username FROM users WHERE token = $1', [token]);
    if (!r.rows.length) return res.status(401).json({ valid: false });
    return res.status(200).json({ valid: true, user: r.rows[0] });
  } catch (e) {
    return res.status(500).json({ valid: false });
  }
}
