import mongoose, { Document, Schema } from 'mongoose';

/**
 * GoalCategory Model - Represents goal categories for organization
 * 
 * This model handles:
 * - Category creation and management
 * - Category validation and constraints
 * - Category relationships with objectives
 * - Category hierarchy and organization
 */

export interface IGoalCategory extends Document {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  userId: string;
  isDefault: boolean;
  isActive: boolean;
  parentCategoryId?: string;
  childCategoryIds: string[];
  objectiveIds: string[];
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    source?: string;
    externalId?: string;
    [key: string]: any;
  };
}

const GoalCategorySchema = new Schema<IGoalCategory>({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Category description cannot exceed 500 characters'],
  },
  color: {
    type: String,
    trim: true,
    maxlength: [7, 'Color must be a valid hex color'],
    validate: {
      validator: function(color: string) {
        return !color || /^#[0-9A-F]{6}$/i.test(color);
      },
      message: 'Color must be a valid hex color (e.g., #FF5733)',
    },
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon name cannot exceed 50 characters'],
  },
  userId: {
    type: String,
    required: [true, 'User ID is required'],
    index: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  parentCategoryId: {
    type: String,
    index: true,
  },
  childCategoryIds: [{
    type: String,
  }],
  objectiveIds: [{
    type: String,
  }],
  sortOrder: {
    type: Number,
    default: 0,
  },
  metadata: {
    source: String,
    externalId: String,
  },
}, {
  timestamps: true,
  collection: 'goal_categories',
});

// Indexes for performance
GoalCategorySchema.index({ userId: 1, isActive: 1 });
GoalCategorySchema.index({ userId: 1, isDefault: 1 });
GoalCategorySchema.index({ parentCategoryId: 1 });
GoalCategorySchema.index({ userId: 1, sortOrder: 1 });
GoalCategorySchema.index({ createdAt: -1 });

// Virtual for category hierarchy level
GoalCategorySchema.virtual('level').get(function(this: IGoalCategory) {
  if (!this.parentCategoryId) {
    return 0;
  }
  // This would need to be calculated recursively in practice
  return 1; // Simplified for now
});

// Virtual for category path
GoalCategorySchema.virtual('path').get(function(this: IGoalCategory) {
  if (!this.parentCategoryId) {
    return this.name;
  }
  // This would need to be calculated recursively in practice
  return this.name; // Simplified for now
});

// Pre-save middleware
GoalCategorySchema.pre('save', function(next) {
  // Validate that a category cannot be its own parent
  if (this.parentCategoryId && this.parentCategoryId === this._id.toString()) {
    next(new Error('Category cannot be its own parent'));
    return;
  }

  // Set sort order if not provided
  if (this.sortOrder === undefined) {
    this.sortOrder = 0;
  }

  next();
});

// Pre-update middleware
GoalCategorySchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  
  // Validate that a category cannot be its own parent
  if (update?.parentCategoryId && update.parentCategoryId === this.getQuery()._id) {
    next(new Error('Category cannot be its own parent'));
    return;
  }

  next();
});

// Static methods
GoalCategorySchema.statics.findByUser = function(userId: string, includeInactive: boolean = false) {
  const query: any = { userId };
  if (!includeInactive) {
    query.isActive = true;
  }
  return this.find(query).sort({ sortOrder: 1, name: 1 });
};

GoalCategorySchema.statics.findByParent = function(parentCategoryId: string) {
  return this.find({ parentCategoryId }).sort({ sortOrder: 1, name: 1 });
};

GoalCategorySchema.statics.findRootCategories = function(userId: string) {
  return this.find({
    userId,
    parentCategoryId: { $exists: false },
    isActive: true,
  }).sort({ sortOrder: 1, name: 1 });
};

GoalCategorySchema.statics.findDefaultCategories = function(userId: string) {
  return this.find({
    userId,
    isDefault: true,
    isActive: true,
  }).sort({ sortOrder: 1, name: 1 });
};

GoalCategorySchema.statics.findByObjective = function(objectiveId: string) {
  return this.find({ objectiveIds: objectiveId });
};

GoalCategorySchema.statics.getCategoryTree = function(userId: string) {
  return this.aggregate([
    { $match: { userId, isActive: true } },
    {
      $lookup: {
        from: 'goal_categories',
        localField: '_id',
        foreignField: 'parentCategoryId',
        as: 'children',
      },
    },
    {
      $match: { parentCategoryId: { $exists: false } },
    },
    {
      $sort: { sortOrder: 1, name: 1 },
    },
  ]);
};

// Instance methods
GoalCategorySchema.methods.addChildCategory = function(childCategoryId: string): any {
  if (!this.childCategoryIds.includes(childCategoryId)) {
    this.childCategoryIds.push(childCategoryId);
  }
  return this;
};

GoalCategorySchema.methods.removeChildCategory = function(childCategoryId: string): any {
  this.childCategoryIds = this.childCategoryIds.filter((id: string) => id !== childCategoryId);
  return this;
};

GoalCategorySchema.methods.addObjective = function(objectiveId: string): any {
  if (!this.objectiveIds.includes(objectiveId)) {
    this.objectiveIds.push(objectiveId);
  }
  return this;
};

GoalCategorySchema.methods.removeObjective = function(objectiveId: string): any {
  this.objectiveIds = this.objectiveIds.filter((id: string) => id !== objectiveId);
  return this;
};

GoalCategorySchema.methods.isRootCategory = function() {
  return !this.parentCategoryId;
};

GoalCategorySchema.methods.isLeafCategory = function() {
  return this.childCategoryIds.length === 0;
};

GoalCategorySchema.methods.getObjectiveCount = function() {
  return this.objectiveIds.length;
};

GoalCategorySchema.methods.getChildCategoryCount = function() {
  return this.childCategoryIds.length;
};

export const GoalCategory = mongoose.model<IGoalCategory>('GoalCategory', GoalCategorySchema);
