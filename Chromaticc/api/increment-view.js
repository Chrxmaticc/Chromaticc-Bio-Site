import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
});

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const userRes = await pool.query('SELECT id FROM users WHERE token = $1', [token]);
    if (userRes.rows.length === 0) return res.status(401).json({ error: 'Invalid token' });
    const userId = userRes.rows[0].id;

    if (req.method === 'POST') {
      // Increment view count (called from the profile page)
      const { username } = req.body;
      if (!username) return res.status(400).json({ error: 'Username required' });
      await pool.query(
        `INSERT INTO profiles (user_id, layout_data) VALUES ($1, '{}'::jsonb)
         ON CONFLICT (user_id) DO UPDATE SET view_count = COALESCE(profiles.view_count, 0) + 1`,
        [userId]
      );
      const result = await pool.query('SELECT view_count FROM profiles WHERE user_id = $1', [userId]);
      return res.status(200).json({ count: result.rows[0]?.view_count || 1 });
    } else if (req.method === 'GET') {
      // Just read the view count (called from the dashboard)
      const result = await pool.query('SELECT view_count FROM profiles WHERE user_id = $1', [userId]);
      return res.status(200).json({ count: result.rows[0]?.view_count || 0 });
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
