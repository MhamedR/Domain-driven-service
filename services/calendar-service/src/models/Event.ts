import mongoose, { Document, Schema } from 'mongoose';

/**
 * Event Model - Represents calendar events
 * 
 * This model handles:
 * - Event creation, updates, and deletion
 * - Event validation and constraints
 * - Event relationships with reminders and recurring patterns
 * - Event status tracking
 */

export interface IEvent extends Document {
  _id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isAllDay: boolean;
  location?: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: string;
  tags: string[];
  userId: string;
  isRecurring: boolean;
  recurringPatternId?: string;
  reminderIds: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    source?: string;
    externalId?: string;
    [key: string]: any;
  };
}

const EventSchema = new Schema<IEvent>({
  title: {
    type: String,
    required: [true, 'Event title is required'],
    trim: true,
    maxlength: [200, 'Event title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Event description cannot exceed 1000 characters'],
  },
  startDate: {
    type: Date,
    required: [true, 'Event start date is required'],
  },
  endDate: {
    type: Date,
    required: [true, 'Event end date is required'],
    validate: {
      validator: function(this: IEvent, endDate: Date) {
        return endDate > this.startDate;
      },
      message: 'Event end date must be after start date',
    },
  },
  isAllDay: {
    type: Boolean,
    default: false,
  },
  location: {
    type: String,
    trim: true,
    maxlength: [200, 'Event location cannot exceed 200 characters'],
  },
  status: {
    type: String,
    enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
    default: 'scheduled',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  category: {
    type: String,
    required: [true, 'Event category is required'],
    trim: true,
    maxlength: [50, 'Event category cannot exceed 50 characters'],
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
  }],
  userId: {
    type: String,
    required: [true, 'User ID is required'],
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
  reminderIds: [{
    type: String,
  }],
  metadata: {
    source: String,
    externalId: String,
  },
}, {
  timestamps: true,
  collection: 'events',
});

// Indexes for performance
EventSchema.index({ userId: 1, startDate: 1 });
EventSchema.index({ userId: 1, status: 1 });
EventSchema.index({ userId: 1, category: 1 });
EventSchema.index({ startDate: 1, endDate: 1 });
EventSchema.index({ isRecurring: 1, recurringPatternId: 1 });
EventSchema.index({ createdAt: -1 });

// Virtual for event duration
EventSchema.virtual('duration').get(function(this: IEvent) {
  return this.endDate.getTime() - this.startDate.getTime();
});

// Pre-save middleware
EventSchema.pre('save', function(next) {
  // Ensure end date is after start date
  if (this.endDate <= this.startDate) {
    next(new Error('Event end date must be after start date'));
    return;
  }

  // Set isRecurring based on recurringPatternId
  if (this.recurringPatternId && !this.isRecurring) {
    this.isRecurring = true;
  }

  next();
});

// Pre-update middleware
EventSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  
  if (update?.endDate && update?.startDate && update.endDate <= update.startDate) {
    next(new Error('Event end date must be after start date'));
    return;
  }

  next();
});

// Static methods
EventSchema.statics.findByUserAndDateRange = function(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return this.find({
    userId,
    startDate: { $gte: startDate },
    endDate: { $lte: endDate },
  }).sort({ startDate: 1 });
};

EventSchema.statics.findUpcomingEvents = function(userId: string, limit: number = 10) {
  return this.find({
    userId,
    startDate: { $gte: new Date() },
    status: { $ne: 'cancelled' },
  })
    .sort({ startDate: 1 })
    .limit(limit);
};

EventSchema.statics.findByCategory = function(userId: string, category: string) {
  return this.find({
    userId,
    category,
    status: { $ne: 'cancelled' },
  }).sort({ startDate: 1 });
};

// Instance methods
EventSchema.methods.isOverdue = function() {
  return this.status === 'scheduled' && this.endDate < new Date();
};

EventSchema.methods.isUpcoming = function(hours: number = 24) {
  const now = new Date();
  const upcomingTime = new Date(now.getTime() + (hours * 60 * 60 * 1000));
  return this.startDate > now && this.startDate <= upcomingTime;
};

export const Event = mongoose.model<IEvent>('Event', EventSchema);
