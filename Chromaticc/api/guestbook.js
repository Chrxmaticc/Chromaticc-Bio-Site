import { Pool } from 'pg';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { username } = req.query;
    try {
      const result = await pool.query('SELECT messages FROM profiles WHERE user_id = $1', [username]);
      const messages = result.rows[0]?.messages || [];
      return res.status(200).json(messages);
    } catch { return res.status(500).json({ error: 'Server error' }); }
  }

  if (req.method === 'POST') {
    const { username, text, author } = req.body;
    if (!username || !text) return res.status(400).json({ error: 'Missing fields' });
    try {
      const newMsg = { text, author: author || 'Anonymous', date: new Date().toISOString() };
      await pool.query(
        `INSERT INTO profiles (user_id, layout_data) VALUES ($1, '{}'::jsonb)
         ON CONFLICT (user_id) DO UPDATE SET messages = COALESCE(profiles.messages, '[]'::jsonb) || $2::jsonb`,
        [username, JSON.stringify([newMsg])]
      );
      return res.status(200).json({ success: true });
    } catch { return res.status(500).json({ error: 'Server error' }); }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
