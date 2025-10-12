import { Request, Response } from 'express';
import { Objective } from '../models/Objective';
import { Milestone } from '../models/Milestone';
import { ProgressLog } from '../models/ProgressLog';
import { RedisService } from '../services/redis';
import { KafkaService } from '../services/kafka';
import { MetricsService } from '../services/metrics';
import { logger } from '../utils/logger';

export class ObjectivesController {
  private kafkaService: KafkaService;
  private metricsService: MetricsService;

  constructor() {
    this.kafkaService = KafkaService.getInstance();
    this.metricsService = MetricsService.getInstance();
  }

  public async getObjectives(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { page = 1, limit = 20, category, status, priority } = req.query;

      // Check cache first
      const cacheKey = `objectives:${userId}:${JSON.stringify(req.query)}`;
      const cachedObjectives = await RedisService.get(cacheKey);
      
      if (cachedObjectives) {
        this.metricsService.recordCacheHit('objectives');
        res.status(200).json({
          success: true,
          data: cachedObjectives,
          cached: true,
        });
        return;
      }

      this.metricsService.recordCacheMiss('objectives');

      // Build query
      const query: any = { userId };
      
      if (category) {
        query.category = category;
      }
      
      if (status) {
        query.status = status;
      }
      
      if (priority) {
        query.priority = priority;
      }

      // Get objectives with pagination
      const skip = (Number(page) - 1) * Number(limit);
      const objectives = await Objective.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('milestones')
        .populate('category');

      const total = await Objective.countDocuments(query);

      const result = {
        objectives,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      };

      // Cache the result
      await RedisService.set(cacheKey, result, 300); // 5 minutes

      this.metricsService.recordHttpRequest('GET', '/objectives', 200, 0);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error getting objectives:', error);
      this.metricsService.recordHttpRequest('GET', '/objectives', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to get objectives',
      });
    }
  }

  public async createObjective(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const objectiveData = { ...req.body, userId };

      const objective = new Objective(objectiveData);
      await objective.save();

      // Publish event
      await this.kafkaService.publishObjectiveCreated({
        id: objective._id,
        userId: objective.userId,
        title: objective.title,
        category: objective.category,
        createdAt: new Date(),
      });

      // Record metrics
      this.metricsService.recordObjectiveCreated(objective.category, objective.priority);
      this.metricsService.recordHttpRequest('POST', '/objectives', 201, 0);

      res.status(201).json({
        success: true,
        data: objective,
        message: 'Objective created successfully',
      });
    } catch (error) {
      logger.error('Error creating objective:', error);
      this.metricsService.recordHttpRequest('POST', '/objectives', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to create objective',
      });
    }
  }

  public async getObjectiveById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const objective = await Objective.findOne({ _id: id, userId })
        .populate('milestones')
        .populate('category');

      if (!objective) {
        res.status(404).json({
          success: false,
          message: 'Objective not found',
        });
        return;
      }

      this.metricsService.recordHttpRequest('GET', '/objectives/:id', 200, 0);

      res.status(200).json({
        success: true,
        data: objective,
      });
    } catch (error) {
      logger.error('Error getting objective:', error);
      this.metricsService.recordHttpRequest('GET', '/objectives/:id', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to get objective',
      });
    }
  }

  public async updateObjective(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const objective = await Objective.findOneAndUpdate(
        { _id: id, userId },
        req.body,
        { new: true, runValidators: true }
      );

      if (!objective) {
        res.status(404).json({
          success: false,
          message: 'Objective not found',
        });
        return;
      }

      // Publish event
      await this.kafkaService.publishObjectiveUpdated({
        id: objective._id,
        userId: objective.userId,
        title: objective.title,
        category: objective.category,
        updatedAt: new Date(),
      });

      // Record metrics
      this.metricsService.recordObjectiveUpdated(objective.category, objective.priority);
      this.metricsService.recordHttpRequest('PUT', '/objectives/:id', 200, 0);

      res.status(200).json({
        success: true,
        data: objective,
        message: 'Objective updated successfully',
      });
    } catch (error) {
      logger.error('Error updating objective:', error);
      this.metricsService.recordHttpRequest('PUT', '/objectives/:id', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to update objective',
      });
    }
  }

  public async deleteObjective(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const objective = await Objective.findOneAndDelete({ _id: id, userId });

      if (!objective) {
        res.status(404).json({
          success: false,
          message: 'Objective not found',
        });
        return;
      }

      // Publish event
      await this.kafkaService.publishObjectiveDeleted({
        id: objective.value?._id || '',
        userId: objective.value?.userId || '',
        title: objective.value?.title || '',
        category: objective.value?.category || '',
        deletedAt: new Date(),
      });

      // Record metrics
      this.metricsService.recordObjectiveDeleted(objective.value?.category || '', objective.value?.priority || '');
      this.metricsService.recordHttpRequest('DELETE', '/objectives/:id', 200, 0);

      res.status(200).json({
        success: true,
        message: 'Objective deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting objective:', error);
      this.metricsService.recordHttpRequest('DELETE', '/objectives/:id', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to delete objective',
      });
    }
  }

  // Milestone methods
  public async getMilestones(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const milestones = await Milestone.find({ objectiveId: id, userId })
        .sort({ createdAt: -1 });

      this.metricsService.recordHttpRequest('GET', '/objectives/:id/milestones', 200, 0);

      res.status(200).json({
        success: true,
        data: milestones,
      });
    } catch (error) {
      logger.error('Error getting milestones:', error);
      this.metricsService.recordHttpRequest('GET', '/objectives/:id/milestones', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to get milestones',
      });
    }
  }

  public async createMilestone(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const milestoneData = { ...req.body, objectiveId: id, userId };

      const milestone = new Milestone(milestoneData);
      await milestone.save();

      // Record metrics
      this.metricsService.recordMilestoneCreated('default');
      this.metricsService.recordHttpRequest('POST', '/objectives/:id/milestones', 201, 0);

      res.status(201).json({
        success: true,
        data: milestone,
        message: 'Milestone created successfully',
      });
    } catch (error) {
      logger.error('Error creating milestone:', error);
      this.metricsService.recordHttpRequest('POST', '/objectives/:id/milestones', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to create milestone',
      });
    }
  }

  public async updateMilestone(req: Request, res: Response): Promise<void> {
    try {
      const { id, milestoneId } = req.params;
      const userId = (req as any).user.id;

      const milestone = await Milestone.findOneAndUpdate(
        { _id: milestoneId, objectiveId: id, userId },
        req.body,
        { new: true, runValidators: true }
      );

      if (!milestone) {
        res.status(404).json({
          success: false,
          message: 'Milestone not found',
        });
        return;
      }

      this.metricsService.recordHttpRequest('PUT', '/objectives/:id/milestones/:milestoneId', 200, 0);

      res.status(200).json({
        success: true,
        data: milestone,
        message: 'Milestone updated successfully',
      });
    } catch (error) {
      logger.error('Error updating milestone:', error);
      this.metricsService.recordHttpRequest('PUT', '/objectives/:id/milestones/:milestoneId', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to update milestone',
      });
    }
  }

  public async deleteMilestone(req: Request, res: Response): Promise<void> {
    try {
      const { id, milestoneId } = req.params;
      const userId = (req as any).user.id;

      const milestone = await Milestone.findOneAndDelete({
        _id: milestoneId,
        objectiveId: id,
        userId,
      });

      if (!milestone) {
        res.status(404).json({
          success: false,
          message: 'Milestone not found',
        });
        return;
      }

      this.metricsService.recordHttpRequest('DELETE', '/objectives/:id/milestones/:milestoneId', 200, 0);

      res.status(200).json({
        success: true,
        message: 'Milestone deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting milestone:', error);
      this.metricsService.recordHttpRequest('DELETE', '/objectives/:id/milestones/:milestoneId', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to delete milestone',
      });
    }
  }

  // Progress methods
  public async getProgress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const progress = await ProgressLog.find({ objectiveId: id, userId })
        .sort({ createdAt: -1 });

      this.metricsService.recordHttpRequest('GET', '/objectives/:id/progress', 200, 0);

      res.status(200).json({
        success: true,
        data: progress,
      });
    } catch (error) {
      logger.error('Error getting progress:', error);
      this.metricsService.recordHttpRequest('GET', '/objectives/:id/progress', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to get progress',
      });
    }
  }

  public async logProgress(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const progressData = { ...req.body, objectiveId: id, userId };

      const progress = new ProgressLog(progressData);
      await progress.save();

      // Record metrics
      this.metricsService.recordProgressLogged('default');
      this.metricsService.recordHttpRequest('POST', '/objectives/:id/progress', 201, 0);

      res.status(201).json({
        success: true,
        data: progress,
        message: 'Progress logged successfully',
      });
    } catch (error) {
      logger.error('Error logging progress:', error);
      this.metricsService.recordHttpRequest('POST', '/objectives/:id/progress', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to log progress',
      });
    }
  }
}
