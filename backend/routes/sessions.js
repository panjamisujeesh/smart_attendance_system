const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

function generateSessionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// POST /api/sessions/start - Start a session (teacher + admin)
router.post('/start', auth(['teacher', 'admin']), async (req, res) => {
  try {
    const { course_id, title, location_lat, location_lng, location_radius } = req.body;

    if (!course_id) {
      return res.status(400).json({ error: 'course_id is required' });
    }

    // Verify course exists
    const course = await pool.query('SELECT * FROM courses WHERE id = $1', [course_id]);
    if (course.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Generate unique session code
    let sessionCode;
    let codeExists = true;
    while (codeExists) {
      sessionCode = generateSessionCode();
      const check = await pool.query('SELECT id FROM sessions WHERE session_code = $1', [sessionCode]);
      codeExists = check.rows.length > 0;
    }

    const result = await pool.query(
      `INSERT INTO sessions (course_id, session_code, title, location_lat, location_lng, location_radius)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [course_id, sessionCode, title || 'Untitled Session', location_lat || null, location_lng || null, location_radius || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Start session error:', err);
    res.status(500).json({ error: 'Server error starting session' });
  }
});

// PUT /api/sessions/:id/end - End a session
router.put('/:id/end', auth(['teacher', 'admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE sessions SET is_active = FALSE, ended_at = CURRENT_TIMESTAMP WHERE id = $1 AND is_active = TRUE RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Active session not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('End session error:', err);
    res.status(500).json({ error: 'Server error ending session' });
  }
});

// GET /api/sessions/course/:courseId - Get sessions for a course
router.get('/course/:courseId', auth(), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT s.*, c.name as course_name, c.code as course_code,
        (SELECT COUNT(*) FROM attendance WHERE session_id = s.id) as attendance_count
       FROM sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.course_id = $1
       ORDER BY s.started_at DESC`,
      [req.params.courseId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/active - Get all active sessions
router.get('/active', auth(), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.name as course_name, c.code as course_code,
        (SELECT COUNT(*) FROM attendance WHERE session_id = s.id) as attendance_count
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.is_active = TRUE
      ORDER BY s.started_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Get active sessions error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sessions/code/:code - Get session by code
router.get('/code/:code', auth(), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, c.name as course_name, c.code as course_code
      FROM sessions s
      JOIN courses c ON s.course_id = c.id
      WHERE s.session_code = $1
    `, [req.params.code.toUpperCase()]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get session by code error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
