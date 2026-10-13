import { getSession } from './_auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.status(204).end();
  }

  const session = await getSession(req);
  if (!session) return res.status(401).json({ valid: false });

  return res.status(200).json({
    valid: true,
    user: {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      createdAt: session.user.created_at
    }
  });
}
