import express from 'express';
import db from '../config/db.js';

const router = express.Router();

// GET /api/debug/db -> simple DB connectivity test
router.get('/db', async (req, res) => {
  try {
    const r = await db.one('SELECT NOW() AS now');
    return res.json({ status: 'ok', now: r.now });
  } catch (err) {
    console.error('Debug DB check failed:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'DB connection failed', details: err && err.message ? err.message : String(err) });
  }
});

// POST /api/debug/upload-test -> insert a small test row into hod_upload_temp
router.post('/upload-test', async (req, res) => {
  try {
    // only available in non-production
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ status: 'error', message: 'Not allowed in production' });

    const sample = {
      dept_id: req.body.dept_id || 1,
      semester: req.body.semester || 1,
      proctor_name: req.body.proctor_name || 'Test Proctor',
      proctor_email: req.body.proctor_email || 'proctor@test.edu',
      student_name: req.body.student_name || 'Test Student',
      student_usn: req.body.student_usn || `TESTUSN${Date.now() % 10000}`,
      student_email: req.body.student_email || 'student@test.edu',
      status: req.body.status || 'pending'
    };

    await db.none(
      `INSERT INTO hod_upload_temp
        (dept_id, semester, proctor_name, proctor_email, student_name, student_usn, student_email, status, uploaded_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
      [sample.dept_id, sample.semester, sample.proctor_name, sample.proctor_email, sample.student_name, sample.student_usn, sample.student_email, sample.status]
    );

    return res.json({ status: 'ok', message: 'Inserted test row', sample });
  } catch (err) {
    console.error('Debug upload-test failed:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Insert failed', details: err && err.message ? err.message : String(err) });
  }
});

// GET /api/debug/latest-uploads?limit=10 -> list recent rows inserted by HOD uploads
router.get('/latest-uploads', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ status: 'error', message: 'Not allowed in production' });
    const limit = parseInt(req.query.limit || '10', 10);
    const rows = await db.any(
      `SELECT id, dept_id, semester, proctor_name, proctor_email, student_name, student_usn, student_email, status, uploaded_at
       FROM hod_upload_temp
       ORDER BY uploaded_at DESC NULLS LAST, id DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    console.error('Debug latest-uploads failed:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Query failed', details: err && err.message ? err.message : String(err) });
  }
});

// GET /api/debug/students?limit=10 -> list recent students
router.get('/students', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ status: 'error', message: 'Not allowed in production' });
    const limit = parseInt(req.query.limit || '10', 10);
    const rows = await db.any(
      `SELECT id, student_name, student_usn, student_email, semester, dept_id, user_id
       FROM students
       ORDER BY id DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    console.error('Debug students failed:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Query failed', details: err && err.message ? err.message : String(err) });
  }
});

// GET /api/debug/registrations?limit=20 -> list recent registrations with event and user info
router.get('/registrations', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ status: 'error', message: 'Not allowed in production' });
    const limit = parseInt(req.query.limit || '20', 10);
    const rows = await db.any(
      `SELECT r.registration_id, r.event_id, r.user_id, r.status, r.registered_at,
              e.title AS event_title, u.email AS user_email
       FROM registrations r
       LEFT JOIN events e ON e.event_id = r.event_id
       LEFT JOIN users u ON u.user_id::text = r.user_id::text
       ORDER BY r.registered_at DESC NULLS LAST, r.registration_id DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    console.error('Debug registrations failed:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Query failed', details: err && err.message ? err.message : String(err) });
  }
});

// GET /api/debug/registrations/:userId -> registrations for a specific user (dev only)
router.get('/registrations/:userId', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ status: 'error', message: 'Not allowed in production' });
    const userId = req.params.userId;
    if (!userId) return res.status(400).json({ status: 'error', message: 'Missing userId param' });

    const rows = await db.any(
      `SELECT r.registration_id, r.event_id, r.user_id, r.status, r.registered_at,
              e.title AS event_title, u.email AS user_email
       FROM registrations r
       LEFT JOIN events e ON e.event_id = r.event_id
       LEFT JOIN users u ON u.user_id::text = r.user_id::text
       WHERE r.user_id = $1
       ORDER BY r.registered_at DESC NULLS LAST, r.registration_id DESC`,
      [userId]
    );
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    console.error('Debug registrations by user failed:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Query failed', details: err && err.message ? err.message : String(err) });
  }
});

// GET /api/debug/users -> list recent users (dev only)
router.get('/users', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ status: 'error', message: 'Not allowed in production' });
    const limit = parseInt(req.query.limit || '50', 10);
    const rows = await db.any(
      `SELECT user_id, name, email, role, created_at, provider FROM users ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    console.error('Debug users failed:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Query failed', details: err && err.message ? err.message : String(err) });
  }
});

// GET /api/debug/student-details -> list student_details rows (dev only)
router.get('/student-details', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ status: 'error', message: 'Not allowed in production' });
    const limit = parseInt(req.query.limit || '50', 10);
    const rows = await db.any(
      `SELECT sd.user_id, sd.usn, sd.dept_id, sd.semester, sd.proctor_id, u.email AS user_email
       FROM student_details sd
       LEFT JOIN users u ON u.user_id = sd.user_id
       ORDER BY sd.user_id DESC
       LIMIT $1`,
      [limit]
    );
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    console.error('Debug student-details failed:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Query failed', details: err && err.message ? err.message : String(err) });
  }
});

// GET /api/debug/notifications -> list recent notifications (dev only)
router.get('/notifications', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ status: 'error', message: 'Not allowed in production' });
    const limit = parseInt(req.query.limit || '20', 10);
    const rows = await db.any(
      `SELECT n.id, n.user_id, n.body, n.is_read, n.meta, n.created_at, u.email as user_email
       FROM notifications n
       LEFT JOIN users u ON u.user_id = n.user_id
       ORDER BY n.created_at DESC NULLS LAST
       LIMIT $1`,
      [limit]
    );
    return res.json({ status: 'ok', count: rows.length, rows });
  } catch (err) {
    console.error('Debug notifications failed:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Query failed', details: err && err.message ? err.message : String(err) });
  }
});

// PATCH /api/debug/notifications/:id/read -> mark a notification read (dev only)
router.patch('/notifications/:id/read', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production') return res.status(403).json({ status: 'error', message: 'Not allowed in production' });
    const id = req.params.id;
    if (!id) return res.status(400).json({ status: 'error', message: 'Missing notification id' });
    await db.none(`UPDATE notifications SET is_read = true WHERE id = $1`, [id]);
    return res.json({ status: 'ok', message: 'Marked read' });
  } catch (err) {
    console.error('Debug mark-notification-read failed:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Update failed', details: err && err.message ? err.message : String(err) });
  }
});

export default router;
