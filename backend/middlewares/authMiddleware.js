// middlewares/authMiddleware.js

/**
 * @function readTestUser
 * @description Authentication middleware for development/testing environment.
 * Requires 'x-user-id' and optional 'x-user-role' headers.
 * - Student role uses USN for ID.
 * - Admin/HOD/Faculty roles use numeric staff ID.
 */
export const readTestUser = (req, res, next) => {
	let userId = req.headers["x-user-id"];
	let role = req.headers["x-user-role"] || "student"; // Default to student

	// DEV convenience: if running locally and header is missing, default to HOD user id 1
	if (!userId && process.env.NODE_ENV !== 'production') {
		userId = '1';
		role = 'hod';
		// continue with defaults
	}

	if (!userId) {
		return res.status(400).json({ error: "Missing x-user-id header" });
	}

  // 1. Handle Student (USN)
  if (role.toLowerCase() === "student") {
    req.user = {
      role: "student",
      student_usn: userId,    // Always USN for student queries
      user_id: userId         // Same as USN for consistency
    };
    return next();
  }

  // 2. Handle Staff (HOD, Admin, Faculty, Proctor) - requires numeric ID
  const numericId = Number(userId);
  if (isNaN(numericId) || numericId <= 0) {
    return res.status(400).json({
      status: "error",
      message: `Invalid x-user-id. Must be a positive number for role: ${role}`
    });
  }

  req.user = {
    role: role.toLowerCase(),
    user_id: numericId // Numeric staff ID
  };

  next();
};

// You can add other middleware functions here if needed,
// such as a role-checking function:
// export const checkRole = (allowedRoles) => (req, res, next) => { ... }