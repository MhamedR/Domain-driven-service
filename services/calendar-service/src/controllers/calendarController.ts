import { Request, Response } from 'express';
import { Event } from '../models/Event';
import { Reminder } from '../models/Reminder';
import { RecurringPattern } from '../models/RecurringPattern';
import { RedisService } from '../services/redis';
import { KafkaService } from '../services/kafka';
import { MetricsService } from '../services/metrics';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Calendar Controller - Handles calendar-related operations
 * 
 * This controller handles:
 * - Event CRUD operations
 * - Reminder management
 * - Recurring pattern operations
 * - Calendar analytics
 * - Cache management
 * - Event publishing
 */

export class CalendarController {
  /**
   * Get all events for a user
   */
  public async getEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 20, category, status, startDate, endDate } = req.query;

      // Check cache first
      const cacheKey = `events:${userId}:${JSON.stringify(req.query)}`;
      const cachedEvents = await RedisService.get(cacheKey);
      
      if (cachedEvents) {
        res.status(200).json({
          success: true,
          data: cachedEvents,
          cached: true,
        });
        return;
      }

      // Build query
      const query: any = { userId };
      
      if (category) {
        query.category = category;
      }
      
      if (status) {
        query.status = status;
      }
      
      if (startDate && endDate) {
        query.startDate = { $gte: new Date(startDate as string) };
        query.endDate = { $lte: new Date(endDate as string) };
      }

      // Execute query
      const events = await Event.find(query)
        .sort({ startDate: 1 })
        .limit(parseInt(limit as string))
        .skip((parseInt(page as string) - 1) * parseInt(limit as string));

      // Cache results
      await RedisService.set(cacheKey, events, 3600); // 1 hour

      res.status(200).json({
        success: true,
        data: events,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: events.length,
        },
      });

    } catch (error) {
      logger.error('Error getting events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve events',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a specific event
   */
  public async getEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const event = await Event.findOne({ _id: id, userId });

      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: event,
      });

    } catch (error) {
      logger.error('Error getting event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a new event
   */
  public async createEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const eventData = { ...req.body, userId };

      const event = new Event(eventData);
      await event.save();

      // Clear user cache
      await RedisService.clearUserCache(userId);

      // Publish event
      await KafkaService.publishEventCreated({
        id: event._id,
        userId: event.userId,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        category: event.category,
        status: event.status,
        createdAt: event.createdAt,
      });

      // Record metrics
      MetricsService.recordEventCreated(userId, event.category);

      res.status(201).json({
        success: true,
        data: event,
        message: 'Event created successfully',
      });

    } catch (error) {
      logger.error('Error creating event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update an event
   */
  public async updateEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const updateData = req.body;

      const event = await Event.findOneAndUpdate(
        { _id: id, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
        });
        return;
      }

      // Clear user cache
      await RedisService.clearUserCache(userId);

      // Publish event
      await KafkaService.publishEventUpdated({
        id: event._id,
        userId: event.userId,
        title: event.title,
        startDate: event.startDate,
        endDate: event.endDate,
        category: event.category,
        status: event.status,
        updatedAt: event.updatedAt,
      });

      // Record metrics
      MetricsService.recordEventUpdated(userId, event.category);

      res.status(200).json({
        success: true,
        data: event,
        message: 'Event updated successfully',
      });

    } catch (error) {
      logger.error('Error updating event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete an event
   */
  public async deleteEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const event = await Event.findOneAndDelete({ _id: id, userId });

      if (!event) {
        res.status(404).json({
          success: false,
          message: 'Event not found',
        });
        return;
      }

      // Clear user cache
      await RedisService.clearUserCache(userId);

      // Publish event
      await KafkaService.publishEventDeleted({
        id: event.value?._id || '',
        userId: event.value?.userId || '',
        title: event.value?.title || '',
        category: event.value?.category || '',
        deletedAt: new Date(),
      });

      // Record metrics
      MetricsService.recordEventDeleted(userId, event.value?.category || '');

      res.status(200).json({
        success: true,
        message: 'Event deleted successfully',
      });

    } catch (error) {
      logger.error('Error deleting event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get upcoming events
   */
  public async getUpcomingEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { limit = 10, hours = 24 } = req.query;

      const now = new Date();
      const upcomingTime = new Date(now.getTime() + (parseInt(hours as string) * 60 * 60 * 1000));

      const events = await Event.find({
        userId,
        startDate: { $gte: now, $lte: upcomingTime },
        status: { $ne: 'cancelled' },
      })
        .sort({ startDate: 1 })
        .limit(parseInt(limit as string));

      res.status(200).json({
        success: true,
        data: events,
      });

    } catch (error) {
      logger.error('Error getting upcoming events:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve upcoming events',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get events by date range
   */
  public async getEventsByDateRange(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          message: 'Start date and end date are required',
        });
        return;
      }

      const events = await Event.find({
        userId,
        startDate: { $gte: new Date(startDate as string) },
        endDate: { $lte: new Date(endDate as string) },
      }).sort({ startDate: 1 });

      res.status(200).json({
        success: true,
        data: events,
      });

    } catch (error) {
      logger.error('Error getting events by date range:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve events by date range',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get events by category
   */
  public async getEventsByCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { category } = req.query;

      if (!category) {
        res.status(400).json({
          success: false,
          message: 'Category is required',
        });
        return;
      }

      const events = await Event.find({
        userId,
        category,
        status: { $ne: 'cancelled' },
      }).sort({ startDate: 1 });

      res.status(200).json({
        success: true,
        data: events,
      });

    } catch (error) {
      logger.error('Error getting events by category:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve events by category',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all reminders for a user
   */
  public async getReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 20, status, type } = req.query;

      const query: any = { userId };
      
      if (status) {
        query.status = status;
      }
      
      if (type) {
        query.type = type;
      }

      const reminders = await Reminder.find(query)
        .sort({ reminderTime: 1 })
        .limit(parseInt(limit as string))
        .skip((parseInt(page as string) - 1) * parseInt(limit as string));

      res.status(200).json({
        success: true,
        data: reminders,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: reminders.length,
        },
      });

    } catch (error) {
      logger.error('Error getting reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve reminders',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a specific reminder
   */
  public async getReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const reminder = await Reminder.findOne({ _id: id, userId });

      if (!reminder) {
        res.status(404).json({
          success: false,
          message: 'Reminder not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: reminder,
      });

    } catch (error) {
      logger.error('Error getting reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve reminder',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a new reminder
   */
  public async createReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const reminderData = { ...req.body, userId };

      const reminder = new Reminder(reminderData);
      await reminder.save();

      // Clear user cache
      await RedisService.clearUserCache(userId);

      // Publish event
      await KafkaService.publishReminderCreated({
        id: reminder._id,
        userId: reminder.userId,
        eventId: reminder.eventId,
        title: reminder.title,
        reminderTime: reminder.reminderTime,
        type: reminder.type,
        status: reminder.status,
        createdAt: reminder.createdAt,
      });

      // Record metrics
      MetricsService.recordReminderCreated(userId, reminder.type);

      res.status(201).json({
        success: true,
        data: reminder,
        message: 'Reminder created successfully',
      });

    } catch (error) {
      logger.error('Error creating reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create reminder',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update a reminder
   */
  public async updateReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const updateData = req.body;

      const reminder = await Reminder.findOneAndUpdate(
        { _id: id, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!reminder) {
        res.status(404).json({
          success: false,
          message: 'Reminder not found',
        });
        return;
      }

      // Clear user cache
      await RedisService.clearUserCache(userId);

      // Publish event
      await KafkaService.publishReminderUpdated({
        id: reminder._id,
        userId: reminder.userId,
        eventId: reminder.eventId,
        title: reminder.title,
        reminderTime: reminder.reminderTime,
        type: reminder.type,
        status: reminder.status,
        updatedAt: reminder.updatedAt,
      });

      res.status(200).json({
        success: true,
        data: reminder,
        message: 'Reminder updated successfully',
      });

    } catch (error) {
      logger.error('Error updating reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update reminder',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a reminder
   */
  public async deleteReminder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const reminder = await Reminder.findOneAndDelete({ _id: id, userId });

      if (!reminder) {
        res.status(404).json({
          success: false,
          message: 'Reminder not found',
        });
        return;
      }

      // Clear user cache
      await RedisService.clearUserCache(userId);

      // Publish event
      await KafkaService.publishReminderDeleted({
        id: reminder.value?._id || '',
        userId: reminder.value?.userId || '',
        eventId: reminder.value?.eventId || '',
        title: reminder.value?.title || '',
        deletedAt: new Date(),
      });

      res.status(200).json({
        success: true,
        message: 'Reminder deleted successfully',
      });

    } catch (error) {
      logger.error('Error deleting reminder:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete reminder',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get upcoming reminders
   */
  public async getUpcomingReminders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { limit = 10, hours = 24 } = req.query;

      const now = new Date();
      const upcomingTime = new Date(now.getTime() + (parseInt(hours as string) * 60 * 60 * 1000));

      const reminders = await Reminder.find({
        userId,
        reminderTime: { $gte: now, $lte: upcomingTime },
        status: 'pending',
      })
        .sort({ reminderTime: 1 })
        .limit(parseInt(limit as string));

      res.status(200).json({
        success: true,
        data: reminders,
      });

    } catch (error) {
      logger.error('Error getting upcoming reminders:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve upcoming reminders',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get reminders by event
   */
  public async getRemindersByEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { eventId } = req.params;

      const reminders = await Reminder.find({
        userId,
        eventId,
      }).sort({ reminderTime: 1 });

      res.status(200).json({
        success: true,
        data: reminders,
      });

    } catch (error) {
      logger.error('Error getting reminders by event:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve reminders by event',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get all recurring patterns for a user
   */
  public async getRecurringPatterns(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page = 1, limit = 20, frequency, isActive } = req.query;

      const query: any = { userId };
      
      if (frequency) {
        query.frequency = frequency;
      }
      
      if (isActive !== undefined) {
        query.isActive = isActive === 'true';
      }

      const patterns = await RecurringPattern.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit as string))
        .skip((parseInt(page as string) - 1) * parseInt(limit as string));

      res.status(200).json({
        success: true,
        data: patterns,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total: patterns.length,
        },
      });

    } catch (error) {
      logger.error('Error getting recurring patterns:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recurring patterns',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get a specific recurring pattern
   */
  public async getRecurringPattern(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const pattern = await RecurringPattern.findOne({ _id: id, userId });

      if (!pattern) {
        res.status(404).json({
          success: false,
          message: 'Recurring pattern not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: pattern,
      });

    } catch (error) {
      logger.error('Error getting recurring pattern:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recurring pattern',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Create a new recurring pattern
   */
  public async createRecurringPattern(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const patternData = { ...req.body, userId };

      const pattern = new RecurringPattern(patternData);
      await pattern.save();

      // Clear user cache
      await RedisService.clearUserCache(userId);

      // Record metrics
      MetricsService.recordRecurringPatternCreated(userId, pattern.frequency);

      res.status(201).json({
        success: true,
        data: pattern,
        message: 'Recurring pattern created successfully',
      });

    } catch (error) {
      logger.error('Error creating recurring pattern:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create recurring pattern',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update a recurring pattern
   */
  public async updateRecurringPattern(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const updateData = req.body;

      const pattern = await RecurringPattern.findOneAndUpdate(
        { _id: id, userId },
        updateData,
        { new: true, runValidators: true }
      );

      if (!pattern) {
        res.status(404).json({
          success: false,
          message: 'Recurring pattern not found',
        });
        return;
      }

      // Clear user cache
      await RedisService.clearUserCache(userId);

      res.status(200).json({
        success: true,
        data: pattern,
        message: 'Recurring pattern updated successfully',
      });

    } catch (error) {
      logger.error('Error updating recurring pattern:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update recurring pattern',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Delete a recurring pattern
   */
  public async deleteRecurringPattern(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const pattern = await RecurringPattern.findOneAndDelete({ _id: id, userId });

      if (!pattern) {
        res.status(404).json({
          success: false,
          message: 'Recurring pattern not found',
        });
        return;
      }

      // Clear user cache
      await RedisService.clearUserCache(userId);

      res.status(200).json({
        success: true,
        message: 'Recurring pattern deleted successfully',
      });

    } catch (error) {
      logger.error('Error deleting recurring pattern:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete recurring pattern',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get event analytics
   */
  public async getEventAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const query: any = { userId };
      
      if (startDate && endDate) {
        query.startDate = { $gte: new Date(startDate as string) };
        query.endDate = { $lte: new Date(endDate as string) };
      }

      const analytics = await Event.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalEvents: { $sum: 1 },
            completedEvents: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            cancelledEvents: {
              $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
            },
            eventsByCategory: {
              $push: '$category'
            },
            eventsByPriority: {
              $push: '$priority'
            }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: analytics[0] || {
          totalEvents: 0,
          completedEvents: 0,
          cancelledEvents: 0,
          eventsByCategory: [],
          eventsByPriority: []
        },
      });

    } catch (error) {
      logger.error('Error getting event analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve event analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get reminder analytics
   */
  public async getReminderAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { startDate, endDate } = req.query;

      const query: any = { userId };
      
      if (startDate && endDate) {
        query.reminderTime = { $gte: new Date(startDate as string) };
        query.reminderTime = { $lte: new Date(endDate as string) };
      }

      const analytics = await Reminder.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalReminders: { $sum: 1 },
            sentReminders: {
              $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
            },
            failedReminders: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            remindersByType: {
              $push: '$type'
            }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: analytics[0] || {
          totalReminders: 0,
          sentReminders: 0,
          failedReminders: 0,
          remindersByType: []
        },
      });

    } catch (error) {
      logger.error('Error getting reminder analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve reminder analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get recurring analytics
   */
  public async getRecurringAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      const analytics = await RecurringPattern.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            totalPatterns: { $sum: 1 },
            activePatterns: {
              $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
            },
            patternsByFrequency: {
              $push: '$frequency'
            }
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: analytics[0] || {
          totalPatterns: 0,
          activePatterns: 0,
          patternsByFrequency: []
        },
      });

    } catch (error) {
      logger.error('Error getting recurring analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recurring analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Sync calendar
   */
  public async syncCalendar(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const { source, externalId } = req.body;

      // Clear user cache
      await RedisService.clearUserCache(userId);

      // TODO: Implement calendar sync logic
      // This would typically involve:
      // 1. Fetching events from external calendar
      // 2. Comparing with local events
      // 3. Creating/updating/deleting events as needed
      // 4. Publishing sync events

      res.status(200).json({
        success: true,
        message: 'Calendar sync initiated',
        data: {
          source,
          externalId,
          syncedAt: new Date(),
        },
      });

    } catch (error) {
      logger.error('Error syncing calendar:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to sync calendar',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get sync status
   */
  public async getSyncStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;

      // TODO: Implement sync status logic
      // This would typically involve:
      // 1. Checking last sync time
      // 2. Checking sync status
      // 3. Returning sync information

      res.status(200).json({
        success: true,
        data: {
          lastSync: new Date(),
          status: 'completed',
          syncedEvents: 0,
          errors: [],
        },
      });

    } catch (error) {
      logger.error('Error getting sync status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve sync status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
