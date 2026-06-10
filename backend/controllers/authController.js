import db from "../config/db.js";

export const checkStudentEmail = async (req, res) => {
  try {
    const email = (req.query.email || req.body.email || "").toString().trim();
    if (!email) return res.status(400).json({ error: "Missing email" });

    const student = await db.oneOrNone(
      `SELECT id, student_name, student_usn, student_email, semester, user_id FROM students WHERE lower(student_email) = lower($1) LIMIT 1`,
      [email]
    );

    if (!student) return res.status(404).json({ exists: false, message: "Student not found" });
    return res.json({ exists: true, student });
  } catch (err) {
    console.error("checkStudentEmail error:", err && err.message ? err.message : err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
};

export const getUserByEmail = async (req, res) => {
  try {
    const email = (req.query.email || req.body.email || "").toString().trim();
    if (!email) return res.status(400).json({ error: "Missing email" });

    // Try users table first
    const user = await db.oneOrNone(
      `SELECT user_id, name, email, role, provider, created_at FROM users WHERE lower(email) = lower($1) LIMIT 1`,
      [email]
    );

    if (user) return res.json({ exists: true, user });

    // If no users row, check students table and expose a student role mapping
    const student = await db.oneOrNone(
      `SELECT id, student_name, student_usn, student_email, semester, user_id FROM students WHERE lower(student_email) = lower($1) LIMIT 1`,
      [email]
    );

    if (student) {
      return res.json({ exists: true, user: { user_id: student.user_id || null, role: 'student', email: student.student_email, student } });
    }

    return res.status(404).json({ exists: false, message: 'No user or student found for this email' });
  } catch (err) {
    console.error('getUserByEmail error:', err && err.message ? err.message : err);
    res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
};

export default { checkStudentEmail, getUserByEmail };
