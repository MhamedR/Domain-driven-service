import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ObjectivesController } from '../controllers/objectivesController';

const router = Router();
const objectivesController = new ObjectivesController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Objectives routes
router.get('/', objectivesController.getObjectives.bind(objectivesController));
router.post('/', objectivesController.createObjective.bind(objectivesController));
router.get('/:id', objectivesController.getObjectiveById.bind(objectivesController));
router.put('/:id', objectivesController.updateObjective.bind(objectivesController));
router.delete('/:id', objectivesController.deleteObjective.bind(objectivesController));

// Milestones routes
router.get('/:id/milestones', objectivesController.getMilestones.bind(objectivesController));
router.post('/:id/milestones', objectivesController.createMilestone.bind(objectivesController));
router.put('/:id/milestones/:milestoneId', objectivesController.updateMilestone.bind(objectivesController));
router.delete('/:id/milestones/:milestoneId', objectivesController.deleteMilestone.bind(objectivesController));

// Progress routes
router.get('/:id/progress', objectivesController.getProgress.bind(objectivesController));
router.post('/:id/progress', objectivesController.logProgress.bind(objectivesController));

export default router;
