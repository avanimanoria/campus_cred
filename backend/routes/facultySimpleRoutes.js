import express from 'express';
import { readTestUser } from '../middlewares/authMiddleware.js';
import { createEventSimple, getParticipantsSimple } from '../controllers/facultySimpleController.js';

const router = express.Router();
router.use(readTestUser);

router.post('/create-event', createEventSimple);
router.get('/participants/:eventId', getParticipantsSimple);

export default router;
