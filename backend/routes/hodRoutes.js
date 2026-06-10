// routes/hodRoutes.js
import express from "express";
import multer from "multer";
import { readTestUser } from "../middlewares/authMiddleware.js";
import * as HODController from "../controllers/hodController.js";

const router = express.Router();

// ✅ Mock Authentication Middleware
router.use(readTestUser);

// ✅ Multer setup (Excel file upload)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Accept XLSX, XLS and CSV content-types and fallback to originalname check
    const allowedMime = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/csv",
    ];
    const extAllowed = file.originalname && /\.(xlsx|xls|csv)$/i.test(file.originalname);
    const allowed = allowedMime.includes(file.mimetype) || extAllowed;
    if (allowed) cb(null, true);
    else cb(new Error("Only Excel or CSV files are allowed!"));
  },
});

// =====================================================
// ✅ ROUTES
// =====================================================

// 1️⃣ Upload Excel (Students + Proctors)
router.post(
  "/:dept_id/users/upload",
  upload.single("file"),
  (req, res, next) => {
    console.log(`📤 Upload route hit for department ${req.params.dept_id}`);
    next();
  },
  HODController.uploadDeptUserData
);

// Alias: POST /api/hod/upload-excel -> accepts dept_id in body or query (dev convenience)
// Accepts both 'file' and 'excel' field names for frontend compatibility
router.post(
  "/upload-excel",
  upload.single("excel"),
  (req, res, next) => {
    // allow dept_id in body or query, default to 1
    const dept = req.body?.dept_id || req.query?.dept_id || '1';
    req.params = req.params || {};
    req.params.dept_id = String(dept);
    console.log(`📤 Upload alias hit for department ${req.params.dept_id}`);
    next();
  },
  HODController.uploadDeptUserData
);

// 2️⃣ Fetch Department Users (Students + Proctors)
router.get(
  "/:dept_id/users",
  (req, res, next) => {
    console.log(`📥 Fetching users for department ${req.params.dept_id}`);
    next();
  },
  HODController.getDepartmentUsers
);

// 2.1️⃣ Fetch HOD upload rows (raw uploaded rows for dashboard)
router.get(
  "/:dept_id/uploads",
  (req, res, next) => {
    console.log(`📥 Fetching HOD uploads for department ${req.params.dept_id}`);
    next();
  },
  HODController.getHodUploads
);

// 3️⃣ Approve Event
router.post(
  "/:dept_id/events/approve",
  (req, res, next) => {
    console.log(`📋 Approving event for department ${req.params.dept_id}`);
    next();
  },
  HODController.approveEvent
);

// 3.1️⃣ Get pending events for HOD to review
router.get(
  "/:dept_id/events/pending",
  (req, res, next) => {
    console.log(`📥 Fetching pending events for department ${req.params.dept_id}`);
    next();
  },
  HODController.getPendingEvents
);

// 3.2️⃣ Get pending categories for HOD to review
router.get(
  "/:dept_id/categories/pending",
  (req, res, next) => {
    console.log(`📥 Fetching pending categories for department ${req.params.dept_id}`);
    next();
  },
  HODController.getPendingCategories
);

// 3.3️⃣ Approve Category
router.post(
  "/:dept_id/categories/approve",
  (req, res, next) => {
    console.log(`📋 Approving category for department ${req.params.dept_id}`);
    next();
  },
  HODController.approveCategory
);

// 3.4️⃣ Reject Category
router.post(
  "/:dept_id/categories/reject",
  (req, res, next) => {
    console.log(`🚫 Rejecting category for department ${req.params.dept_id}`);
    next();
  },
  HODController.rejectCategory
);

// 4️⃣ Approve Activity Points
router.post(
  "/:dept_id/points/approve",
  (req, res, next) => {
    console.log(`🏅 Approving activity points for department ${req.params.dept_id}`);
    next();
  },
  HODController.approveActivityPoints
);

// 5️⃣ Approve Documents
router.post(
  "/:dept_id/documents/approve",
  (req, res, next) => {
    console.log(`📑 Approving documents for department ${req.params.dept_id}`);
    next();
  },
  HODController.approveDocument
);

// =====================================================
// ✅ SIMPLIFIED ROUTES (without dept_id in path)
// For frontend dashboard convenience - default to dept_id=1
// =====================================================

// GET pending events
router.get("/pending-events", (req, res, next) => {
  const dept_id = req.query.dept_id || '1';
  req.params = { dept_id };
  console.log(`📥 Fetching pending events for dept ${dept_id}`);
  next();
}, HODController.getPendingEvents);

// GET approved events
router.get("/approved-events", (req, res, next) => {
  const dept_id = req.query.dept_id || '1';
  req.params = { dept_id };
  console.log(`✅ Fetching approved events for dept ${dept_id}`);
  next();
}, HODController.getApprovedEvents);

// GET proctor-student mappings
router.get("/proctor-mappings", (req, res, next) => {
  const dept_id = req.query.dept_id || '1';
  req.params = { dept_id };
  console.log(`📥 Fetching proctor mappings for dept ${dept_id}`);
  next();
}, HODController.getDepartmentUsers);

// POST approve event
router.post("/approve-event/:event_id", (req, res, next) => {
  const { event_id } = req.params;
  const dept_id = req.query.dept_id || req.body?.dept_id || '1';
  req.params = { dept_id };
  req.body = { ...req.body, event_id: parseInt(event_id) };
  console.log(`📋 Approving event ${event_id} for dept ${dept_id}`);
  next();
}, HODController.approveEvent);

// POST reject event
router.post("/reject-event/:event_id", (req, res, next) => {
  const { event_id } = req.params;
  const dept_id = req.query.dept_id || req.body?.dept_id || '1';
  req.params = { dept_id };
  req.body = { ...req.body, event_id: parseInt(event_id) };
  console.log(`🚫 Rejecting event ${event_id} for dept ${dept_id}`);
  next();
}, HODController.rejectEvent);

// GET check if email is registered (for signup validation)
router.get("/check-email/:email", (req, res, next) => {
  const { email } = req.params;
  console.log(`📧 Checking if email is registered: ${email}`);
  next();
}, HODController.checkEmailRegistered);

// =============================
// Category Routes (simplified)
// =============================

// GET pending categories
router.get("/pending-categories", (req, res, next) => {
  const dept_id = req.query.dept_id || '1';
  req.params = { dept_id };
  console.log(`📥 Fetching pending categories for dept ${dept_id}`);
  next();
}, HODController.getPendingCategories);

// POST approve category
router.post("/approve-category/:category_id", (req, res, next) => {
  const { category_id } = req.params;
  const dept_id = req.query.dept_id || req.body?.dept_id || '1';
  req.params = { dept_id };
  req.body = { ...req.body, category_id: parseInt(category_id) };
  console.log(`📋 Approving category ${category_id} for dept ${dept_id}`);
  next();
}, HODController.approveCategory);

// POST reject category
router.post("/reject-category/:category_id", (req, res, next) => {
  const { category_id } = req.params;
  const dept_id = req.query.dept_id || req.body?.dept_id || '1';
  req.params = { dept_id };
  req.body = { ...req.body, category_id: parseInt(category_id) };
  console.log(`🚫 Rejecting category ${category_id} for dept ${dept_id}`);
  next();
}, HODController.rejectCategory);

export default router;

