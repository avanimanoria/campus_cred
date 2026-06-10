import express from 'express';
import db from '../config/db.js';
import { readTestUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Require test user middleware so req.user is available
router.use(readTestUser);

// GET /api/proctor/students -> returns students for the current proctor (by email or user_id)
router.get('/students', async (req, res) => {
  try {
    const user = req.user;
    if (!user) return res.status(401).json({ status: 'error', message: 'Not authenticated' });

    // Try to find by proctor email mapping first
    const email = user.email;
    let rows = [];
    if (email) {
      rows = await db.any(
        `SELECT id, student_name, student_usn, semester, student_email, proctor_email, dept_id, status
         FROM students WHERE proctor_email = $1 ORDER BY student_name`,
        [email]
      );
    }

    // If none found and user has a proctor_details link, try by proctor user_id
    if ((!rows || rows.length === 0) && user.user_id) {
      rows = await db.any(
        `SELECT s.id, s.student_name, s.student_usn, s.semester, s.student_email, s.proctor_email, s.dept_id, s.status
         FROM students s
         JOIN proctor_details pd ON pd.user_id = $1 AND pd.dept_id = s.dept_id
         WHERE pd.user_id = $1`,
        [user.user_id]
      );
    }

    return res.json({ status: 'success', total: rows.length, data: rows });
  } catch (err) {
    console.error('proctor/students error:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch proctor students', details: err && err.message ? err.message : String(err) });
  }
});

export default router;
