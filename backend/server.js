import express from "express";
import 'dotenv/config';
import cors from "cors";
import morgan from "morgan";
import db from "./config/db.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- ROUTES ---
import adminRoutes from "./routes/adminRoutes.js";
import hodRoutes from "./routes/hodRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import facultyRoutes from "./routes/facultyRoutes.js";
import proctorRoutes from "./routes/proctorRoutes.js";
import FacultyController from "./controllers/facultyController.js";
import ProctorController from "./controllers/proctorController.js";
import authRoutes from "./routes/authRoutes.js";
import debugRoutes from "./routes/debugRoutes.js";
import eventsRoutes from "./routes/eventsRoutes.js";
import proctorSimpleRoutes from "./routes/proctorSimpleRoutes.js";
import facultySimpleRoutes from "./routes/facultySimpleRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// GLOBAL MIDDLEWARE
// Configure CORS to allow frontend dev origin and credentials
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
app.use(
	cors({
		origin: (origin, callback) => {
			// allow requests with no origin (like curl, server-side)
			if (!origin) return callback(null, true);
			if (origin === FRONTEND_ORIGIN) return callback(null, true);
			// allow all localhost origins for convenience
			if (origin.includes("localhost")) return callback(null, true);
			return callback(new Error("Not allowed by CORS"));
		},
		credentials: true,
	})
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Serve static files (uploads) - use absolute path
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Handle favicon requests to prevent 404 errors
app.get('/favicon.ico', (req, res) => res.status(204).end());

// DB CHECK
(async () => {
  try {
    const result = await db.one("SELECT NOW() AS now");
    console.log("✅ Database connected at:", result.now);
	} catch (err) {
		console.error("❌ Database connection failed:", err.message);
		console.warn("⚠️  Starting server in degraded mode — database unavailable. Update clubverse/.env with correct credentials and restart to enable DB features.");
		// Do not exit: allow server to run so frontend and other routes can be developed/tested without a DB.
	}
})();

// --- ROUTE REGISTRATION ---
app.use("/api/admin", adminRoutes);
app.use("/api/hod", hodRoutes);
app.use("/api/students", studentRoutes);
// Instantiate controllers for route factories that expect a controller instance
const facultyController = new FacultyController(db);
const proctorController = new ProctorController(db);

app.use("/api/faculty", facultyRoutes(facultyController));
app.use("/api/proctor", proctorRoutes(proctorController));
app.use("/api/auth", authRoutes);
app.use("/api/debug", debugRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/proctor", proctorSimpleRoutes);
app.use("/api/faculty", facultySimpleRoutes);

// Root / health check
app.get('/', (req, res) => {
	res.json({
		status: 'ok',
		message: 'Campus Activity Backend',
		timestamp: new Date().toISOString()
	});
});

// 404 HANDLER
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Route Not Found",
    path: req.originalUrl,
  });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
	console.error(err.stack || err);
	// Multer/file errors or explicit upload validation -> return 400 with message
	const msg = err && err.message ? err.message : 'Internal Server Error';
	if (msg.includes('Only Excel') || msg.includes('Only Excel or CSV') || msg.includes('Multer')) {
		return res.status(400).json({ status: 'error', message: msg });
	}
	// If the error includes a status code, use it
	if (err && err.statusCode) {
		return res.status(err.statusCode).json({ status: 'error', message: msg });
	}
	// In development, return the original message and stack for easier debugging
	if (process.env.NODE_ENV !== 'production') {
		return res.status(500).json({ status: 'error', message: msg, stack: err && err.stack ? err.stack : null });
	}
	res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});