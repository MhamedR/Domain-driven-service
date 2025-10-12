import mongoose, { Document, Schema } from 'mongoose';

/**
 * Reminder Model - Represents event reminders
 * 
 * This model handles:
 * - Reminder creation and management
 * - Reminder scheduling and notifications
 * - Reminder status tracking
 * - Integration with events
 */

export interface IReminder extends Document {
  _id: string;
  eventId: string;
  userId: string;
  title: string;
  description?: string;
  reminderTime: Date;
  type: 'email' | 'push' | 'sms' | 'in-app';
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  isRecurring: boolean;
  recurringPatternId?: string;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    notificationId?: string;
    retryCount?: number;
    lastAttempt?: Date;
    [key: string]: any;
  };
}

const ReminderSchema = new Schema<IReminder>({
  eventId: {
    type: String,
    required: [true, 'Event ID is required'],
    index: true,
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Reminder title is required'],
    trim: true,
    maxlength: [200, 'Reminder title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Reminder description cannot exceed 500 characters'],
  },
  reminderTime: {
    type: Date,
    required: [true, 'Reminder time is required'],
    index: true,
  },
  type: {
    type: String,
    enum: ['email', 'push', 'sms', 'in-app'],
    required: [true, 'Reminder type is required'],
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringPatternId: {
    type: String,
    index: true,
  },
  metadata: {
    notificationId: String,
    retryCount: { type: Number, default: 0 },
    lastAttempt: Date,
  },
}, {
  timestamps: true,
  collection: 'reminders',
});

// Indexes for performance
ReminderSchema.index({ userId: 1, reminderTime: 1 });
ReminderSchema.index({ userId: 1, status: 1 });
ReminderSchema.index({ eventId: 1, status: 1 });
ReminderSchema.index({ reminderTime: 1, status: 1 });
ReminderSchema.index({ isRecurring: 1, recurringPatternId: 1 });
ReminderSchema.index({ createdAt: -1 });

// Pre-save middleware
ReminderSchema.pre('save', function(next) {
  // Set isRecurring based on recurringPatternId
  if (this.recurringPatternId && !this.isRecurring) {
    this.isRecurring = true;
  }

  // Initialize retry count if not set
  if (this.metadata && this.metadata.retryCount === undefined) {
    this.metadata.retryCount = 0;
  }

  next();
});

// Static methods
ReminderSchema.statics.findPendingReminders = function(beforeTime: Date) {
  return this.find({
    status: 'pending',
    reminderTime: { $lte: beforeTime },
  }).sort({ reminderTime: 1 });
};

ReminderSchema.statics.findByEvent = function(eventId: string) {
  return this.find({ eventId }).sort({ reminderTime: 1 });
};

ReminderSchema.statics.findByUser = function(userId: string, limit: number = 50) {
  return this.find({ userId })
    .sort({ reminderTime: 1 })
    .limit(limit);
};

ReminderSchema.statics.findUpcomingReminders = function(
  userId: string,
  hours: number = 24
) {
  const now = new Date();
  const upcomingTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
  
  return this.find({
    userId,
    reminderTime: { $gte: now, $lte: upcomingTime },
    status: 'pending',
  }).sort({ reminderTime: 1 });
};

// Instance methods
ReminderSchema.methods.isOverdue = function() {
  return this.status === 'pending' && this.reminderTime < new Date();
};

ReminderSchema.methods.canRetry = function(maxRetries: number = 3) {
  return this.status === 'failed' && 
         this.metadata?.retryCount < maxRetries;
};

ReminderSchema.methods.markAsSent = function(notificationId?: string) {
  this.status = 'sent';
  if (notificationId) {
    this.metadata = this.metadata || {};
    this.metadata.notificationId = notificationId;
  }
  this.metadata = this.metadata || {};
  this.metadata.lastAttempt = new Date();
};

ReminderSchema.methods.markAsFailed = function() {
  this.status = 'failed';
  this.metadata = this.metadata || {};
  this.metadata.retryCount = (this.metadata.retryCount || 0) + 1;
  this.metadata.lastAttempt = new Date();
};

export const Reminder = mongoose.model<IReminder>('Reminder', ReminderSchema);
