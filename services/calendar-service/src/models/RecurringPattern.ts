import mongoose, { Document, Schema } from 'mongoose';

/**
 * RecurringPattern Model - Represents recurring event patterns
 * 
 * This model handles:
 * - Recurring pattern definition and management
 * - Pattern validation and constraints
 * - Pattern relationships with events
 * - Pattern scheduling and generation
 */

export interface IRecurringPattern extends Document {
  _id: string;
  userId: string;
  eventId: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // Every N days/weeks/months/years
  daysOfWeek?: number[]; // 0-6 (Sunday-Saturday) for weekly patterns
  dayOfMonth?: number; // 1-31 for monthly patterns
  weekOfMonth?: number; // 1-4 for monthly patterns
  monthOfYear?: number; // 1-12 for yearly patterns
  endDate?: Date;
  maxOccurrences?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    lastGenerated?: Date;
    generatedCount?: number;
    [key: string]: any;
  };
}

const RecurringPatternSchema = new Schema<IRecurringPattern>({
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },
  eventId: {
    type: String,
    required: [true, 'Event ID is required'],
    index: true,
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: [true, 'Frequency is required'],
  },
  interval: {
    type: Number,
    required: [true, 'Interval is required'],
    min: [1, 'Interval must be at least 1'],
    max: [365, 'Interval cannot exceed 365'],
  },
  daysOfWeek: [{
    type: Number,
    min: 0,
    max: 6,
  }],
  dayOfMonth: {
    type: Number,
    min: 1,
    max: 31,
  },
  weekOfMonth: {
    type: Number,
    min: 1,
    max: 4,
  },
  monthOfYear: {
    type: Number,
    min: 1,
    max: 12,
  },
  endDate: {
    type: Date,
  },
  maxOccurrences: {
    type: Number,
    min: 1,
    max: 1000,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  metadata: {
    lastGenerated: Date,
    generatedCount: { type: Number, default: 0 },
  },
}, {
  timestamps: true,
  collection: 'recurring_patterns',
});

// Indexes for performance
RecurringPatternSchema.index({ userId: 1, isActive: 1 });
RecurringPatternSchema.index({ eventId: 1, isActive: 1 });
RecurringPatternSchema.index({ frequency: 1, isActive: 1 });
RecurringPatternSchema.index({ createdAt: -1 });

// Pre-save middleware
RecurringPatternSchema.pre('save', function(next) {
  // Validate frequency-specific fields
  if (this.frequency === 'weekly' && (!this.daysOfWeek || this.daysOfWeek.length === 0)) {
    next(new Error('Weekly patterns must specify days of the week'));
    return;
  }

  if (this.frequency === 'monthly' && !this.dayOfMonth && !this.weekOfMonth) {
    next(new Error('Monthly patterns must specify either day of month or week of month'));
    return;
  }

  if (this.frequency === 'yearly' && !this.monthOfYear) {
    next(new Error('Yearly patterns must specify month of year'));
    return;
  }

  // Validate end conditions
  if (this.endDate && this.maxOccurrences) {
    next(new Error('Cannot specify both end date and max occurrences'));
    return;
  }

  if (!this.endDate && !this.maxOccurrences) {
    next(new Error('Must specify either end date or max occurrences'));
    return;
  }

  next();
});

// Static methods
RecurringPatternSchema.statics.findActivePatterns = function() {
  return this.find({ isActive: true });
};

RecurringPatternSchema.statics.findByUser = function(userId: string) {
  return this.find({ userId, isActive: true }).sort({ createdAt: -1 });
};

RecurringPatternSchema.statics.findByEvent = function(eventId: string) {
  return this.findOne({ eventId, isActive: true });
};

// Instance methods
RecurringPatternSchema.methods.generateNextOccurrence = function(
  fromDate: Date
): Date | null {
  const now = new Date(fromDate);
  
  switch (this.frequency) {
    case 'daily':
      return new Date(now.getTime() + (this.interval * 24 * 60 * 60 * 1000));
    
    case 'weekly':
      if (!this.daysOfWeek || this.daysOfWeek.length === 0) {
        return null;
      }
      
      // Find next occurrence on specified days
      for (let i = 1; i <= 7; i++) {
        const nextDate = new Date(now.getTime() + (i * 24 * 60 * 60 * 1000));
        if (this.daysOfWeek.includes(nextDate.getDay())) {
          return nextDate;
        }
      }
      
      // If no day found in next week, find in following weeks
      const weeksToAdd = this.interval;
      return new Date(now.getTime() + (weeksToAdd * 7 * 24 * 60 * 60 * 1000));
    
    case 'monthly':
      const nextMonth = new Date(now);
      nextMonth.setMonth(nextMonth.getMonth() + this.interval);
      
      if (this.dayOfMonth) {
        nextMonth.setDate(this.dayOfMonth);
      } else if (this.weekOfMonth) {
        // Find the nth occurrence of the day in the month
        const firstDay = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
        const targetDay = this.daysOfWeek?.[0] || 0;
        const firstTargetDay = new Date(firstDay);
        firstTargetDay.setDate(firstDay.getDate() + (targetDay - firstDay.getDay() + 7) % 7);
        
        const weekOffset = (this.weekOfMonth - 1) * 7;
        nextMonth.setDate(firstTargetDay.getDate() + weekOffset);
      }
      
      return nextMonth;
    
    case 'yearly':
      const nextYear = new Date(now);
      nextYear.setFullYear(nextYear.getFullYear() + this.interval);
      
      if (this.monthOfYear) {
        nextYear.setMonth(this.monthOfYear - 1);
      }
      
      if (this.dayOfMonth) {
        nextYear.setDate(this.dayOfMonth);
      }
      
      return nextYear;
    
    default:
      return null;
  }
};

RecurringPatternSchema.methods.shouldGenerate = function(): boolean {
  if (!this.isActive) {
    return false;
  }

  // Check end date
  if (this.endDate && new Date() > this.endDate) {
    return false;
  }

  // Check max occurrences
  if (this.maxOccurrences && this.metadata?.generatedCount >= this.maxOccurrences) {
    return false;
  }

  return true;
};

RecurringPatternSchema.methods.markGenerated = function() {
  this.metadata = this.metadata || {};
  this.metadata.generatedCount = (this.metadata.generatedCount || 0) + 1;
  this.metadata.lastGenerated = new Date();
};

export const RecurringPattern = mongoose.model<IRecurringPattern>('RecurringPattern', RecurringPatternSchema);
