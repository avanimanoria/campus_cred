// controllers/studentController.js

import db from "../config/db.js";
import fs from "fs";
import path from "path";

// ---------------------------------------------------------
// 1. VIEW PROFILE
// ---------------------------------------------------------
export async function getProfile(req, res) {
  try {
    let identifier = req.user?.student_usn;
    if (!identifier) return res.status(400).json({ error: "Missing student_usn" });

    // Try to find student by USN first
    let student = await db.oneOrNone(
      `SELECT id, student_name, student_usn, student_email, semester, status, user_id
       FROM students
       WHERE student_usn = $1`,
      [identifier]
    );

    // If not found and identifier looks like email prefix, try finding by email
    if (!student && !identifier.includes("@")) {
      const emailPrefix = identifier;
      const possibleEmails = [
        `${emailPrefix}@bmsce.ac.in`,
        `${emailPrefix}@gmail.com`,
        emailPrefix // in case it's already a full email
      ];

      for (const email of possibleEmails) {
        student = await db.oneOrNone(
          `SELECT id, student_name, student_usn, student_email, semester, status, user_id
           FROM students
           WHERE LOWER(student_email) = LOWER($1)`,
          [email]
        );
        if (student) break;
      }
    }

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    return res.json({ status: "success", data: student });
  } catch (err) {
    console.error("getProfile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 2. UPDATE PROFILE
// ---------------------------------------------------------
export async function updateProfile(req, res) {
  try {
    const usn = req.user?.student_usn;
    if (!usn) return res.status(400).json({ error: "Missing student_usn" });

    const { semester, dept_id, student_email, proctor_name, proctor_email } =
      req.body;

    await db.none(
      `UPDATE students SET
          semester = COALESCE($1, semester),
          dept_id = COALESCE($2, dept_id),
          student_email = COALESCE($3, student_email),
          proctor_name = COALESCE($4, proctor_name),
          proctor_email = COALESCE($5, proctor_email)
       WHERE student_usn = $6`,
      [semester, dept_id, student_email, proctor_name, proctor_email, usn]
    );

    return res.json({ status: "success", message: "Profile updated" });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 3. SUBMIT ACTIVITY
// ---------------------------------------------------------
export async function submitActivity(req, res) {
  try {
    const usn = req.user?.student_usn;
    if (!usn) return res.status(400).json({ error: "Missing student_usn" });

    const { event_id, points, category, semester, dept_id } = req.body;

    const activity = await db.one(
      `INSERT INTO activity_points 
        (student_usn, event_id, points, category, semester, dept_id, hod_status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')
       RETURNING points_id`,
      [usn, event_id, points || 0, category, semester, dept_id]
    );

    const activityId = activity.points_id;

    return res.json({
      status: "success",
      message: "Activity submitted",
      data: { activity_id: activityId }
    });
  } catch (err) {
    console.error("submitActivity error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 4. DOCUMENT UPLOAD (Correct + Clean)
// ---------------------------------------------------------
export const uploadActivityDocument = async (req, res) => {
  try {
    const activityId = req.params.activity_id;
    const studentUsn = req.user?.student_usn;

    if (!studentUsn) {
      return res
        .status(400)
        .json({ error: "User not identified (no student_usn)" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { originalname, path: filepath, mimetype } = req.file;

    await db.none(
      `INSERT INTO activity_documents
        (activity_id, student_usn, file_name, file_path, mime_type, uploaded_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [activityId, studentUsn, originalname, filepath, mimetype]
    );

    return res.json({
      status: "success",
      message: "Document uploaded successfully"
    });
  } catch (err) {
    console.error("uploadActivityDocument error:", err);
    return res.status(500).json({ error: "Server Error", details: err.message });
  }
};

// ---------------------------------------------------------
// 5. LIST ACTIVITIES
// ---------------------------------------------------------
export async function listActivities(req, res) {
  try {
    const usn = req.user?.student_usn;

    const rows = await db.any(
      `SELECT p.*,
          COALESCE(
            json_agg(d.*) FILTER (WHERE d.document_id IS NOT NULL),
            '[]'
          ) AS documents
       FROM activity_points p
       LEFT JOIN activity_documents d 
            ON d.activity_id = p.points_id
       WHERE p.student_usn = $1
       GROUP BY p.points_id
       ORDER BY p.points_id DESC`,
      [usn]
    );

    return res.json({ status: "success", data: rows });
  } catch (err) {
    console.error("listActivities error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 6. GET SINGLE ACTIVITY
// ---------------------------------------------------------
export async function getActivity(req, res) {
  try {
    const activityId = req.params.activity_id;

    const row = await db.oneOrNone(
      `SELECT p.*,
          COALESCE(
            json_agg(d.*) FILTER (WHERE d.document_id IS NOT NULL),
            '[]'
          ) AS documents
       FROM activity_points p
       LEFT JOIN activity_documents d 
            ON d.activity_id = p.points_id
       WHERE p.points_id = $1
       GROUP BY p.points_id`,
      [activityId]
    );

    if (!row)
      return res.status(404).json({ error: "Activity not found" });

    return res.json({ status: "success", data: row });
  } catch (err) {
    console.error("getActivity error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 7. POINTS SUMMARY
// ---------------------------------------------------------
export const pointsSummary = async (req, res) => {
  try {
    const usn = req.user?.student_usn;

    const summary = await db.one(
      `SELECT 
          SUM(CASE WHEN hod_status='approved' THEN points ELSE 0 END) AS approved_points,
          SUM(CASE WHEN hod_status='pending' THEN points ELSE 0 END) AS pending_points,
          SUM(points) AS total_points
       FROM activity_points
       WHERE student_usn = $1`,
      [usn]
    );

    res.json(summary);
  } catch (err) {
    console.error("pointsSummary error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// ---------------------------------------------------------
// 8. LIST EVENTS
// ---------------------------------------------------------
export const listEvents = async (req, res) => {
  try {
    // By default only return events approved by HOD and active.
    // Admin/HOD can pass ?include_pending=true to see pending events.
    const includePending = String(req.query.include_pending || '').toLowerCase() === 'true';
    const baseQuery = `
      SELECT event_id, title, description, dept_id, start_at, end_at, hod_status
      FROM events
      WHERE status = 'active' 
        ${includePending ? "" : "AND hod_status = 'approved'"}
        AND DATE(start_at) >= CURRENT_DATE
      ORDER BY start_at DESC
    `;

    const events = await db.any(baseQuery);

    res.json(events);
  } catch (err) {
    console.error("listEvents error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// ---------------------------------------------------------
// 9. NOTIFICATIONS
// ---------------------------------------------------------
export const listNotifications = async (req, res) => {
  try {
    const userId = req.user?.user_id || null;

    const rows = await db.any(
      `SELECT * FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("listNotifications error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// ---------------------------------------------------------
// 10. MARK NOTIFICATION READ
// ---------------------------------------------------------
export const markNotificationRead = async (req, res) => {
  try {
    const notifId = req.params.id;
    const userId = req.user.user_id;

    const result = await db.result(
      `UPDATE notifications 
       SET is_read = TRUE
       WHERE id = $1 AND user_id = $2`,
      [notifId, userId]
    );

    if (result.rowCount === 0)
      return res.status(404).json({ error: "Notification not found" });

    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("markNotificationRead error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};

// ---------------------------------------------------------
// 11. LIST STUDENTS FOR AN EVENT (registrations OR activity_points)
// ---------------------------------------------------------
export async function listEventStudents(req, res) {
  try {
    const eventId = req.params.id;
    if (!eventId) return res.status(400).json({ error: "Missing event id" });

    // Try registrations table first (if present), then fallback to activity_points
    let byRegistrations = [];
    try {
      byRegistrations = await db.any(
        `SELECT s.student_name, s.student_usn, s.student_email, s.semester, s.proctor_name
         FROM registrations r
         JOIN students s ON s.student_usn = r.user_id::text
         WHERE r.event_id = $1`,
        [eventId]
      );
    } catch (e) {
      // ignore if registrations table mapping isn't present
      byRegistrations = [];
    }

    if (byRegistrations && byRegistrations.length > 0) {
      return res.json({ status: "success", data: byRegistrations });
    }

    // Fallback: use activity_points entries to find students who submitted for this event
    const byActivities = await db.any(
      `SELECT s.student_name, s.student_usn, s.student_email, s.semester, s.proctor_name
       FROM activity_points ap
       JOIN students s ON s.student_usn = ap.student_usn
       WHERE ap.event_id = $1
       GROUP BY s.student_name, s.student_usn, s.student_email, s.semester, s.proctor_name`,
      [eventId]
    );

    return res.json({ status: "success", data: byActivities });
  } catch (err) {
    console.error("listEventStudents error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
}

// ---------------------------------------------------------
// 12. REGISTER FOR EVENT
// ---------------------------------------------------------
export async function registerForEvent(req, res) {
  try {
    const eventId = req.params.eventId || req.params.id;
    if (!eventId) return res.status(400).json({ error: "Missing event id" });

    const studentIdentifier = req.user?.student_usn; // This is actually email prefix
    console.log('registerForEvent - studentIdentifier from req.user:', studentIdentifier);
    
    if (!studentIdentifier) return res.status(401).json({ error: "Not authenticated" });

    // Construct full email from identifier
    const studentEmail = studentIdentifier.includes('@') ? studentIdentifier : studentIdentifier + '@bmsce.ac.in';
    console.log('registerForEvent - studentEmail:', studentEmail);

    // First check if user already exists by email
    let existingUser = await db.oneOrNone(
      `SELECT user_id FROM users WHERE email = $1 LIMIT 1`,
      [studentEmail]
    );

    console.log('registerForEvent - existingUser from users table:', existingUser);

    let user;
    if (existingUser) {
      // User exists, get their student record
      user = await db.oneOrNone(
        `SELECT user_id FROM students WHERE user_id = $1 LIMIT 1`,
        [existingUser.user_id]
      );

      if (!user) {
        // User exists but no student record, look up in hod_upload_temp
        const tempStudent = await db.oneOrNone(
          `SELECT student_name, student_usn, student_email, semester, proctor_name, proctor_email 
           FROM hod_upload_temp WHERE LOWER(student_email) = LOWER($1) LIMIT 1`,
          [studentEmail]
        );

        console.log('registerForEvent - tempStudent from hod_upload_temp:', tempStudent);

        if (tempStudent) {
          // Create student record linking to existing user
          await db.none(
            `INSERT INTO students (student_name, student_usn, student_email, semester, proctor_name, proctor_email, user_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [tempStudent.student_name, tempStudent.student_usn, tempStudent.student_email, 
             tempStudent.semester, tempStudent.proctor_name, tempStudent.proctor_email, existingUser.user_id]
          );
        } else {
          // Create basic student record
          await db.none(
            `INSERT INTO students (student_name, student_usn, student_email, user_id) 
             VALUES ($1, $2, $3, $4)`,
            [studentIdentifier, studentIdentifier, studentEmail, existingUser.user_id]
          );
        }
        user = { user_id: existingUser.user_id };
      }
    } else {
      // No user exists, try to find in hod_upload_temp
      const tempStudent = await db.oneOrNone(
        `SELECT student_name, student_usn, student_email, semester, proctor_name, proctor_email 
         FROM hod_upload_temp WHERE LOWER(student_email) = LOWER($1) LIMIT 1`,
        [studentEmail]
      );

      console.log('registerForEvent - tempStudent from hod_upload_temp:', tempStudent);

      if (tempStudent) {
        // Create user record from temp student data
        const newUser = await db.one(
          `INSERT INTO users (name, email, role, firebase_uid, provider) 
           VALUES ($1, $2, 'student', $3, 'google') 
           RETURNING user_id`,
          [tempStudent.student_name, tempStudent.student_email, studentIdentifier]
        );

        // Create student record
        await db.none(
          `INSERT INTO students (student_name, student_usn, student_email, semester, proctor_name, proctor_email, user_id) 
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [tempStudent.student_name, tempStudent.student_usn, tempStudent.student_email, 
           tempStudent.semester, tempStudent.proctor_name, tempStudent.proctor_email, newUser.user_id]
        );

        user = { user_id: newUser.user_id };
        console.log('registerForEvent - Created new user from temp data with user_id:', newUser.user_id);
      } else {
        // No data found, create minimal record
        const newUser = await db.one(
          `INSERT INTO users (name, email, role, firebase_uid, provider) 
           VALUES ($1, $2, 'student', $3, 'google') 
           RETURNING user_id`,
          [studentIdentifier, studentEmail, studentIdentifier]
        );

        await db.none(
          `INSERT INTO students (student_name, student_usn, student_email, user_id) 
           VALUES ($1, $2, $3, $4)`,
          [studentIdentifier, studentIdentifier, studentEmail, newUser.user_id]
        );

        user = { user_id: newUser.user_id };
        console.log('registerForEvent - Created minimal user with user_id:', newUser.user_id);
      }
    }

    const userId = user.user_id;

    // Ensure event is approved and active
    const ev = await db.oneOrNone(`SELECT event_id, status, hod_status FROM events WHERE event_id = $1`, [eventId]);
    if (!ev) return res.status(404).json({ error: "Event not found" });
    if (String(ev.status).toLowerCase() !== 'active' || String(ev.hod_status).toLowerCase() !== 'approved') {
      return res.status(400).json({ error: 'Event is not open for registration' });
    }

    // Insert registration (avoid duplicates)
    await db.none(
      `INSERT INTO registrations (event_id, user_id, status, registered_at)
       VALUES ($1, $2, 'registered', NOW()) ON CONFLICT (event_id, user_id) DO NOTHING`,
      [eventId, userId]
    );

    return res.json({ status: 'success', message: 'Registered for event' });
  } catch (err) {
    console.error('registerForEvent error:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Server error', details: err && err.message ? err.message : String(err) });
  }
}

// ---------------------------------------------------------
// 13. GET STUDENT'S REGISTERED EVENTS
// ---------------------------------------------------------
export async function getMyEvents(req, res) {
  try {
    const studentIdentifier = req.user?.student_usn;
    if (!studentIdentifier) return res.status(401).json({ error: "Not authenticated" });

    // Construct email
    const studentEmail = studentIdentifier.includes('@') ? studentIdentifier : studentIdentifier + '@bmsce.ac.in';

    // Look up user_id by email
    const user = await db.oneOrNone(
      `SELECT user_id FROM users WHERE email = $1 LIMIT 1`,
      [studentEmail]
    );

    if (!user) {
      return res.json({ status: 'success', data: [] });
    }

    // Get student's semester
    const studentInfo = await db.oneOrNone(
      `SELECT semester FROM students WHERE user_id = $1 LIMIT 1`,
      [user.user_id]
    );

    const studentSemester = studentInfo?.semester || null;

    // Get registered events with status computation
    const events = await db.any(
      `SELECT e.event_id, e.title, e.description, e.venue, e.category, e.start_at, e.end_at, 
              e.status, e.hod_status, r.status as registration_status, r.registered_at,
              CASE 
                WHEN r.status = 'attended' THEN 'attended'
                WHEN DATE(e.start_at) < CURRENT_DATE THEN 'missed'
                ELSE 'upcoming'
              END as event_status,
              $1 as semester
       FROM registrations r
       INNER JOIN events e ON e.event_id = r.event_id
       WHERE r.user_id = $2
       ORDER BY e.start_at DESC`,
      [studentSemester, user.user_id]
    );

    // Get external activities (submitted by proctor)
    const externalActivities = await db.any(
      `SELECT 
         ap.points_id as event_id,
         ap.points,
         ap.awarded_at as start_at,
         ap.category,
         'external' as source,
         'awarded' as event_status,
         $1 as semester
       FROM activity_points ap
       WHERE ap.student_usn = $2 AND ap.category = 'external'
       ORDER BY ap.awarded_at DESC`,
      [studentSemester, studentIdentifier]
    );

    const uploadedCertificates = await db.any(
      `SELECT
         d.document_id as event_id,
         0 as points,
         d.verified_at as start_at,
         'external' as category,
         'student-upload' as source,
         'verified' as event_status,
         $1 as semester,
         d.file_name,
         d.file_path,
         d.verification_status as approval_status
       FROM documents d
       WHERE d.student_usn = $2 AND d.doc_type = 'certificate'
       ORDER BY d.document_id DESC`,
      [studentSemester, studentIdentifier]
    );

    // Combine and return all events
    const allEvents = [...events, ...externalActivities, ...uploadedCertificates];
    return res.json({ status: 'success', data: allEvents });
  } catch (err) {
    console.error('getMyEvents error:', err && err.message ? err.message : err);
    return res.status(500).json({ error: 'Server error', details: err && err.message ? err.message : String(err) });
  }
}

// ---------------------------------------------------------
// MARK EVENT AS ATTENDED
// ---------------------------------------------------------
export async function markEventAttended(req, res) {
  try {
    const eventId = req.params.eventId || req.params.id;
    const studentUsn = req.user?.student_usn;

    if (!eventId) {
      return res.status(400).json({ error: "Missing event ID" });
    }

    if (!studentUsn) {
      return res.status(400).json({ error: "Not authenticated" });
    }

    // Get user_id from student_usn or resolve from email prefix
    let student = await db.oneOrNone(
      `SELECT user_id FROM students WHERE student_usn = $1`,
      [studentUsn]
    );

    if (!student) {
      const candidateEmail = studentUsn.includes("@") ? studentUsn : `${studentUsn}@bmsce.ac.in`;
      student = await db.oneOrNone(
        `SELECT s.user_id
         FROM students s
         WHERE LOWER(s.student_email) = LOWER($1)
         LIMIT 1`,
        [candidateEmail]
      );
    }

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Update registration status to attended
    const result = await db.result(
      `UPDATE registrations 
       SET status = 'attended'
       WHERE event_id = $1 AND user_id = $2`,
      [eventId, student.user_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Registration not found" });
    }

    return res.json({
      status: "success",
      message: "Event marked as attended"
    });
  } catch (err) {
    console.error("markEventAttended error:", err);
    return res.status(500).json({ error: "Server Error", details: err.message });
  }
}

/**
 * Calculate total activity points for a student based on attended events
 * Maps event titles to 10 major categories and sums points
 */
export async function getStudentActivityPoints(req, res) {
  try {
    const studentUsn = req.params.usn;
    if (!studentUsn) return res.status(400).json({ error: "Student USN required" });

    // Get user_id from student_usn
    const student = await db.oneOrNone(
      `SELECT user_id FROM students WHERE student_usn = $1 LIMIT 1`,
      [studentUsn]
    );

    if (!student) {
      return res.json({ status: 'success', data: { totalPoints: 0, distribution: {} } });
    }

    // Get all attended events for the student
    const attendedEvents = await db.any(
      `SELECT e.event_id, e.title, r.status
       FROM registrations r
       INNER JOIN events e ON e.event_id = r.event_id
       WHERE r.user_id = $1 AND r.status = 'attended'`,
      [student.user_id]
    );

    // Map events to categories and calculate points
    const categoryMap = {
      "Societal Needs and Development": 0,
      "Environment and Sustainability": 0,
      "Childhood Development and Pedagogy": 0,
      "Women Empowerment Outreach": 0,
      "Promote Rural Development": 0,
      "Quality of Life through Technology": 0,
      "National Level Initiatives": 0,
      "Innovative approach to promote local tourism": 0,
      "Innovations and Entrepreneurship": 0,
      "Leadership and Management": 0,
    };

    const defaultPoints = 5;

    attendedEvents.forEach(event => {
      const title = event.title.toLowerCase();
      
      if (title.includes("leadership") || title.includes("management")) {
        categoryMap["Leadership and Management"] += defaultPoints;
      } else if (title.includes("tech") || title.includes("coding") || title.includes("development")) {
        categoryMap["Quality of Life through Technology"] += defaultPoints;
      } else if (title.includes("environment") || title.includes("sustainability")) {
        categoryMap["Environment and Sustainability"] += defaultPoints;
      } else if (title.includes("innovation") || title.includes("entrepreneurship")) {
        categoryMap["Innovations and Entrepreneurship"] += defaultPoints;
      } else if (title.includes("rural")) {
        categoryMap["Promote Rural Development"] += defaultPoints;
      } else if (title.includes("woman") || title.includes("women")) {
        categoryMap["Women Empowerment Outreach"] += defaultPoints;
      } else if (title.includes("child") || title.includes("pedagogy")) {
        categoryMap["Childhood Development and Pedagogy"] += defaultPoints;
      } else if (title.includes("tourism")) {
        categoryMap["Innovative approach to promote local tourism"] += defaultPoints;
      } else if (title.includes("national") || title.includes("ncc") || title.includes("nss")) {
        categoryMap["National Level Initiatives"] += defaultPoints;
      } else {
        categoryMap["Societal Needs and Development"] += defaultPoints;
      }
    });

    const totalPoints = Object.values(categoryMap).reduce((sum, val) => sum + val, 0);

    return res.json({
      status: 'success',
      data: {
        totalPoints,
        distribution: categoryMap,
        attendedEventCount: attendedEvents.length
      }
    });
  } catch (err) {
    console.error("getStudentActivityPoints error:", err);
    return res.status(500).json({ error: "Server Error", details: err.message });
  }
}

// ---------------------------------------------------------
// UPLOAD CERTIFICATE (for external events)
// ---------------------------------------------------------
export async function uploadCertificate(req, res) {
  try {
    const studentUsn = req.user?.student_usn || req.headers["x-user-id"];
    
    if (!studentUsn) {
      return res.status(400).json({ error: "Missing student USN" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Save file info to database
    const fileName = req.file.originalname;
    const filePath = req.file.path || `uploads/student/${studentUsn}/${fileName}`;

    const result = await db.one(
      `INSERT INTO documents (student_usn, file_name, file_path, doc_type, verification_status)
       VALUES ($1, $2, $3, 'certificate', 'pending')
       RETURNING *`,
      [studentUsn, fileName, filePath]
    );

    return res.json({
      status: "success",
      message: "Certificate uploaded successfully",
      data: result
    });
  } catch (err) {
    console.error("uploadCertificate error:", err);
    return res.status(500).json({ error: "Failed to upload certificate" });
  }
}

// ---------------------------------------------------------
// GET CERTIFICATES
// ---------------------------------------------------------
export async function getCertificates(req, res) {
  try {
    const { usn } = req.params;

    if (!usn) {
      return res.status(400).json({ error: "Missing student USN" });
    }

    const documents = await db.manyOrNone(
      `SELECT * FROM documents
       WHERE student_usn = $1
       ORDER BY document_id DESC`,
      [usn]
    );

    return res.json({
      status: "success",
      data: documents || []
    });
  } catch (err) {
    console.error("getCertificates error:", err);
    return res.status(500).json({ error: "Failed to fetch certificates" });
  }
}

