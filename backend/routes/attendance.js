const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// Haversine distance in meters
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /api/attendance/mark - Mark attendance (student only)
router.post('/mark', auth(['student']), async (req, res) => {
  try {
    const { session_code, lat, lng } = req.body;
    const studentId = req.user.id;

    if (!session_code) {
      return res.status(400).json({ error: 'Session code is required' });
    }

    // 1. Check session exists
    const sessionResult = await pool.query(
      `SELECT s.*, c.name as course_name FROM sessions s
       JOIN courses c ON s.course_id = c.id
       WHERE s.session_code = $1`,
      [session_code.toUpperCase()]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid session code' });
    }

    const session = sessionResult.rows[0];

    // 2. Check session is active
    if (!session.is_active) {
      return res.status(400).json({ error: 'This session has ended' });
    }

    // 3. Check student is enrolled
    const enrollment = await pool.query(
      'SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2',
      [session.course_id, studentId]
    );

    if (enrollment.rows.length === 0) {
      return res.status(403).json({ error: 'You are not enrolled in this course' });
    }

    // 4. Check no duplicate
    const duplicate = await pool.query(
      'SELECT id FROM attendance WHERE student_id = $1 AND session_id = $2',
      [studentId, session.id]
    );

    if (duplicate.rows.length > 0) {
      return res.status(409).json({ error: 'Attendance already marked for this session' });
    }

    // 5. Geolocation check if session has location
    if (session.location_lat && session.location_lng && session.location_radius) {
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Your location is required for this session' });
      }

      const distance = haversineDistance(
        session.location_lat, session.location_lng,
        parseFloat(lat), parseFloat(lng)
      );

      if (distance > session.location_radius) {
        return res.status(403).json({
          error: `You are too far from the session location (${Math.round(distance)}m away, max ${session.location_radius}m)`
        });
      }
    }

    // 6. Determine status (late if >15 min after start)
    const minutesSinceStart = (Date.now() - new Date(session.started_at).getTime()) / 60000;
    const status = minutesSinceStart > 15 ? 'late' : 'present';

    const ip = req.ip || req.connection.remoteAddress;

    const result = await pool.query(
      `INSERT INTO attendance (student_id, session_id, course_id, ip, lat, lng, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [studentId, session.id, session.course_id, ip, lat || null, lng || null, status]
    );

    res.status(201).json({
      ...result.rows[0],
      course_name: session.course_name,
      session_title: session.title,
    });
  } catch (err) {
    console.error('Mark attendance error:', err);
    res.status(500).json({ error: 'Server error marking attendance' });
  }
});

// GET /api/attendance/session/:sessionId - Get attendance for session (teacher + admin)
router.get('/session/:sessionId', auth(['teacher', 'admin']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, u.name as student_name, u.email as student_email, u.student_id as student_code
      FROM attendance a
      JOIN users u ON a.student_id = u.id
      WHERE a.session_id = $1
      ORDER BY a.marked_at
    `, [req.params.sessionId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get session attendance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/attendance/my - Get my attendance (student)
router.get('/my', auth(['student']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*, s.title as session_title, s.session_code, s.started_at as session_started_at,
             c.name as course_name, c.code as course_code
      FROM attendance a
      JOIN sessions s ON a.session_id = s.id
      JOIN courses c ON a.course_id = c.id
      WHERE a.student_id = $1
      ORDER BY a.marked_at DESC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get my attendance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/attendance/manual - Manual attendance (teacher + admin, upsert)
router.post('/manual', auth(['teacher', 'admin']), async (req, res) => {
  try {
    const { student_id, session_id, course_id, status } = req.body;

    if (!student_id || !session_id || !course_id || !status) {
      return res.status(400).json({ error: 'student_id, session_id, course_id, and status are required' });
    }

    const result = await pool.query(
      `INSERT INTO attendance (student_id, session_id, course_id, status, ip)
       VALUES ($1, $2, $3, $4, 'manual')
       ON CONFLICT (student_id, session_id)
       DO UPDATE SET status = $4, marked_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [student_id, session_id, course_id, status]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Manual attendance error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
