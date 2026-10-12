// Admin settings: GET all | PUT update
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

function requireAdmin(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { error: 'Unauthorized', status: 401 };
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'admin') return { error: 'Admin only', status: 403 };
    return { payload };
  } catch {
    return { error: 'Invalid token', status: 401 };
  }
}

exports.handler = async function (event) {
  const auth = requireAdmin(event);
  if (auth.error) {
    return {
      statusCode: auth.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: auth.error })
    };
  }

  const db = getDb();
  const method = event.httpMethod;

  try {
    if (method === 'GET') {
      const result = await db.execute(`SELECT key, value FROM settings`);
      const settings = {};
      for (const row of result.rows) {
        settings[row.key] = row.value;
      }
      // Defaults
      if (!settings.shipping_flat_rate) settings.shipping_flat_rate = '150';
      if (!settings.bank_name) settings.bank_name = '';
      if (!settings.bank_account_name) settings.bank_account_name = '';
      if (!settings.bank_account_number) settings.bank_account_number = '';
      if (!settings.bank_branch_code) settings.bank_branch_code = '';

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      };
    }

    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const allowed = [
        'shipping_flat_rate',
        'bank_name',
        'bank_account_name',
        'bank_account_number',
        'bank_branch_code'
      ];

      for (const key of allowed) {
        if (body[key] !== undefined) {
          await db.execute({
            sql: `INSERT INTO settings (key, value) VALUES (?, ?)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
            args: [key, String(body[key])]
          });
        }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Settings saved' })
      };
    }

    return { statusCode: 405, body: 'Method Not Allowed' };
  } catch (err) {
    console.error('admin-settings error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Server error' })
    };
  }
};
