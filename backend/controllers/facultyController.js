import BaseController from "./BaseController.js";
import { v4 as uuidv4 } from "uuid";
import db from "../config/db.js"; // Note: This import isn't strictly needed if using this.db

// This controller uses the Class/Constructor pattern
export default class FacultyController extends BaseController {
    constructor(db) {
        // Assume BaseController sets this.db = db;
        super(db);
    }

    /* 1️⃣ CREATE EVENT 
     * =========================================================== */
    async createEvent(req, res) {
        try {
            const {
                title, description, category, start_at, end_at, venue,
                is_external, payment, created_by, dept_id,
            } = req.body;

            // Guard against missing payment object in the request body
            const payment_amount = payment && typeof payment.amount !== 'undefined' ? payment.amount : 0;
            const payment_options = payment && Array.isArray(payment.options) ? payment.options : [];

            // Normalize creator id: prefer authenticated numeric user_id; fall back to created_by if numeric; otherwise default 1
            const numericCreatedBy = created_by && !Number.isNaN(Number(created_by)) ? Number(created_by) : null;
            const creatorId = req.user?.user_id || numericCreatedBy || 1;

            // Ensure dept_id is numeric to avoid invalid input errors
            const deptIdSafe = dept_id && !Number.isNaN(Number(dept_id)) ? Number(dept_id) : null;
            const event = await this.db.one(
                `INSERT INTO events
                 (title, description, category, start_at, end_at, venue,
                                    is_external, payment_amount, payment_options, creator_user_id, dept_id, status, hod_status, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', 'pending', NOW())
                 RETURNING event_id, creator_user_id, created_at`,
                [
                                        title, description, category, start_at, end_at, venue,
                                        is_external, payment_amount, payment_options, creatorId, deptIdSafe,
                ]
            );

            const faculty = await this.db.oneOrNone(`SELECT name FROM users WHERE user_id = $1`, [event.creator_user_id]);
            
            const responseData = {
                event_id: event.event_id,
                created_by: {
                    faculty_id: event.creator_user_id,
                    name: faculty ? faculty.name : "Faculty (DB)"
                },
                created_at: event.created_at
            };

            // Create a notification for the HOD of this department so they see a pending event
            try {
                const hod = await this.db.oneOrNone(
                    `SELECT h.user_id FROM hod_details h WHERE h.dept_id = $1 LIMIT 1`,
                    [dept_id]
                );
                if (hod && hod.user_id) {
                    const body = `New event awaiting approval: ${title}`;
                    const meta = { event_id: event.event_id, creator_user_id: event.creator_user_id, dept_id };
                    await this.db.none(
                        `INSERT INTO notifications (user_id, body, meta, is_read, created_at) VALUES ($1, $2, $3, false, NOW())`,
                        [hod.user_id, body, meta]
                    );
                }
            } catch (notifyErr) {
                console.error('Failed to create HOD notification for event:', notifyErr && notifyErr.message ? notifyErr.message : notifyErr);
            }

            // Include a friendly message and return 201 Created
            responseData.message = "Event created successfully";
            return this.success(res, responseData, 201);
        } catch (err) {
            return this.error(res, err.message);
        }
    }

    /* 2️⃣ ASSIGN ROLE 
     * =========================================================== */
    async assignRole(req, res) {
        try {
            const event_id = req.params.id;
            const { user_id, role, assigned_by, start_at, end_at } = req.body;

            const result = await this.db.one(
                `INSERT INTO event_assignments 
                 (event_id, user_id, role, appointed_by, appointed_start, appointed_end)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING assignment_id, event_id, user_id, role, appointed_by`,
                [event_id, user_id, role, assigned_by, start_at, end_at]
            );

            return this.success(res, result, 200);
        } catch (err) {
            return this.error(res, err.message);
        }
    }

    /* 3️⃣ GET PARTICIPANT LIST 
     * =========================================================== */
    async getParticipants(req, res) {
        try {
            const event_id = req.params.id;
            
            // This query joins registrations with users to get the list
            const participants = await this.db.any(
                `SELECT u.user_id, u.name, r.status, sd.usn, sd.semester, u.email
                 FROM registrations r
                 JOIN users u ON r.user_id = u.user_id
                 LEFT JOIN student_details sd ON u.user_id = sd.user_id
                 WHERE r.event_id = $1`,
                [event_id]
            );

            // Get the assigned roles (volunteers, etc.)
            const roles = await this.db.any(
                `SELECT u.user_id, u.name, ea.role
                 FROM event_assignments ea
                 JOIN users u ON ea.user_id = u.user_id
                 WHERE ea.event_id = $1`,
                 [event_id]
            );

            const combinedList = {
                participants: participants,
                organizers: roles
            };

            return this.success(res, combinedList, 200);
        } catch (err) {
            return this.error(res, err.message);
        }
    }

    /* 3️⃣A GET EVENT STUDENTS WITH DETAILS
     * =========================================================== */
    async getEventStudents(req, res) {
        try {
            const event_id = req.params.id;
            
            // Get event title
            const event = await this.db.oneOrNone(
                `SELECT event_id, title FROM events WHERE event_id = $1`,
                [event_id]
            );

            if (!event) {
                return this.error(res, "Event not found", 404);
            }
            
            // Get students registered for this event with full details
            const students = await this.db.any(
                `SELECT 
                    u.user_id,
                    u.name,
                    u.email,
                    s.student_usn as usn,
                    s.semester,
                    s.proctor_name,
                    r.status,
                    r.registered_at
                 FROM registrations r
                 JOIN users u ON r.user_id = u.user_id
                 LEFT JOIN students s ON u.user_id = s.user_id
                 WHERE r.event_id = $1
                 ORDER BY u.name ASC`,
                [event_id]
            );

            const response = {
                event_id: event.event_id,
                event_title: event.title,
                total_students: students.length,
                data: students
            };

            return this.success(res, response, 200);
        } catch (err) {
            console.error("Error in getEventStudents:", err.message);
            return this.error(res, err.message);
        }
    }

    /* 4️⃣ GENERATE QR FOR ATTENDANCE
     * =========================================================== */
    async generateQR(req, res) {
        try {
            const event_id = req.params.id;
            const { expires_in_seconds } = req.body;
            const token = uuidv4();
            const expires_at = new Date(Date.now() + expires_in_seconds * 1000);
            
            const issued_by_user_id = 1; // HACK: Using Prof. Ananya as default

            await this.db.none(
                `INSERT INTO qr_tokens (event_id, token, expires_at, issued_by)
                 VALUES ($1, $2, $3, $4)`,
                [event_id, token, expires_at, issued_by_user_id]
            );

            return this.success(res, { token, event_id, expires_at }, 200);
        } catch (err) {
            return this.error(res, err.message);
        }
    }

    /* 5️⃣ GET ALL EVENTS (The likely source of the error in your query)
     * =========================================================== */
    async getAllEvents(req, res) {
        try {
            const { dept_id, category, semester } = req.query;
            let query = `
                SELECT e.event_id, e.title, e.category, d.name AS dept, e.venue,
                       e.start_at, e.end_at, u.name AS created_by, e.status, e.is_external,
                       (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) as student_count
                FROM events e
                JOIN departments d ON e.dept_id = d.dept_id
                JOIN users u ON e.creator_user_id = u.user_id
                WHERE 1=1
                AND DATE(e.start_at) >= CURRENT_DATE
            `;
            const params = [];

            if (dept_id) {
                params.push(dept_id);
                query += ` AND e.dept_id = $${params.length}`;
            }
            if (category) {
                params.push(category);
                query += ` AND e.category ILIKE $${params.length}`;
            }
            
            // NOTE: The issue is likely when 'semester' is provided, as the original query 
            // you sent seems overly complicated or incorrect for the scope of this function.
            // I am assuming you want to fetch events that ANY student of that semester has registered for.
            if (semester) {
                params.push(semester);
                query += ` AND EXISTS (
                    SELECT 1 FROM registrations r
                    JOIN student_details sd ON r.user_id = sd.user_id
                    WHERE sd.semester = $${params.length} AND r.event_id = e.event_id
                )`;
            }

            const events = await this.db.any(query, params);
            return this.success(res, events, 200);
        } catch (err) {
            // NOTE: The error 'relation "verification_docs" does not exist' is NOT in this file.
            // It must be in another file/route, or perhaps an older, un-updated version of this file 
            // was running in the background when you made the Postman request.
            return this.error(res, err.message);
        }
    }

    /* 6️⃣ GET EVENTS CREATED BY FACULTY 
     * =========================================================== */
    async getCreatedEvents(req, res) {
        try {
            const faculty_user_id = req.params.id;
            const { status } = req.query;

            let query = `
                SELECT e.event_id, e.title, e.category, e.start_at, e.end_at, e.venue, e.status,
                       (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.event_id) AS participants_count
                FROM events e
                WHERE e.creator_user_id = $1
            `;
            const params = [faculty_user_id];
            if (status) {
                params.push(status);
                query += ` AND e.status = $${params.length}`;
            }

            const events = await this.db.any(query, params);

            for (let ev of events) {
                const roles = await this.db.any(
                    `SELECT ea.role, u.user_id, u.name
                     FROM event_assignments ea
                     JOIN users u ON ea.user_id = u.user_id
                     WHERE ea.event_id = $1`,
                    [ev.event_id]
                );

                ev.roles = roles.reduce((acc, r) => {
                    if (!acc[r.role]) acc[r.role] = [];
                    acc[r.role].push({ user_id: r.user_id, name: r.name });
                    return acc;
                }, {});
            }

            return this.success(res, events, 200);
        } catch (err) {
            return this.error(res, err.message);
        }
    }
}