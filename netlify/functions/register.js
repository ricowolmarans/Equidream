// POST /api/register – customer registration
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { name, email, phone, password } = JSON.parse(event.body || '{}');

    if (!email || !password || !name) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Name, email and password are required' })
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

    // Check if email already exists
    const existing = await db.execute({
      sql: `SELECT id FROM users WHERE email = ?`,
      args: [email.toLowerCase().trim()]
    });

    if (existing.rows.length > 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'An account with this email already exists' })
      };
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await db.execute({
      sql: `INSERT INTO users (email, password_hash, name, phone, role) VALUES (?, ?, ?, ?, 'customer')`,
      args: [email.toLowerCase().trim(), password_hash, name.trim(), phone || null]
    });

    const userId = Number(result.lastInsertRowid);
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not set');

    const token = jwt.sign(
      { id: userId, email: email.toLowerCase().trim(), role: 'customer' },
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
          name: name.trim(),
          phone: phone || null,
          role: 'customer'
        }
      })
    };
  } catch (err) {
    console.error('register error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message || 'Registration failed' })
    };
  }
};
