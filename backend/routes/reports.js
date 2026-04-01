const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/reports/course/:courseId - Attendance summary per student
router.get('/course/:courseId', auth(['teacher', 'admin']), async (req, res) => {
  try {
    const courseId = req.params.courseId;

    // Get total sessions for this course
    const sessionsResult = await pool.query(
      'SELECT COUNT(*) as total FROM sessions WHERE course_id = $1',
      [courseId]
    );
    const totalSessions = parseInt(sessionsResult.rows[0].total);

    // Get per-student attendance
    const result = await pool.query(`
      SELECT
        u.id,
        u.name,
        u.student_id,
        u.email,
        COUNT(CASE WHEN a.status = 'present' THEN 1 END) as present_count,
        COUNT(CASE WHEN a.status = 'late' THEN 1 END) as late_count,
        COUNT(a.id) as attended_count
      FROM course_enrollments ce
      JOIN users u ON ce.student_id = u.id
      LEFT JOIN attendance a ON a.student_id = u.id AND a.course_id = $1
      WHERE ce.course_id = $1
      GROUP BY u.id, u.name, u.student_id, u.email
      ORDER BY u.name
    `, [courseId]);

    const students = result.rows.map(s => ({
      ...s,
      present_count: parseInt(s.present_count),
      late_count: parseInt(s.late_count),
      attended_count: parseInt(s.attended_count),
      total_sessions: totalSessions,
      percentage: totalSessions > 0
        ? Math.round(((parseInt(s.present_count) + parseInt(s.late_count)) / totalSessions) * 100)
        : 0,
    }));

    res.json({ students, total_sessions: totalSessions, course_id: courseId });
  } catch (err) {
    console.error('Course report error:', err);
    res.status(500).json({ error: 'Server error generating report' });
  }
});

// GET /api/reports/dashboard - Role-aware dashboard stats
router.get('/dashboard', auth(), async (req, res) => {
  try {
    const { role, id } = req.user;
    const stats = {};

    if (role === 'admin') {
      const users = await pool.query('SELECT COUNT(*) as count FROM users');
      const courses = await pool.query('SELECT COUNT(*) as count FROM courses');
      const sessions = await pool.query('SELECT COUNT(*) as count FROM sessions');
      const attendance = await pool.query('SELECT COUNT(*) as count FROM attendance');
      const activeSessions = await pool.query('SELECT COUNT(*) as count FROM sessions WHERE is_active = TRUE');

      stats.total_users = parseInt(users.rows[0].count);
      stats.total_courses = parseInt(courses.rows[0].count);
      stats.total_sessions = parseInt(sessions.rows[0].count);
      stats.total_attendance = parseInt(attendance.rows[0].count);
      stats.active_sessions = parseInt(activeSessions.rows[0].count);
    } else if (role === 'teacher') {
      const courses = await pool.query('SELECT COUNT(*) as count FROM courses WHERE teacher_id = $1', [id]);
      const sessions = await pool.query(
        'SELECT COUNT(*) as count FROM sessions s JOIN courses c ON s.course_id = c.id WHERE c.teacher_id = $1',
        [id]
      );
      const attendance = await pool.query(
        'SELECT COUNT(*) as count FROM attendance a JOIN courses c ON a.course_id = c.id WHERE c.teacher_id = $1',
        [id]
      );
      const activeSessions = await pool.query(
        'SELECT COUNT(*) as count FROM sessions s JOIN courses c ON s.course_id = c.id WHERE c.teacher_id = $1 AND s.is_active = TRUE',
        [id]
      );

      stats.total_courses = parseInt(courses.rows[0].count);
      stats.total_sessions = parseInt(sessions.rows[0].count);
      stats.total_attendance = parseInt(attendance.rows[0].count);
      stats.active_sessions = parseInt(activeSessions.rows[0].count);
    } else {
      // Student
      const courses = await pool.query(
        'SELECT COUNT(*) as count FROM course_enrollments WHERE student_id = $1',
        [id]
      );
      const present = await pool.query(
        "SELECT COUNT(*) as count FROM attendance WHERE student_id = $1 AND status = 'present'",
        [id]
      );
      const late = await pool.query(
        "SELECT COUNT(*) as count FROM attendance WHERE student_id = $1 AND status = 'late'",
        [id]
      );
      const totalAttended = await pool.query(
        'SELECT COUNT(*) as count FROM attendance WHERE student_id = $1',
        [id]
      );
      const totalSessions = await pool.query(
        `SELECT COUNT(DISTINCT s.id) as count FROM sessions s
         JOIN course_enrollments ce ON s.course_id = ce.course_id
         WHERE ce.student_id = $1`,
        [id]
      );

      stats.total_courses = parseInt(courses.rows[0].count);
      stats.present_count = parseInt(present.rows[0].count);
      stats.late_count = parseInt(late.rows[0].count);
      stats.total_attended = parseInt(totalAttended.rows[0].count);
      stats.total_sessions = parseInt(totalSessions.rows[0].count);
      stats.attendance_rate = stats.total_sessions > 0
        ? Math.round((stats.total_attended / stats.total_sessions) * 100)
        : 0;
    }

    res.json(stats);
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
