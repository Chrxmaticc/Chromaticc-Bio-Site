import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username } = req.body;   // this is the actual username, e.g., "chrxmaticc"
  if (!username) return res.status(400).json({ error: 'Username required' });

  try {
    // Find the user's internal ID
    const userRes = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const userId = userRes.rows[0].id;

    // Increment view count
    await pool.query(
      `INSERT INTO profiles (user_id, layout_data) VALUES ($1, '{}'::jsonb)
       ON CONFLICT (user_id) DO UPDATE SET view_count = COALESCE(profiles.view_count, 0) + 1`,
      [userId]
    );

    const result = await pool.query('SELECT view_count FROM profiles WHERE user_id = $1', [userId]);
    return res.status(200).json({ count: result.rows[0]?.view_count || 1 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
