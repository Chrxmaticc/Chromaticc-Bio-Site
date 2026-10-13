// api/get-badges.js
import { Pool } from 'pg';
import { requireAuth } from './_auth.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function computeBadges(userId) {
  // manual badges (admin-granted)
  const manualR = await pool.query(
    'SELECT badge_id FROM user_badges WHERE user_id = $1',
    [userId]
  );
  const manual = manualR.rows.map(r => r.badge_id);

  // user profile + discord
  const userR = await pool.query(
    'SELECT profile_data, discord_id FROM users WHERE id = $1',
    [userId]
  );
  const row = userR.rows[0] || {};
  const profile = typeof row.profile_data === 'string'
    ? (() => { try { return JSON.parse(row.profile_data); } catch (e) { return {}; } })()
    : (row.profile_data || {});
  const discordId = row.discord_id || profile.discordId;

  // layout (for coder check)
  const layoutR = await pool.query(
    'SELECT layout_data FROM profiles WHERE user_id = $1',
    [userId]
  );
  let layout = [];
  try {
    const ld = typeof layoutR.rows[0]?.layout_data === 'string'
      ? JSON.parse(layoutR.rows[0].layout_data)
      : (layoutR.rows[0]?.layout_data || {});
    layout = ld.layout || [];
  } catch (e) {}

  const auto = new Set();
  auto.add('bot'); // default for everyone

  if (discordId) auto.add('discord-member');

  if (JSON.stringify(layout).includes('"type":"code"')) auto.add('coder');

  const socials = Array.isArray(profile.socials) ? profile.socials : [];
  if (socials.some(s => /github\.com/i.test(s.url || ''))) auto.add('developer');

  if (profile.hidden && profile.hidden.enabled) auto.add('hidden');

  // union
  const all = new Set([...manual, ...auto]);
  return Array.from(all);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });

  const session = await requireAuth(req, res);
  if (!session) return;

  try {
    const badges = await computeBadges(session.user.id);
    return res.status(200).json({ badges });
  } catch (err) {
    console.error('[get-badges]', err.message);
    return res.status(500).json({ error: err.message });
  }
}
