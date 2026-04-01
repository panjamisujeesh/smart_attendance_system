const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/courses - List courses (role-filtered)
router.get('/', auth(), async (req, res) => {
  try {
    const { role, id } = req.user;
    let result;

    if (role === 'admin') {
      result = await pool.query(`
        SELECT c.*, u.name as teacher_name,
          (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as student_count
        FROM courses c
        LEFT JOIN users u ON c.teacher_id = u.id
        ORDER BY c.created_at DESC
      `);
    } else if (role === 'teacher') {
      result = await pool.query(`
        SELECT c.*, u.name as teacher_name,
          (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as student_count
        FROM courses c
        LEFT JOIN users u ON c.teacher_id = u.id
        WHERE c.teacher_id = $1
        ORDER BY c.created_at DESC
      `, [id]);
    } else {
      result = await pool.query(`
        SELECT c.*, u.name as teacher_name,
          (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) as student_count
        FROM courses c
        LEFT JOIN users u ON c.teacher_id = u.id
        INNER JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1
        ORDER BY c.created_at DESC
      `, [id]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error('List courses error:', err);
    res.status(500).json({ error: 'Server error listing courses' });
  }
});

// POST /api/courses - Create course (admin + teacher)
router.post('/', auth(['admin', 'teacher']), async (req, res) => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Course name and code are required' });
    }

    const existing = await pool.query('SELECT id FROM courses WHERE code = $1', [code]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Course code already exists' });
    }

    const teacherId = req.user.role === 'teacher' ? req.user.id : req.body.teacher_id || req.user.id;

    const result = await pool.query(
      'INSERT INTO courses (name, code, teacher_id) VALUES ($1, $2, $3) RETURNING *',
      [name, code, teacherId]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create course error:', err);
    res.status(500).json({ error: 'Server error creating course' });
  }
});

// POST /api/courses/:id/enroll - Enroll student
router.post('/:id/enroll', auth(['admin', 'teacher']), async (req, res) => {
  try {
    const courseId = req.params.id;
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: 'student_id is required' });
    }

    // Check student exists
    const student = await pool.query("SELECT id FROM users WHERE id = $1 AND role = 'student'", [student_id]);
    if (student.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Check course exists
    const course = await pool.query('SELECT id FROM courses WHERE id = $1', [courseId]);
    if (course.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check not already enrolled
    const existing = await pool.query(
      'SELECT id FROM course_enrollments WHERE course_id = $1 AND student_id = $2',
      [courseId, student_id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Student already enrolled in this course' });
    }

    const result = await pool.query(
      'INSERT INTO course_enrollments (course_id, student_id) VALUES ($1, $2) RETURNING *',
      [courseId, student_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Server error enrolling student' });
  }
});

// GET /api/courses/:id/students - Get enrolled students
router.get('/:id/students', auth(['admin', 'teacher']), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.name, u.email, u.student_id, ce.enrolled_at
      FROM course_enrollments ce
      JOIN users u ON ce.student_id = u.id
      WHERE ce.course_id = $1
      ORDER BY u.name
    `, [req.params.id]);

    res.json(result.rows);
  } catch (err) {
    console.error('Get course students error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/courses/:id - Delete course
router.delete('/:id', auth(['admin']), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM courses WHERE id = $1 RETURNING id', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json({ message: 'Course deleted successfully' });
  } catch (err) {
    console.error('Delete course error:', err);
    res.status(500).json({ error: 'Server error deleting course' });
  }
});

module.exports = router;
