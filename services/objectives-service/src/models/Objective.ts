import mongoose, { Document, Schema } from 'mongoose';

/**
 * Objective Model - Represents user objectives and goals
 * 
 * This model handles:
 * - Objective creation, updates, and completion
 * - Objective validation and constraints
 * - Objective relationships with milestones and progress logs
 * - Objective status tracking and categorization
 */

export interface IObjective extends Document {
  _id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  startDate: Date;
  targetDate?: Date;
  completedDate?: Date;
  progress: number; // 0-100
  userId: string;
  tags: string[];
  isPublic: boolean;
  parentObjectiveId?: string;
  childObjectiveIds: string[];
  milestoneIds: string[];
  progressLogIds: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    source?: string;
    externalId?: string;
    [key: string]: any;
  };
}

const ObjectiveSchema = new Schema<IObjective>({
  title: {
    type: String,
    required: [true, 'Objective title is required'],
    trim: true,
    maxlength: [200, 'Objective title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Objective description cannot exceed 1000 characters'],
  },
  category: {
    type: String,
    required: [true, 'Objective category is required'],
    trim: true,
    maxlength: [50, 'Objective category cannot exceed 50 characters'],
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft',
    index: true,
  },
  startDate: {
    type: Date,
    required: [true, 'Objective start date is required'],
    default: Date.now,
  },
  targetDate: {
    type: Date,
    validate: {
      validator: function(this: IObjective, targetDate: Date) {
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
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
  }],
  isPublic: {
    type: Boolean,
    default: false,
  },
  parentObjectiveId: {
    type: String,
    index: true,
  },
  childObjectiveIds: [{
    type: String,
  }],
  milestoneIds: [{
    type: String,
  }],
  progressLogIds: [{
    type: String,
  }],
  metadata: {
    source: String,
    externalId: String,
  },
}, {
  timestamps: true,
  collection: 'objectives',
});

// Indexes for performance
ObjectiveSchema.index({ userId: 1, status: 1 });
ObjectiveSchema.index({ userId: 1, category: 1 });
ObjectiveSchema.index({ userId: 1, priority: 1 });
ObjectiveSchema.index({ userId: 1, targetDate: 1 });
ObjectiveSchema.index({ parentObjectiveId: 1 });
ObjectiveSchema.index({ isPublic: 1, status: 1 });
ObjectiveSchema.index({ createdAt: -1 });

// Virtual for objective duration
ObjectiveSchema.virtual('duration').get(function(this: IObjective) {
  if (this.completedDate) {
    return this.completedDate.getTime() - this.startDate.getTime();
  }
  if (this.targetDate) {
    return this.targetDate.getTime() - this.startDate.getTime();
  }
  return Date.now() - this.startDate.getTime();
});

// Virtual for days remaining
ObjectiveSchema.virtual('daysRemaining').get(function(this: IObjective) {
  if (this.status === 'completed' || !this.targetDate) {
    return null;
  }
  const now = new Date();
  const diffTime = this.targetDate.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Pre-save middleware
ObjectiveSchema.pre('save', function(next) {
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
ObjectiveSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
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
ObjectiveSchema.statics.findByUser = function(userId: string, status?: string) {
  const query: any = { userId };
  if (status) {
    query.status = status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

ObjectiveSchema.statics.findByCategory = function(userId: string, category: string) {
  return this.find({
    userId,
    category,
    status: { $ne: 'cancelled' },
  }).sort({ createdAt: -1 });
};

ObjectiveSchema.statics.findActive = function(userId: string) {
  return this.find({
    userId,
    status: { $in: ['active', 'paused'] },
  }).sort({ targetDate: 1 });
};

ObjectiveSchema.statics.findOverdue = function(userId: string) {
  return this.find({
    userId,
    status: { $in: ['active', 'paused'] },
    targetDate: { $lt: new Date() },
  }).sort({ targetDate: 1 });
};

ObjectiveSchema.statics.findByParent = function(parentObjectiveId: string) {
  return this.find({ parentObjectiveId }).sort({ createdAt: 1 });
};

// Instance methods
ObjectiveSchema.methods.isOverdue = function() {
  return this.status === 'active' && 
         this.targetDate && 
         this.targetDate < new Date();
};

ObjectiveSchema.methods.isCompleted = function() {
  return this.status === 'completed';
};

ObjectiveSchema.methods.updateProgress = function(newProgress: number) {
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

ObjectiveSchema.methods.addMilestone = function(milestoneId: string): any {
  if (!this.milestoneIds.includes(milestoneId)) {
    this.milestoneIds.push(milestoneId);
  }
  return this;
};

ObjectiveSchema.methods.removeMilestone = function(milestoneId: string): any {
  this.milestoneIds = this.milestoneIds.filter((id: string) => id !== milestoneId);
  return this;
};

ObjectiveSchema.methods.addChildObjective = function(childObjectiveId: string): any {
  if (!this.childObjectiveIds.includes(childObjectiveId)) {
    this.childObjectiveIds.push(childObjectiveId);
  }
  return this;
};

ObjectiveSchema.methods.removeChildObjective = function(childObjectiveId: string): any {
  this.childObjectiveIds = this.childObjectiveIds.filter((id: string) => id !== childObjectiveId);
  return this;
};

export const Objective = mongoose.model<IObjective>('Objective', ObjectiveSchema);
