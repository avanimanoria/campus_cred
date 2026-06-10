import express from "express";

// Route factory for faculty-related endpoints. Expects a FacultyController instance.
const facultyRoutes = (controller) => {
    const router = express.Router();

    // Create a new event (faculty creates as 'pending' so HOD approves)
    router.post("/create-event", controller.createEvent.bind(controller));

    // Assign a role for an event (volunteer, organizer, etc.)
    router.post("/:id/assign-role", controller.assignRole.bind(controller));

    // Get participants for a specific event
    router.get("/:id/participants", controller.getParticipants.bind(controller));

    // Get event students with full details (registered for specific event)
    router.get("/events/:id/students", controller.getEventStudents.bind(controller));

    // Generate QR token for attendance
    router.post("/:id/generate-qr", controller.generateQR.bind(controller));

    // Get all events (supports dept_id, category, semester query params)
    router.get("/events", controller.getAllEvents.bind(controller));

    // Get events created by a specific faculty user
    router.get("/created/:id", controller.getCreatedEvents.bind(controller));

    return router;
};

export default facultyRoutes;