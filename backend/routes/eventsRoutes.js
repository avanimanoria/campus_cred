import express from 'express';
import db from '../config/db.js';
import { readTestUser } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Public: get approved events
router.get('/approved', async (req, res) => {
  try {
    const rows = await db.any(
      `SELECT event_id, title, description, category, start_at, end_at, venue, creator_user_id, dept_id
       FROM events
       WHERE status = 'active' AND hod_status = 'approved' AND DATE(start_at) >= CURRENT_DATE
       ORDER BY start_at DESC`
    );
    res.json({ status: 'success', total: rows.length, data: rows });
  } catch (err) {
    console.error('events/approved error:', err && err.message ? err.message : err);
    res.status(500).json({ status: 'error', message: 'Failed to fetch approved events', details: err && err.message ? err.message : String(err) });
  }
});

export default router;
