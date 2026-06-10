import express from "express";
import * as AuthController from "../controllers/authController.js";

const router = express.Router();

// GET /api/auth/check-student?email=foo@bar
router.get("/check-student", AuthController.checkStudentEmail);

// GET /api/auth/by-email?email=foo@bar
router.get("/by-email", AuthController.getUserByEmail);

export default router;
