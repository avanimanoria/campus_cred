import BaseController from './BaseController.js'; 

export default class ProctorController extends BaseController {
    constructor(db) {
        super(db);
    }

    /* 1a. Get Students by Proctor Email (from HOD upload) */
    async getStudentsByProctor(req, res) {
        const proctorEmail = req.query.proctor_email || req.user?.email;

        if (!proctorEmail) {
            return this.error(res, "Missing proctor email in query or auth context.", 400);
        }

        try {
            const query = `
                SELECT DISTINCT ON (student_usn)
                    student_name,
                    student_usn,
                    student_email,
                    semester,
                    proctor_name,
                    proctor_email
                FROM hod_upload_temp
                WHERE LOWER(proctor_email) = LOWER($1)
                ORDER BY student_usn, student_name;
            `;
            const students = await this.db.any(query, [proctorEmail]);
            return this.success(res, students, 200, `Retrieved ${students.length} students for proctor ${proctorEmail}.`);
        } catch (error) {
            console.error("Database Error in getStudentsByProctor:", error.message);
            return this.error(res, "Could not fetch students for proctor.", 500);
        }
    }
    
    /* 1. Get Proctee List */
    async getProcteeList(req, res) { 
        const facultyId = req.params.id;
        const semester = req.query.semester;

        if (!facultyId || !semester) {
            return this.error(res, "Missing faculty ID or semester.", 400);
        }

        try {
            const query = `
                SELECT 
                    u.user_id AS student_id,
                    u.name AS student_name,
                    d.name AS dept_name,
                    sd.semester AS semester
                FROM 
                    users u
                JOIN 
                    student_details sd ON u.user_id = sd.user_id
                JOIN 
                    departments d ON sd.dept_id = d.dept_id
                WHERE 
                    sd.semester = $1
                    AND sd.dept_id IN (
                        SELECT dept_id FROM faculty_details WHERE user_id = $2
                    )
                ORDER BY 
                    u.name;
            `;
            const values = [parseInt(semester, 10), facultyId];

            const procteeList = await this.db.any(query, values);
            
            return this.success(res, procteeList, 200, `Retrieved ${procteeList.length} proctees for semester ${semester}.`);
        } catch (error) {
            console.error("Database Error in getProcteeList:", error.message);
            return this.error(res, "Could not fetch proctee list due to a database error.", 500);
        }
    }
    
    /* 2. Award Points */
    async awardPoints(req, res) { 
        let { user_id, event_id, points, category, semester, awarded_by } = req.body;
        
        console.log("awardPoints input - user_id:", user_id, "type:", typeof user_id);
        
        // If user_id looks like a USN (student_usn), resolve it to actual user_id
        if (user_id && typeof user_id === 'string' && user_id.match(/^[0-9A-Z]+$/)) {
            console.log("Detected USN format, attempting to resolve:", user_id);
            try {
                const student = await this.db.oneOrNone(
                    `SELECT user_id FROM students WHERE student_usn = $1`,
                    [user_id]
                );
                console.log("Student lookup result:", student);
                if (student) {
                    user_id = student.user_id;
                    console.log("Resolved user_id:", user_id);
                }
            } catch (err) {
                console.warn("Could not resolve student USN to user_id:", err.message);
            }
        }
        
        if (!user_id || points === undefined || !category || !semester || !awarded_by) {
            return this.error(res, "Missing required fields for point award (user_id, points, category, semester, awarded_by).", 400);
        }
        
        try {
            const query = `
                INSERT INTO activity_points (user_id, event_id, points, category, semester, awarded_by, awarded_at) 
                VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
                RETURNING *;
            `;
            const values = [user_id, event_id || null, points, category, parseInt(semester, 10), awarded_by];
            
            const result = await this.db.one(query, values); 
            
            return this.success(res, result, 200, "Activity points awarded successfully.");
        } catch (error) {
            if (error.code === '23503') {
                // Catches FK violation on user_id, event_id, or awarded_by
                console.error("FK Violation details:", error.detail);
                return this.error(res, "Foreign Key Violation: The User ID, Proctor ID, or Event ID provided does not exist in the database.", 409);
            }
            console.error("Database Error during awardPoints:", error.message);
            return this.error(res, "A database error occurred while awarding points.", 500);
        }
    }

    /* 3. Verify Document */
    async verifyDocument(req, res) {
        const doc_id = req.params.id; 
        const { verification_status, verified_by, remarks } = req.body;

        if (!doc_id || !verification_status || !verified_by) {
            return this.error(res, "Missing document ID, status, or verifier ID.", 400);
        }

        const validStatuses = ['approved', 'rejected'];
        if (!validStatuses.includes(verification_status)) {
            return this.error(res, "Invalid verification status provided.", 400);
        }

        try {
            // 1) Update compatibility table `activity_docs` if it exists (controllers may expect this)
            const compatQuery = `
                UPDATE activity_docs
                SET verification_status = $1, verified_by = $2, verified_at = NOW(), description = $4
                WHERE doc_id = $3
                RETURNING *;
            `;
            const compatValues = [verification_status, verified_by, doc_id, remarks || null];
            let updatedDocument = null;
            try {
                updatedDocument = await this.db.oneOrNone(compatQuery, compatValues);
            } catch (errCompat) {
                // If compatibility table doesn't exist or update fails, log and continue to update canonical table
                console.warn('activity_docs update skipped or failed:', errCompat.message);
            }

            // 2) Also update canonical `activity_documents` table to reflect verification (if present)
            // Map verification_status ('approved'|'rejected') to boolean `verified`
            const verifiedBool = (verification_status === 'approved');
            const canonQuery = `
                UPDATE activity_documents
                SET verified = $1, remarks = $2
                WHERE document_id = $3
                RETURNING *;
            `;
            const canonValues = [verifiedBool, remarks || null, doc_id];
            try {
                const canonUpdated = await this.db.oneOrNone(canonQuery, canonValues);
                // prefer returning the canonical updated row if available
                if (canonUpdated) updatedDocument = canonUpdated;
            } catch (errCanon) {
                console.warn('activity_documents update skipped or failed:', errCanon.message);
            }

            // 3) Update `documents` table for student certificates if present
            const query = `
                SELECT 
                    e.event_id, 
                    e.title AS event_name, 
                    e.start_at AS event_date,
                    e.category,
                    d.name AS dept_name
                FROM 
                    events e
                JOIN 
                    departments d ON e.dept_id = d.dept_id
                WHERE 
                    e.category = $1 
                    AND e.dept_id = $2
                    AND DATE(e.start_at) >= CURRENT_DATE
                ORDER BY 
                    e.start_at DESC;
            `;

            return this.success(res, updatedDocument, 200, "Document verification status updated successfully.");

        } catch (error) {
            if (error.code === '23503') {
                return this.error(res, "Foreign Key Violation: The Verifier ID does not exist in the users table.", 409);
            }
            console.error("Database Error during verifyDocument:", error.message);
            return this.error(res, "A database error occurred while updating the document.", 500);
        }
    }

    /* 3b. Verify Student Certificate (documents table) */
    async verifyStudentDocument(req, res) {
        const doc_id = req.params.id;
        const { verification_status, verified_by, remarks } = req.body;

        if (!doc_id || !verification_status || !verified_by) {
            return this.error(res, "Missing document ID, status, or verifier ID.", 400);
        }

        const validStatuses = ['approved', 'rejected', 'pending'];
        if (!validStatuses.includes(verification_status)) {
            return this.error(res, "Invalid verification status provided.", 400);
        }

        try {
            const updated = await this.db.oneOrNone(
                `UPDATE documents
                 SET verification_status = $1, verified_by = $2, verified_at = NOW(), description = $4
                 WHERE document_id = $3
                 RETURNING *;`,
                [verification_status, verified_by, doc_id, remarks || null]
            );

            if (!updated) {
                return this.error(res, `Document with ID ${doc_id} not found.`, 404);
            }

            return this.success(res, updated, 200, "Document verification status updated successfully.");
        } catch (error) {
            if (error.code === '23503') {
                return this.error(res, "Foreign Key Violation: The Verifier ID does not exist in the users table.", 409);
            }
            console.error("Database Error during verifyStudentDocument:", error.message);
            return this.error(res, "A database error occurred while updating the document.", 500);
        }
    }

    /* 4. Get Events */
    async getEvents(req, res) {
        const facultyId = req.params.id; 
        const category = req.query.category;
        const deptId = parseInt(req.query.dept_id, 10); 

        if (!facultyId || !category || !deptId) {
            return this.error(res, "Missing faculty ID, category, or department ID.", 400);
        }

        try {
            const query = `
                SELECT 
                    e.event_id, 
                    e.title AS event_name, 
                    e.start_at AS event_date,
                    e.category,
                    d.name AS dept_name
                FROM 
                    events e
                JOIN 
                    departments d ON e.dept_id = d.dept_id
                WHERE 
                    e.category = $1 
                    AND e.dept_id = $2
                                    AND DATE(e.start_at) >= CURRENT_DATE
                ORDER BY 
                    e.start_at DESC;
            `;
            
            const values = [category, deptId];

            const events = await this.db.any(query, values);

            const message = `Found ${events.length} events for category '${category}' and department ID ${deptId}.`;
            
            return this.success(res, events, 200, message); 

        } catch (error) {
            console.error("Database Error in getEvents:", error.message);
            return this.error(res, "Internal Server Error: Could not fetch events due to database issue.", 500);
        }
    }

    /* 5. Add New Category (FIXED: Accepts 'category_name' and handles FK violation) */
    async addCategory(req, res) { 
        // Using category_name to match your Postman request body
        const { category_name, max_points, proposed_by } = req.body;
        
        if (!category_name || max_points === undefined) {
            return this.error(res, "Missing category name or maximum points.", 400);
        }

        const name = category_name;
        // Fallback to a safe ID like 1 if proposed_by is missing/null, assuming it exists
        const proposerId = proposed_by || 1; 

        try {
            const query = `
                INSERT INTO event_categories (name, max_points, proposed_by) 
                VALUES ($1, $2, $3) 
                RETURNING *;
            `;
            const values = [name, max_points, proposerId];
            
            const newCategory = await this.db.one(query, values); 
            
            return this.success(res, newCategory, 201, `Activity category '${name}' added successfully and is pending approval.`);
        } catch (error) {
            if (error.code === '23505') { // Unique constraint violation
                return this.error(res, `Category name '${name}' already exists.`, 409);
            }
            if (error.code === '23503') { // Foreign Key constraint violation
                return this.error(res, `Foreign Key Violation: The proposed_by user ID (${proposerId}) does not exist in the users table. Please use a valid User ID.`, 409);
            }
            console.error("Database Error during addCategory:", error.message);
            return this.error(res, "A database error occurred while adding the category.", 500);
        }
    }

    /* 6. Get Existing Categories */
    async getCategories(req, res) { 
        try {
            const query = `
                SELECT category_id, name AS category_name, max_points, status
                FROM event_categories
                WHERE status = 'approved'
                ORDER BY name ASC;
            `;
            
            const categories = await this.db.any(query);
            
            // Group categories by main category type
            const grouped = {};
            categories.forEach(cat => {
                // Extract main category from name (e.g., "Technical Workshop - Programming" -> "Technical Workshop")
                const parts = cat.category_name.split(' - ');
                const mainCategory = parts[0];
                const subCategory = parts.length > 1 ? parts.slice(1).join(' - ') : null;
                
                if (!grouped[mainCategory]) {
                    grouped[mainCategory] = {
                        name: mainCategory,
                        subcategories: []
                    };
                }
                
                grouped[mainCategory].subcategories.push({
                    id: cat.category_id,
                    name: subCategory || cat.category_name,
                    max_points: cat.max_points,
                    status: cat.status
                });
            });
            
            const groupedArray = Object.values(grouped);
            
            return this.success(res, {
                total: categories.length,
                categories: categories,
                grouped: groupedArray
            }, 200, `Retrieved ${categories.length} activity categories.`);
        } catch (error) {
            console.error("Database Error during getCategories:", error.message);
            return this.error(res, "A database error occurred while fetching categories.", 500);
        }
    }

    /* 4a. Get Registrations for Proctor's Proctees */
    async getRegistrations(req, res) {
        const facultyId = req.params.id;
        const semester = req.query.semester;

        if (!facultyId) {
            return this.error(res, "Missing faculty ID.", 400);
        }

        try {
            let query = `
                SELECT 
                    r.registration_id,
                    r.event_id,
                    e.title AS event_name,
                    r.user_id AS student_id,
                    u.name AS student_name,
                    r.status,
                    r.registered_at
                FROM 
                    registrations r
                JOIN 
                    events e ON r.event_id = e.event_id
                JOIN 
                    users u ON r.user_id = u.user_id
                JOIN 
                    student_details sd ON u.user_id = sd.user_id
                WHERE 
                    sd.dept_id IN (
                        SELECT dept_id FROM faculty_details WHERE user_id = $1
                    )
            `;
            
            const values = [facultyId];
            
            if (semester) {
                query += ` AND sd.semester = $2`;
                values.push(parseInt(semester, 10));
            }
            
            query += ` ORDER BY r.registered_at DESC;`;

            const registrations = await this.db.any(query, values);
            
            return this.success(res, registrations, 200, `Retrieved ${registrations.length} registrations.`);
        } catch (error) {
            console.error("Database Error in getRegistrations:", error.message);
            return this.error(res, "Could not fetch registrations due to a database error.", 500);
        }
    }

    /* 7. Import Activities Bulk */
    async importActivities(req, res) {
        const { activities } = req.body;

        if (!activities || !Array.isArray(activities) || activities.length === 0) {
            return this.error(res, "Missing or invalid activities array.", 400);
        }

        try {
            const insertPromises = activities.map(activity => {
                const { name, category, max_points, semester } = activity;
                
                if (!name || !category) {
                    throw new Error(`Invalid activity: missing name or category`);
                }

                const query = `
                    INSERT INTO activities (name, category, max_points, semester) 
                    VALUES ($1, $2, $3, $4) 
                    ON CONFLICT (name, semester) DO NOTHING
                    RETURNING *;
                `;
                const values = [name, category, max_points || 0, semester || 1];
                
                return this.db.oneOrNone(query, values);
            });

            const results = await Promise.all(insertPromises);
            const inserted = results.filter(r => r !== null);
            
            return this.success(res, inserted, 201, `Successfully imported ${inserted.length} of ${activities.length} activities.`);
        } catch (error) {
            console.error("Database Error during importActivities:", error.message);
            return this.error(res, "A database error occurred while importing activities.", 500);
        }
    }

    /* 8. List Approved Activities */
    async listApprovedActivities(req, res) {
        const semester = req.query.semester;
        const category = req.query.category;

        try {
            let query = `
                SELECT 
                    activity_id,
                    name AS activity_name,
                    category,
                    max_points,
                    semester
                FROM 
                    activities
                WHERE 
                    1=1
            `;
            
            const values = [];
            let paramIndex = 1;
            
            if (semester) {
                query += ` AND semester = $${paramIndex}`;
                values.push(parseInt(semester, 10));
                paramIndex++;
            }
            
            if (category) {
                query += ` AND category = $${paramIndex}`;
                values.push(category);
                paramIndex++;
            }
            
            query += ` ORDER BY category, name ASC;`;

            const activities = await this.db.any(query, values);
            
            return this.success(res, activities, 200, `Retrieved ${activities.length} approved activities.`);
        } catch (error) {
            console.error("Database Error in listApprovedActivities:", error.message);
            return this.error(res, "Could not fetch activities due to a database error.", 500);
        }
    }

    /* Get Total Points for a Student */
    async getStudentTotalPoints(req, res) {
        const { usn } = req.params;

        if (!usn) {
            return this.error(res, "Missing student USN.", 400);
        }

        try {
            // Get student user_id from USN
            const student = await this.db.oneOrNone(
                `SELECT user_id FROM students WHERE student_usn = $1`,
                [usn]
            );

            if (!student) {
                return this.error(res, "Student not found.", 404);
            }

            // Calculate total points from activity_points table
            const result = await this.db.oneOrNone(
                `SELECT COALESCE(SUM(points), 0) as totalPoints FROM activity_points WHERE user_id = $1`,
                [student.user_id]
            );

            return this.success(res, { totalPoints: parseInt(result.totalPoints, 10) }, 200, "Total points retrieved successfully.");
        } catch (error) {
            console.error("Database Error in getStudentTotalPoints:", error.message);
            return this.error(res, "Could not fetch student total points due to a database error.", 500);
        }
    }
}