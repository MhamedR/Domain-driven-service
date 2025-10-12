import mongoose, { Document, Schema } from 'mongoose';

/**
 * ProgressLog Model - Represents progress tracking for objectives and milestones
 * 
 * This model handles:
 * - Progress log creation and management
 * - Progress validation and constraints
 * - Progress relationships with objectives and milestones
 * - Progress tracking and analytics
 */

export interface IProgressLog extends Document {
  _id: string;
  objectiveId?: string;
  milestoneId?: string;
  userId: string;
  title: string;
  description?: string;
  progressValue: number; // 0-100
  previousProgress?: number;
  progressDelta: number; // Change in progress
  logDate: Date;
  category: 'manual' | 'automatic' | 'system' | 'import';
  tags: string[];
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    source?: string;
    externalId?: string;
    [key: string]: any;
  };
}

const ProgressLogSchema = new Schema<IProgressLog>({
  objectiveId: {
    type: String,
    index: true,
  },
  milestoneId: {
    type: String,
    index: true,
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Progress log title is required'],
    trim: true,
    maxlength: [200, 'Progress log title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Progress log description cannot exceed 1000 characters'],
  },
  progressValue: {
    type: Number,
    required: [true, 'Progress value is required'],
    min: [0, 'Progress value cannot be less than 0'],
    max: [100, 'Progress value cannot exceed 100'],
  },
  previousProgress: {
    type: Number,
    min: [0, 'Previous progress cannot be less than 0'],
    max: [100, 'Previous progress cannot exceed 100'],
  },
  progressDelta: {
    type: Number,
    required: [true, 'Progress delta is required'],
  },
  logDate: {
    type: Date,
    required: [true, 'Log date is required'],
    default: Date.now,
    index: true,
  },
  category: {
    type: String,
    enum: ['manual', 'automatic', 'system', 'import'],
    required: [true, 'Progress log category is required'],
    default: 'manual',
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
  }],
  attachments: [{
    type: String,
  }],
  metadata: {
    source: String,
    externalId: String,
  },
}, {
  timestamps: true,
  collection: 'progress_logs',
});

// Indexes for performance
ProgressLogSchema.index({ userId: 1, logDate: -1 });
ProgressLogSchema.index({ objectiveId: 1, logDate: -1 });
ProgressLogSchema.index({ milestoneId: 1, logDate: -1 });
ProgressLogSchema.index({ userId: 1, category: 1 });
ProgressLogSchema.index({ createdAt: -1 });

// Virtual for progress change percentage
ProgressLogSchema.virtual('progressChangePercentage').get(function(this: IProgressLog) {
  if (this.previousProgress === undefined || this.previousProgress === 0) {
    return this.progressValue;
  }
  return ((this.progressValue - this.previousProgress) / this.previousProgress) * 100;
});

// Virtual for progress change direction
ProgressLogSchema.virtual('progressDirection').get(function(this: IProgressLog) {
  if (this.progressDelta > 0) {
    return 'increase';
  } else if (this.progressDelta < 0) {
    return 'decrease';
  }
  return 'no-change';
});

// Pre-save middleware
ProgressLogSchema.pre('save', function(next) {
  // Calculate progress delta if not provided
  if (this.progressDelta === undefined && this.previousProgress !== undefined) {
    this.progressDelta = this.progressValue - this.previousProgress;
  }

  // Validate that either objectiveId or milestoneId is provided
  if (!this.objectiveId && !this.milestoneId) {
    next(new Error('Either objectiveId or milestoneId must be provided'));
    return;
  }

  // Validate that both objectiveId and milestoneId are not provided
  if (this.objectiveId && this.milestoneId) {
    next(new Error('Cannot provide both objectiveId and milestoneId'));
    return;
  }

  next();
});

// Pre-update middleware
ProgressLogSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  
  // Calculate progress delta if not provided
  if (update?.progressDelta === undefined && update?.previousProgress !== undefined) {
    update.progressDelta = update.progressValue - update.previousProgress;
  }

  next();
});

// Static methods
ProgressLogSchema.statics.findByUser = function(userId: string, limit: number = 50) {
  return this.find({ userId })
    .sort({ logDate: -1 })
    .limit(limit);
};

ProgressLogSchema.statics.findByObjective = function(objectiveId: string, limit: number = 50) {
  return this.find({ objectiveId })
    .sort({ logDate: -1 })
    .limit(limit);
};

ProgressLogSchema.statics.findByMilestone = function(milestoneId: string, limit: number = 50) {
  return this.find({ milestoneId })
    .sort({ logDate: -1 })
    .limit(limit);
};

ProgressLogSchema.statics.findByDateRange = function(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return this.find({
    userId,
    logDate: { $gte: startDate, $lte: endDate },
  }).sort({ logDate: -1 });
};

ProgressLogSchema.statics.findByCategory = function(userId: string, category: string) {
  return this.find({
    userId,
    category,
  }).sort({ logDate: -1 });
};

ProgressLogSchema.statics.findRecent = function(userId: string, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  return this.find({
    userId,
    logDate: { $gte: startDate },
  }).sort({ logDate: -1 });
};

ProgressLogSchema.statics.getProgressSummary = function(userId: string, startDate: Date, endDate: Date) {
  return this.aggregate([
    {
      $match: {
        userId,
        logDate: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: null,
        totalLogs: { $sum: 1 },
        averageProgress: { $avg: '$progressValue' },
        maxProgress: { $max: '$progressValue' },
        minProgress: { $min: '$progressValue' },
        totalProgressDelta: { $sum: '$progressDelta' },
        positiveProgress: {
          $sum: { $cond: [{ $gt: ['$progressDelta', 0] }, 1, 0] }
        },
        negativeProgress: {
          $sum: { $cond: [{ $lt: ['$progressDelta', 0] }, 1, 0] }
        },
      },
    },
  ]);
};

// Instance methods
ProgressLogSchema.methods.isPositiveProgress = function() {
  return this.progressDelta > 0;
};

ProgressLogSchema.methods.isNegativeProgress = function() {
  return this.progressDelta < 0;
};

ProgressLogSchema.methods.isSignificantProgress = function(threshold: number = 10) {
  return Math.abs(this.progressDelta) >= threshold;
};

ProgressLogSchema.methods.getProgressDescription = function() {
  if (this.progressDelta > 0) {
    return `Progress increased by ${this.progressDelta}%`;
  } else if (this.progressDelta < 0) {
    return `Progress decreased by ${Math.abs(this.progressDelta)}%`;
  }
  return 'No progress change';
};

export const ProgressLog = mongoose.model<IProgressLog>('ProgressLog', ProgressLogSchema);
