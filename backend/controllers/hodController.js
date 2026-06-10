// controllers/hodController.js

import db from "../config/db.js";
import xlsx from "xlsx";

/* ======================================================
   1. Upload HOD Users/Students (Excel/CSV)
====================================================== */
export const uploadDeptUserData = async (req, res) => {
  try {
    const { dept_id } = req.params;

    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ error: "Missing upload file (multipart field 'file')" });
    }

    const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return res.status(400).json({ error: "Uploaded workbook has no sheets" });

    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { defval: null });

    console.log(`📥 Received upload for dept ${dept_id}: parsed ${rows.length} rows`);
    if (rows.length > 0) console.log('📥 First row sample:', rows[0]);

    // Process rows inside a transaction
    let resultSummary;
    try {
      resultSummary = await db.tx(async (t) => {
        const rowResults = [];

        // Build list of proctor emails in this upload to replace their mappings
        const normalize = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
        const proctorEmails = Array.from(
          new Set(
            rows
              .map((row) => {
                const nr = {};
                Object.keys(row || {}).forEach((k) => {
                  nr[normalize(k)] = row[k];
                });
                const email = nr["proctoremail"] || nr["proctor_email"];
                return email ? String(email).trim().toLowerCase() : null;
              })
              .filter(Boolean)
          )
        );

        if (proctorEmails.length > 0) {
          console.log("🧹 Clearing old mappings for proctors:", proctorEmails);
          await t.none(
            `
            DELETE FROM hod_upload_temp
            WHERE LOWER(proctor_email) = ANY($1)
            `,
            [proctorEmails]
          );
        }

        for (const row of rows) {
          // Normalize column names
          const normalize = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
          const nr = {};
          Object.keys(row || {}).forEach((k) => {
            nr[normalize(k)] = row[k];
          });

          const studentName =
            nr["studentname"] || nr["student_name"] || nr["name"] || nr["student"]
              ? String(nr["studentname"] || nr["student_name"] || nr["name"] || nr["student"]).trim()
              : null;

          const studentUSN =
            nr["studentusn"] || nr["usn"] || nr["student_usn"]
              ? String(nr["studentusn"] || nr["usn"] || nr["student_usn"]).trim()
              : null;

          const studentEmail =
            nr["studentemail"] || nr["email"] || nr["student_email"]
              ? String(nr["studentemail"] || nr["email"] || nr["student_email"]).trim()
              : null;

          const semester = nr["semester"] || nr["sem"] ? parseInt(nr["semester"] || nr["sem"]) : null;

          const proctorName =
            nr["proctorname"] || nr["proctor_name"] || nr["proctor"]
              ? String(nr["proctorname"] || nr["proctor_name"] || nr["proctor"]).trim()
              : null;

          const proctorEmail =
            nr["proctoremail"] || nr["proctor_email"]
              ? String(nr["proctoremail"] || nr["proctor_email"]).trim()
              : null;

          const rowStatus = nr["status"] || nr["rowstatus"] ? String(nr["status"] || nr["rowstatus"]).trim() : null;

          const facultyName =
            nr["facultyname"] || nr["faculty_name"]
              ? String(nr["facultyname"] || nr["faculty_name"]).trim()
              : null;

          const facultyEmail =
            nr["facultyemail"] || nr["faculty_email"]
              ? String(nr["facultyemail"] || nr["faculty_email"]).trim()
              : null;

          console.log('🔍 Parsed row:', { studentName, studentUSN, studentEmail, proctorName, proctorEmail, facultyName, facultyEmail, semester });

          if (!studentUSN || !studentName) {
            console.log('⚠️ Skipping row - missing USN or name');
            rowResults.push({
              student_usn: studentUSN,
              status: "skipped",
              reason: "missing usn or name",
            });
            continue;
          }

          try {
            console.log('💾 Inserting into DB:', { studentUSN, studentName });
            // Upsert into students table (note: dept_id not in this table)
            await t.none(
              `
              INSERT INTO students 
              (proctor_name, proctor_email, student_name, student_usn, student_email, semester, status)
              VALUES ($1, $2, $3, $4, $5, $6, 'inactive')
              ON CONFLICT (student_usn)
              DO UPDATE SET
                proctor_name = EXCLUDED.proctor_name,
                proctor_email = EXCLUDED.proctor_email,
                student_name = EXCLUDED.student_name,
                student_email = EXCLUDED.student_email,
                semester = EXCLUDED.semester,
                status = 'inactive';
            `,
              [proctorName, proctorEmail, studentName, studentUSN, studentEmail, semester]
            );
            console.log('✅ Successfully inserted student:', studentUSN);
            console.log('✅ Successfully inserted student:', studentUSN);

            // Update or insert into hod_upload_temp to avoid duplicate rows on re-upload
            const updatedTemp = await t.result(
              `
              UPDATE hod_upload_temp
              SET
                semester = $1,
                proctor_name = $2,
                proctor_email = $3,
                student_name = $4,
                student_email = $6,
                status = COALESCE($7, 'pending'),
                uploaded_at = NOW()
              WHERE student_usn = $5
                 OR (student_email IS NOT NULL AND student_email = $6)
              `,
              [semester, proctorName, proctorEmail, studentName, studentUSN, studentEmail, rowStatus || "pending"]
            );

            if (updatedTemp.rowCount === 0) {
              await t.none(
                `
                INSERT INTO hod_upload_temp
                  (semester, proctor_name, proctor_email, student_name, student_usn, student_email, status, uploaded_at)
                VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'pending'), NOW())
              `,
                [semester, proctorName, proctorEmail, studentName, studentUSN, studentEmail, rowStatus || "pending"]
              );
            }

            // Create/link a user for the proctor first (so we can reference proctor_id in student_details)
            let proctorUserId = null;
            if (proctorEmail) {
              try {
                const proctorRow = await t.one(
                  `
                  INSERT INTO users (name, email, role, created_at, provider)
                  VALUES ($1, $2, 'proctor', NOW(), 'hod_upload')
                  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
                  RETURNING user_id
                  `,
                  [proctorName || (proctorEmail ? proctorEmail.split('@')[0] : 'proctor'), proctorEmail]
                );
                proctorUserId = proctorRow.user_id;
              } catch (e) {
                console.error('Failed to create/link user for proctor', proctorEmail, e.message || e);
              }
            }

            // Create/link a user for the faculty (if present in Excel)
            if (facultyEmail) {
              try {
                await t.one(
                  `
                  INSERT INTO users (name, email, role, created_at, provider)
                  VALUES ($1, $2, 'faculty', NOW(), 'hod_upload')
                  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
                  RETURNING user_id
                  `,
                  [facultyName || (facultyEmail ? facultyEmail.split('@')[0] : 'faculty'), facultyEmail]
                );
                console.log('✅ Created/linked faculty user:', facultyEmail);
              } catch (e) {
                console.error('Failed to create/link user for faculty', facultyEmail, e.message || e);
              }
            }

            // Create/link user for student if email present
            let studentUserId = null;
            if (studentEmail) {
              try {
                const userRow = await t.one(
                  `
                  INSERT INTO users (name, email, role, created_at, provider)
                  VALUES ($1, $2, 'student', NOW(), 'hod_upload')
                  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
                  RETURNING user_id
                  `,
                  [studentName || (studentEmail ? studentEmail.split('@')[0] : 'student'), studentEmail]
                );
                studentUserId = userRow.user_id;

                // Link into students table
                await t.none(
                  `
                  UPDATE students
                  SET user_id = $1
                  WHERE student_usn = $2
                  `,
                  [studentUserId, studentUSN]
                );
              } catch (e) {
                console.error('Failed to create/link user for student', studentEmail, e.message || e);
              }
            }

            // Upsert into student_details to maintain richer mapping (user_id -> usn, dept, semester, proctor)
            try {
              if (studentUserId) {
                await t.none(
                  `
                  INSERT INTO student_details (user_id, usn, semester, proctor_id)
                  VALUES ($1, $2, $3, $4)
                  ON CONFLICT (user_id) DO UPDATE SET
                    usn = EXCLUDED.usn,
                    semester = EXCLUDED.semester,
                    proctor_id = EXCLUDED.proctor_id;
                  `,
                  [studentUserId, studentUSN, semester || null, proctorUserId || null]
                );
              }
            } catch (e) {
              console.error('Failed to upsert student_details for', studentUSN, e.message || e);
            }

            rowResults.push({ student_usn: studentUSN, status: "ok" });
          } catch (e) {
            console.error('❌ Error inserting student', studentUSN, ':', e.message || e);
            rowResults.push({
              student_usn: studentUSN,
              status: "error",
              reason: e.message || String(e),
            });
          }
        }

        return rowResults;
      });
    } catch (dbErr) {
      console.error('❌ Database transaction failed during upload:', dbErr && dbErr.message ? dbErr.message : dbErr);
      return res.status(500).json({ error: 'Database transaction failed', message: dbErr && dbErr.message ? dbErr.message : String(dbErr) });
    }

    const inserted = resultSummary.filter((r) => r.status === "ok").length;
    const skipped = resultSummary.filter((r) => r.status === "skipped").length;

    res.json({
      status: "success",
      summary: {
        total_rows: rows.length,
        inserted_or_updated: inserted,
        skipped: skipped,
        row_details: resultSummary,
      },
    });
  } catch (err) {
    console.error("❌ Upload Failed:", err.message);
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   4. Approve Event
====================================================== */
export const getPendingEvents = async (req, res) => {
  try {
    const { dept_id } = req.params;
    if (!dept_id) {
      return res.status(400).json({ status: "error", message: "Missing dept_id" });
    }
    const events = await db.manyOrNone(
      `SELECT event_id, title, description, venue, start_at, end_at, category, hod_status, created_at
       FROM events
       WHERE dept_id = $1 AND hod_status = 'pending'
       ORDER BY created_at DESC`,
      [dept_id]
    );
    return res.status(200).json({ status: "success", data: events || [] });
  } catch (e) {
    console.error("getPendingEvents error:", e.message);
    return res.status(500).json({ status: "error", message: "Failed to fetch pending events" });
  }
};

export const getPendingCategories = async (req, res) => {
  try {
    const { dept_id } = req.params;
    if (!dept_id) {
      return res.status(400).json({ status: "error", message: "Missing dept_id" });
    }
    const categories = await db.manyOrNone(
      `SELECT category_id, name, max_points, status, proposed_by, created_at
       FROM event_categories
       WHERE status = 'pending'
       ORDER BY created_at DESC`,
      []
    );
    return res.status(200).json({ status: "success", data: categories || [] });
  } catch (e) {
    console.error("getPendingCategories error:", e.message);
    return res.status(500).json({ status: "error", message: "Failed to fetch pending categories" });
  }
};

export const approveCategory = async (req, res) => {
  try {
    const { category_id } = req.body;
    if (!category_id) {
      return res.status(400).json({ status: "error", message: "Missing category_id" });
    }
    const updated = await db.oneOrNone(
      `UPDATE event_categories
       SET status = 'approved'
       WHERE category_id = $1
       RETURNING category_id, name AS category_name, max_points, status`,
      [category_id]
    );
    if (!updated) {
      return res.status(404).json({ status: "error", message: `Category ${category_id} not found` });
    }
    return res.status(200).json({ status: "success", data: updated, message: "Category approved" });
  } catch (e) {
    console.error("approveCategory error:", e.message);
    return res.status(500).json({ status: "error", message: "Failed to approve category" });
  }
};

export const rejectCategory = async (req, res) => {
  try {
    const { category_id, reason } = req.body;
    if (!category_id) {
      return res.status(400).json({ status: "error", message: "Missing category_id" });
    }
    const updated = await db.oneOrNone(
      `UPDATE event_categories
       SET status = 'rejected', rejection_reason = COALESCE($2, rejection_reason)
       WHERE category_id = $1
       RETURNING category_id, name AS category_name, max_points, status`,
      [category_id, reason || null]
    );
    if (!updated) {
      return res.status(404).json({ status: "error", message: `Category ${category_id} not found` });
    }
    return res.status(200).json({ status: "success", data: updated, message: "Category rejected" });
  } catch (e) {
    console.error("rejectCategory error:", e.message);
    return res.status(500).json({ status: "error", message: "Failed to reject category" });
  }
};

/* ======================================================
   2. Get HOD Upload History
====================================================== */
export const getHodUploads = async (req, res) => {
  try {
    const rows = await db.manyOrNone(
      `
      SELECT id, semester, proctor_name, proctor_email,
             student_name, student_usn, student_email, status, uploaded_at
      FROM hod_upload_temp
      ORDER BY uploaded_at DESC
      LIMIT 100
      `
    );

    res.json({ status: "success", total: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   3. Get Students of Department (Proctor-Student Mappings)
====================================================== */
export const getDepartmentUsers = async (req, res) => {
  try {
    // Fetch all students with their proctor assignments
    const students = await db.manyOrNone(
      `
      SELECT proctor_name, proctor_email, student_name,
             student_usn, student_email, semester, status
      FROM students
      ORDER BY proctor_name, semester NULLS LAST, student_name
      `
    );

    // Group students by proctor
    const proctorMap = new Map();
    
    for (const student of students) {
      const proctorName = student.proctor_name || "Unassigned";
      const proctorEmail = student.proctor_email || "";

      if (!proctorMap.has(proctorName)) {
        proctorMap.set(proctorName, {
          proctor_name: proctorName,
          proctor_email: proctorEmail,
          students: []
        });
      }

      proctorMap.get(proctorName).students.push({
        student_id: student.student_usn,
        student_usn: student.student_usn,
        student_name: student.student_name,
        student_email: student.student_email,
        semester: student.semester,
        status: student.status
      });
    }

    // Convert map to array and filter out "Unassigned" proctors
    const mappings = Array.from(proctorMap.values()).filter(
      (mapping) => mapping.proctor_name !== "Unassigned"
    );

    res.json({ status: "success", total: students.length, data: mappings });
  } catch (err) {
    console.error("❌ getDepartmentUsers error:", err);
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   4. Approve Event
====================================================== */
export const approveEvent = async (req, res) => {
  try {
    const { event_id } = req.body;
    const hodUserId = req.user?.user_id || 1;

    if (!event_id) return res.status(400).json({ error: "Missing event_id" });

    // Approve the event and mark it active in a single transaction
    const result = await db.tx(async (t) => {
      const r = await t.result(
        `UPDATE events
         SET hod_status = 'approved',
             hod_approved_on = NOW(),
             hod_approved_by = $1,
             status = 'active'
         WHERE event_id = $2`,
        [hodUserId, event_id]
      );
      return r;
    });

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ status: "success", message: `Event ${event_id} approved` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   4.1 Reject Event
====================================================== */
export const rejectEvent = async (req, res) => {
  try {
    const { event_id, hod_remarks } = req.body;
    const hodUserId = req.user?.user_id || 1;

    if (!event_id) return res.status(400).json({ error: "Missing event_id" });

    // Reject the event
    const result = await db.tx(async (t) => {
      const r = await t.result(
        `UPDATE events
         SET hod_status = 'rejected',
             hod_approved_on = NOW(),
             hod_approved_by = $1,
             hod_remarks = $2,
             status = 'cancelled'
         WHERE event_id = $3`,
        [hodUserId, hod_remarks || 'Rejected by HOD', event_id]
      );
      return r;
    });

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Event not found" });
    }

    res.json({ status: "success", message: `Event ${event_id} rejected` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   4.2 Get Approved Events
====================================================== */
export const getApprovedEvents = async (req, res) => {
  try {
    const rows = await db.any(
      `SELECT event_id, title, description, category, start_at, end_at, venue, creator_user_id, status, hod_status
       FROM events
       WHERE hod_status = 'approved' AND status = 'active' AND DATE(start_at) >= CURRENT_DATE
       ORDER BY start_at DESC`
    );
    res.json({ status: 'success', total: rows.length, data: rows });
  } catch (err) {
    console.error('getApprovedEvents error:', err && err.message ? err.message : err);
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   5. Approve Activity Points
====================================================== */
export const approveActivityPoints = async (req, res) => {
  try {
    const { student_usn, event_id, hod_remarks } = req.body;
    const dept_id = parseInt(req.params.dept_id);
    const hodUserId = req.user?.user_id || 1;

    if (!student_usn || !event_id) {
      return res.status(400).json({ error: "Missing student_usn or event_id" });
    }

    const existing = await db.oneOrNone(
      `
      SELECT points_id
      FROM activity_points
      WHERE student_usn = $1 AND event_id = $2 AND dept_id = $3
      `,
      [student_usn, event_id, dept_id]
    );

    if (!existing) {
      return res.status(404).json({ error: "Activity points record not found" });
    }

    await db.none(
      `
      UPDATE activity_points
      SET hod_status = 'approved',
          hod_remarks = $1,
          hod_approved_by = $2,
          hod_approved_on = NOW()
      WHERE student_usn = $3 AND event_id = $4 AND dept_id = $5
      `,
      [hod_remarks || "Approved by HOD", hodUserId, student_usn, event_id, dept_id]
    );

    res.json({
      status: "success",
      message: `Activity points approved for USN ${student_usn}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/* ======================================================
   6. Approve Document by HOD
====================================================== */
export const approveDocument = async (req, res) => {
  try {
    const { document_id, hod_approved_by, hod_remarks } = req.body;

    const updated = await db.result(
      `
      UPDATE documents
      SET hod_status = 'approved',
          hod_approved_by = $1,
          hod_approved_on = NOW(),
          hod_remarks = $2
      WHERE document_id = $3
      `,
      [hod_approved_by, hod_remarks, document_id]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({ status: "success", message: "Document approved successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


/* ======================================================
   7. Check if Email is Registered (for signup validation)
====================================================== */
export const checkEmailRegistered = async (req, res) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if email exists in students, proctors, or faculty (from students table or hod_upload_temp)
    const user = await db.oneOrNone(
      `
      SELECT student_email as email, 'student' as role FROM students WHERE student_email = $1
      UNION
      SELECT proctor_email as email, 'proctor' as role FROM students WHERE proctor_email = $1
      UNION
      SELECT student_email as email, 'student' as role FROM hod_upload_temp WHERE student_email = $1
      UNION
      SELECT proctor_email as email, 'proctor' as role FROM hod_upload_temp WHERE proctor_email = $1
      UNION
      SELECT email, role FROM users WHERE email = $1 AND role IN ('faculty', 'proctor', 'student')
      LIMIT 1
      `,
      [email]
    );

    if (user) {
      return res.json({ status: "success", registered: true, role: user.role, message: "Email is registered" });
    }

    res.json({ status: "success", registered: false, message: "Email is not registered. Ask your HoD to add your email before signing up." });
  } catch (err) {
    console.error("❌ checkEmailRegistered error:", err);
    res.status(500).json({ error: err.message });
  }
};
