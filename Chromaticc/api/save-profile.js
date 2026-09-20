import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No auth' });
  const token = auth.slice(7);

  const { profile } = req.body || {};
  if (!profile || typeof profile !== 'object') return res.status(400).json({ error: 'No profile data' });

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE token = $1 LIMIT 1', [token]);
    if (!userRes.rows[0]) return res.status(401).json({ error: 'Invalid token' });

    await pool.query(
      'UPDATE users SET profile_data = $1 WHERE id = $2',
      [JSON.stringify(profile), userRes.rows[0].id]
    );

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[save-profile] error:', err);
    res.status(500).json({ error: err.message });
  }
}
