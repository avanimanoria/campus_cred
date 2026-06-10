import db from '../config/db.js';

export async function createEventSimple(req, res) {
  try {
    const { title, description, category, start_at, end_at, venue, is_external, payment, dept_id } = req.body;
    const creator = req.user?.user_id || req.body.created_by || 1;
    const payment_amount = payment?.amount || 0;
    const payment_options = payment?.options || [];

    const ev = await db.one(
      `INSERT INTO events (title, description, category, start_at, end_at, venue, is_external, payment_amount, payment_options, creator_user_id, dept_id, status, hod_status, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending','pending', NOW()) RETURNING event_id, creator_user_id`,
      [title, description, category, start_at, end_at, venue, is_external || false, payment_amount, payment_options, creator, dept_id]
    );

    // Create a notification for the HOD of this department so they see
    // that a new event requires approval. Find HOD by dept_id in hod_details.
    try {
      const hod = await db.oneOrNone(
        `SELECT h.user_id FROM hod_details h WHERE h.dept_id = $1 LIMIT 1`,
        [dept_id]
      );
      if (hod && hod.user_id) {
        const body = `New event awaiting approval: ${title}`;
        const meta = { event_id: ev.event_id, creator_user_id: ev.creator_user_id, dept_id };
        await db.none(
          `INSERT INTO notifications (user_id, body, meta, is_read, created_at) VALUES ($1, $2, $3, false, NOW())`,
          [hod.user_id, body, meta]
        );
      }
    } catch (notifyErr) {
      console.error('Failed to create HOD notification for event:', notifyErr && notifyErr.message ? notifyErr.message : notifyErr);
    }

    return res.json({ status: 'success', message: 'Event created and pending HOD approval', data: ev });
  } catch (err) {
    console.error('createEventSimple error:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Failed to create event', details: err && err.message ? err.message : String(err) });
  }
}

export async function getParticipantsSimple(req, res) {
  try {
    const eventId = req.params.eventId || req.params.id;
    if (!eventId) return res.status(400).json({ status: 'error', message: 'Missing event id' });

    const participants = await db.any(
      `SELECT u.user_id, u.name, r.status, sd.usn, sd.semester, u.email
       FROM registrations r
       JOIN users u ON r.user_id = u.user_id
       LEFT JOIN student_details sd ON u.user_id = sd.user_id
       WHERE r.event_id = $1`,
      [eventId]
    );

    return res.json({ status: 'success', total: participants.length, data: participants });
  } catch (err) {
    console.error('getParticipantsSimple error:', err && err.message ? err.message : err);
    return res.status(500).json({ status: 'error', message: 'Failed to fetch participants', details: err && err.message ? err.message : String(err) });
  }
}
