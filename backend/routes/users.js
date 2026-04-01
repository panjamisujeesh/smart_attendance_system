const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const auth = require('../middleware/auth');

// POST /api/users - Create user (admin only)
router.post('/', auth(['admin']), async (req, res) => {
  try {
    const { name, email, password, role, student_id } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role, student_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, student_id, created_at',
      [name, email, hashedPassword, role, student_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create user error:', err);
    res.status(500).json({ error: 'Server error creating user' });
  }
});

// GET /api/users - List all users (admin only)
router.get('/', auth(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, student_id, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Server error listing users' });
  }
});

// GET /api/users/students - List students (admin + teacher)
router.get('/students', auth(['admin', 'teacher']), async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, student_id, created_at FROM users WHERE role = 'student' ORDER BY name"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List students error:', err);
    res.status(500).json({ error: 'Server error listing students' });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', auth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, student_id } = req.body;

    const result = await pool.query(
      'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), role = COALESCE($3, role), student_id = COALESCE($4, student_id) WHERE id = $5 RETURNING id, name, email, role, student_id, created_at',
      [name, email, role, student_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error updating user' });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: 'Server error deleting user' });
  }
});

module.exports = router;
