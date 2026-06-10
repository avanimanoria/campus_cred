import express from "express";

// This is a route factory that takes the instantiated controller
const proctorRoutes = (controller) => {
    const router = express.Router();

    // If the controller is not provided, return a safe router that responds
    // with a clear error instead of crashing the entire app when binding.
    if (!controller) {
        console.warn('proctorRoutes: controller instance was not provided. Returning stub routes that report 500.');
        router.use((req, res) => {
            return res.status(500).json({ status: 'error', message: 'Proctor routes are not available because the controller instance is missing on server startup.' });
        });
        return router;
    }

    // 1a. Get Students by Proctor Email (from HOD upload mapping)
    router.get('/my-students', controller.getStudentsByProctor.bind(controller));

    // 1. Get Proctee List
    router.get('/:id/students', controller.getProcteeList.bind(controller));

    // 2. Award Points
    router.post('/activity_points/award', controller.awardPoints.bind(controller));

    // 2a. Get Student Total Points
    router.get('/student/:usn/total-points', controller.getStudentTotalPoints.bind(controller));

    // 3. Verify Uploaded Proof (using registration_id in URL, doc_id in body)
    router.post('/registrations/:id/verify-doc', controller.verifyDocument.bind(controller));

    // 3b. Verify Student Certificate (documents table)
    router.post('/documents/:id/verify', controller.verifyStudentDocument.bind(controller));

    // 4a. List registrations for proctor's proctees (optionally filter by semester)
    router.get('/:id/registrations', controller.getRegistrations.bind(controller));

    // 4. Get All Events (for Proctor Overview)
    router.get('/:id/events', controller.getEvents.bind(controller));

    // 5. Add New Category
    router.post('/categories', controller.addCategory.bind(controller));

    // 7. Import activities bulk (sections -> activities table)
    router.post('/import-activities', controller.importActivities.bind(controller));

    // 8. List approved activities (for proctor dashboard)
    router.get('/activities', controller.listApprovedActivities.bind(controller));

    // 6. Get Existing Categories
    router.get('/categories', controller.getCategories.bind(controller));

    return router;
};

export default proctorRoutes;