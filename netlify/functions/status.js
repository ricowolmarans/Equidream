// GET /api/status – check if system is initialized (has at least one admin)
const { getDb } = require('./db');

exports.handler = async function () {
  try {
    const db = getDb();

    // Check if users table exists and has an admin
    let initialized = false;
    try {
      const result = await db.execute(
        `SELECT COUNT(*) as count FROM users WHERE role = 'admin'`
      );
      initialized = result.rows[0].count > 0;
    } catch (e) {
      // Table doesn't exist yet
      initialized = false;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialized })
    };
  } catch (err) {
    console.error('status error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: err.message || 'Database connection failed',
        initialized: false
      })
    };
  }
};
