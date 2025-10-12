import mongoose, { Document, Schema } from 'mongoose';

/**
 * Milestone Model - Represents objective milestones
 * 
 * This model handles:
 * - Milestone creation and management
 * - Milestone validation and constraints
 * - Milestone relationships with objectives
 * - Milestone status tracking
 */

export interface IMilestone extends Document {
  _id: string;
  objectiveId: string;
  userId: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  startDate: Date;
  targetDate?: Date;
  completedDate?: Date;
  progress: number; // 0-100
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    source?: string;
    externalId?: string;
    [key: string]: any;
  };
}

const MilestoneSchema = new Schema<IMilestone>({
  objectiveId: {
    type: String,
    required: [true, 'Objective ID is required'],
    index: true,
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },
  title: {
    type: String,
    required: [true, 'Milestone title is required'],
    trim: true,
    maxlength: [200, 'Milestone title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Milestone description cannot exceed 500 characters'],
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'cancelled'],
    default: 'pending',
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  startDate: {
    type: Date,
    required: [true, 'Milestone start date is required'],
    default: Date.now,
  },
  targetDate: {
    type: Date,
    validate: {
      validator: function(this: IMilestone, targetDate: Date) {
        return !targetDate || targetDate > this.startDate;
      },
      message: 'Target date must be after start date',
    },
  },
  completedDate: {
    type: Date,
  },
  progress: {
    type: Number,
    min: [0, 'Progress cannot be less than 0'],
    max: [100, 'Progress cannot exceed 100'],
    default: 0,
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
  }],
  metadata: {
    source: String,
    externalId: String,
  },
}, {
  timestamps: true,
  collection: 'milestones',
});

// Indexes for performance
MilestoneSchema.index({ userId: 1, status: 1 });
MilestoneSchema.index({ userId: 1, priority: 1 });
MilestoneSchema.index({ objectiveId: 1, status: 1 });
MilestoneSchema.index({ userId: 1, targetDate: 1 });
MilestoneSchema.index({ createdAt: -1 });

// Virtual for milestone duration
MilestoneSchema.virtual('duration').get(function(this: IMilestone) {
  if (this.completedDate) {
    return this.completedDate.getTime() - this.startDate.getTime();
  }
  if (this.targetDate) {
    return this.targetDate.getTime() - this.startDate.getTime();
  }
  return Date.now() - this.startDate.getTime();
});

// Virtual for days remaining
MilestoneSchema.virtual('daysRemaining').get(function(this: IMilestone) {
  if (this.status === 'completed' || !this.targetDate) {
    return null;
  }
  const now = new Date();
  const diffTime = this.targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
MilestoneSchema.pre('save', function(next) {
  // Set completed date when status changes to completed
  if (this.isModified('status') && this.status === 'completed' && !this.completedDate) {
    this.completedDate = new Date();
    this.progress = 100;
  }

  // Clear completed date when status changes from completed
  if (this.isModified('status') && this.status !== 'completed' && this.completedDate) {
    this.completedDate = undefined;
  }

  // Validate target date
  if (this.targetDate && this.targetDate <= this.startDate) {
    next(new Error('Target date must be after start date'));
    return;
  }

  next();
});

// Pre-update middleware
MilestoneSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  
  if (update?.status === 'completed' && !update.completedDate) {
    update.completedDate = new Date();
    update.progress = 100;
  }

  if (update?.status && update.status !== 'completed' && update.completedDate) {
    update.completedDate = undefined;
  }

  next();
});

// Static methods
MilestoneSchema.statics.findByUser = function(userId: string, status?: string) {
  const query: any = { userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

MilestoneSchema.statics.findByObjective = function(objectiveId: string) {
  return this.find({ objectiveId }).sort({ startDate: 1 });
};

MilestoneSchema.statics.findActive = function(userId: string) {
  return this.find({
    userId,
    status: { $in: ['pending', 'in-progress'] },
  }).sort({ targetDate: 1 });
};

MilestoneSchema.statics.findOverdue = function(userId: string) {
  return this.find({
    userId,
    status: { $in: ['pending', 'in-progress'] },
    targetDate: { $lt: new Date() },
  }).sort({ targetDate: 1 });
};

MilestoneSchema.statics.findUpcoming = function(userId: string, days: number = 7) {
  const now = new Date();
  const upcomingDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return this.find({
    userId,
    status: { $in: ['pending', 'in-progress'] },
    targetDate: { $gte: now, $lte: upcomingDate },
  }).sort({ targetDate: 1 });
};

// Instance methods
MilestoneSchema.methods.isOverdue = function() {
  return this.status === 'in-progress' && 
         this.targetDate && 
         this.targetDate < new Date();
};

MilestoneSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

MilestoneSchema.methods.updateProgress = function(newProgress: number) {
  if (newProgress < 0 || newProgress > 100) {
    throw new Error('Progress must be between 0 and 100');
  }
  
  this.progress = newProgress;
  
  if (newProgress === 100 && this.status !== 'completed') {
    this.status = 'completed';
    this.completedDate = new Date();
  }
  
  return this;
};

MilestoneSchema.methods.isUpcoming = function(days: number = 7) {
  if (this.status === 'completed' || !this.targetDate) {
    return false;
  }
  
  const now = new Date();
  const upcomingDate = new Date(now.getTime() + (days * 24 * 60 * 60 * 1000));
  
  return this.targetDate >= now && this.targetDate <= upcomingDate;
};

export const Milestone = mongoose.model<IMilestone>('Milestone', MilestoneSchema);
