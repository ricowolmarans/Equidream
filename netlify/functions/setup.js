// POST /api/setup – first-time admin creation + table init
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, initTables } = require('./db');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
      };
    }

    const db = getDb();

    // Create tables
    await initTables(db);

    // Check if an admin already exists
    const existing = await db.execute(
      `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
    );

    if (existing.rows.length > 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Admin already exists. Please login instead.' })
      };
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12);

    // Create first admin
    const result = await db.execute({
      sql: `INSERT INTO users (email, password_hash, role, name) VALUES (?, ?, 'admin', 'Store Owner')`,
      args: [email.toLowerCase().trim(), password_hash]
    });

    const userId = Number(result.lastInsertRowid);

    // Create JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }

    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), role: 'admin' },
      secret,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        user: {
          id: userId,
          email: email.toLowerCase().trim(),
          role: 'admin',
          name: 'Store Owner'
        }
      })
    };
  } catch (err) {
    console.error('setup error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Setup failed' })
    };
  }
};
