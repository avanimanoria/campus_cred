// routes/studentRoutes.js

import express from "express";
import {
  getProfile,
  updateProfile,
  submitActivity,
  uploadActivityDocument,
  listActivities,
  getActivity,
  pointsSummary,
  listEvents,
  listEventStudents,
  registerForEvent,
  getMyEvents,
  listNotifications,
  markNotificationRead,
  uploadCertificate,
  getCertificates,
  markEventAttended,
  getStudentActivityPoints
} from "../controllers/studentController.js";

import { readTestUser } from "../middlewares/authMiddleware.js";
import { uploadSingle } from "../middlewares/uploadStudent.js";

const router = express.Router();

// All routes must pass user header
router.use(readTestUser);

// PROFILE
router.get("/profile", getProfile);
router.patch("/profile", updateProfile);

// UPLOAD DOCUMENT
router.post(
  "/activities/:activity_id/doc",
  uploadSingle("file"),
  uploadActivityDocument
);

// UPLOAD CERTIFICATE (for external events)
router.post(
  "/upload-certificate",
  uploadSingle("file"),
  uploadCertificate
);

// GET CERTIFICATES
router.get("/certificates/:usn", getCertificates);

// ACTIVITIES
router.get("/activities", listActivities);
router.get("/activities/:activity_id", getActivity);

// POINTS
router.get("/points", pointsSummary);
router.get("/activity-points/:usn", getStudentActivityPoints);
router.get("/activity-points/:usn", getStudentActivityPoints);

// EVENTS
router.get("/events", listEvents);
router.get("/my-events", getMyEvents);
// Register for event
router.post('/register/:eventId', registerForEvent);
// Mark event as attended
router.patch('/events/:eventId/attended', markEventAttended);
// List students for a specific event (registrations or activity_points fallback)
router.get("/events/:id/students", listEventStudents);

// NOTIFICATIONS
router.get("/notifications", listNotifications);
router.patch("/notifications/:id/read", markNotificationRead);

export default router;
