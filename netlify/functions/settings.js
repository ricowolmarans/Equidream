// GET /api/settings – public settings (shipping rate etc.)
const { getDb } = require('./db');

exports.handler = async function (event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const db = getDb();
    const result = await db.execute(`SELECT key, value FROM settings`);

    const settings = {};
    for (const row of result.rows) {
      settings[row.key] = row.value;
    }

    // Defaults
    if (!settings.shipping_flat_rate) settings.shipping_flat_rate = '150';

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    };
  } catch (err) {
    // Tables may not exist yet
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shipping_flat_rate: '150' })
    };
  }
};
