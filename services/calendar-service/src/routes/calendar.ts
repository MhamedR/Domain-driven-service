import { Router } from 'express';
import { CalendarController } from '../controllers/calendarController';
import { asyncHandler } from '../middleware/errorHandler';
import { requirePermission } from '../middleware/auth';

/**
 * Calendar Routes - API endpoints for calendar operations
 * 
 * This router handles:
 * - Event CRUD operations
 * - Reminder management
 * - Recurring pattern operations
 * - Calendar queries and filters
 */

const router = Router();
const calendarController = new CalendarController();

// Event routes
router.get('/events', asyncHandler(calendarController.getEvents));
router.get('/events/:id', asyncHandler(calendarController.getEvent));
router.post('/events', asyncHandler(calendarController.createEvent));
router.put('/events/:id', asyncHandler(calendarController.updateEvent));
router.delete('/events/:id', asyncHandler(calendarController.deleteEvent));

// Event queries
router.get('/events/upcoming', asyncHandler(calendarController.getUpcomingEvents));
router.get('/events/by-date', asyncHandler(calendarController.getEventsByDateRange));
router.get('/events/by-category', asyncHandler(calendarController.getEventsByCategory));

// Reminder routes
router.get('/reminders', asyncHandler(calendarController.getReminders));
router.get('/reminders/:id', asyncHandler(calendarController.getReminder));
router.post('/reminders', asyncHandler(calendarController.createReminder));
router.put('/reminders/:id', asyncHandler(calendarController.updateReminder));
router.delete('/reminders/:id', asyncHandler(calendarController.deleteReminder));

// Reminder queries
router.get('/reminders/upcoming', asyncHandler(calendarController.getUpcomingReminders));
router.get('/reminders/by-event/:eventId', asyncHandler(calendarController.getRemindersByEvent));

// Recurring pattern routes
router.get('/recurring-patterns', asyncHandler(calendarController.getRecurringPatterns));
router.get('/recurring-patterns/:id', asyncHandler(calendarController.getRecurringPattern));
router.post('/recurring-patterns', asyncHandler(calendarController.createRecurringPattern));
router.put('/recurring-patterns/:id', asyncHandler(calendarController.updateRecurringPattern));
router.delete('/recurring-patterns/:id', asyncHandler(calendarController.deleteRecurringPattern));

// Calendar analytics
router.get('/analytics/events', asyncHandler(calendarController.getEventAnalytics));
router.get('/analytics/reminders', asyncHandler(calendarController.getReminderAnalytics));
router.get('/analytics/recurring', asyncHandler(calendarController.getRecurringAnalytics));

// Calendar sync
router.post('/sync', asyncHandler(calendarController.syncCalendar));
router.get('/sync/status', asyncHandler(calendarController.getSyncStatus));

export { router as calendarRoutes };
