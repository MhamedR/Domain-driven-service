import mongoose, { Document, Schema } from 'mongoose';

/**
 * Article Model - Represents technology articles and updates
 * 
 * This model handles:
 * - Article creation, updates, and publishing
 * - Article validation and constraints
 * - Article relationships with authors, categories, and tags
 * - Article status tracking and visibility
 */

export interface IArticle extends Document {
  _id: string;
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  authorId: string;
  categoryId: string;
  tagIds: string[];
  status: 'draft' | 'published' | 'archived' | 'deleted';
  visibility: 'public' | 'private' | 'members-only';
  publishedAt?: Date;
  featured: boolean;
  trending: boolean;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  readingTime: number; // in minutes
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: {
    source?: string;
    externalId?: string;
    [key: string]: any;
  };
}

const ArticleSchema = new Schema<IArticle>({
  title: {
    type: String,
    required: [true, 'Article title is required'],
    trim: true,
    maxlength: [200, 'Article title cannot exceed 200 characters'],
  },
  content: {
    type: String,
    required: [true, 'Article content is required'],
    maxlength: [50000, 'Article content cannot exceed 50000 characters'],
  },
  excerpt: {
    type: String,
    trim: true,
    maxlength: [500, 'Article excerpt cannot exceed 500 characters'],
  },
  slug: {
    type: String,
    required: [true, 'Article slug is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'],
  },
  authorId: {
    type: String,
    required: [true, 'Author ID is required'],
    index: true,
  },
  categoryId: {
    type: String,
    required: [true, 'Category ID is required'],
    index: true,
  },
  tagIds: [{
    type: String,
  }],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived', 'deleted'],
    default: 'draft',
    index: true,
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'members-only'],
    default: 'public',
    index: true,
  },
  publishedAt: {
    type: Date,
    index: true,
  },
  featured: {
    type: Boolean,
    default: false,
    index: true,
  },
  trending: {
    type: Boolean,
    default: false,
    index: true,
  },
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative'],
  },
  likeCount: {
    type: Number,
    default: 0,
    min: [0, 'Like count cannot be negative'],
  },
  shareCount: {
    type: Number,
    default: 0,
    min: [0, 'Share count cannot be negative'],
  },
  readingTime: {
    type: Number,
    default: 0,
    min: [0, 'Reading time cannot be negative'],
  },
  seoTitle: {
    type: String,
    trim: true,
    maxlength: [60, 'SEO title cannot exceed 60 characters'],
  },
  seoDescription: {
    type: String,
    trim: true,
    maxlength: [160, 'SEO description cannot exceed 160 characters'],
  },
  seoKeywords: [{
    type: String,
    trim: true,
    maxlength: [50, 'SEO keyword cannot exceed 50 characters'],
  }],
  metadata: {
    source: String,
    externalId: String,
  },
}, {
  timestamps: true,
  collection: 'articles',
});

// Indexes for performance
ArticleSchema.index({ status: 1, visibility: 1 });
ArticleSchema.index({ authorId: 1, status: 1 });
ArticleSchema.index({ categoryId: 1, status: 1 });
ArticleSchema.index({ publishedAt: -1 });
ArticleSchema.index({ featured: 1, status: 1 });
ArticleSchema.index({ trending: 1, status: 1 });
ArticleSchema.index({ viewCount: -1 });
ArticleSchema.index({ likeCount: -1 });
ArticleSchema.index({ createdAt: -1 });

// Virtual for article URL
ArticleSchema.virtual('url').get(function(this: IArticle) {
  return `/articles/${this.slug}`;
});

// Virtual for article engagement score
ArticleSchema.virtual('engagementScore').get(function(this: IArticle) {
  return (this.viewCount * 1) + (this.likeCount * 2) + (this.shareCount * 3);
});

// Pre-save middleware
ArticleSchema.pre('save', function(next) {
  // Generate slug if not provided
  if (!this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Set published date when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }

  // Calculate reading time (simplified: 200 words per minute)
  if (this.isModified('content')) {
    const wordCount = this.content.split(/\s+/).length;
    this.readingTime = Math.ceil(wordCount / 200);
  }

  // Generate excerpt if not provided
  if (!this.excerpt && this.content) {
    this.excerpt = this.content.substring(0, 200).replace(/<[^>]*>/g, '') + '...';
  }

  next();
});

// Pre-update middleware
ArticleSchema.pre(['updateOne', 'findOneAndUpdate'], function(next) {
  const update = this.getUpdate() as any;
  
  if (update?.status === 'published' && !update.publishedAt) {
    update.publishedAt = new Date();
  }

  if (update?.content) {
    const wordCount = update.content.split(/\s+/).length;
    update.readingTime = Math.ceil(wordCount / 200);
  }

  next();
});

// Static methods
ArticleSchema.statics.findPublished = function(limit: number = 20, skip: number = 0) {
  return this.find({
    status: 'published',
    visibility: 'public',
  })
    .sort({ publishedAt: -1 })
    .limit(limit)
    .skip(skip);
};

ArticleSchema.statics.findFeatured = function(limit: number = 10) {
  return this.find({
    status: 'published',
    visibility: 'public',
    featured: true,
  })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

ArticleSchema.statics.findTrending = function(limit: number = 10) {
  return this.find({
    status: 'published',
    visibility: 'public',
    trending: true,
  })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

ArticleSchema.statics.findByCategory = function(categoryId: string, limit: number = 20) {
  return this.find({
    categoryId,
    status: 'published',
    visibility: 'public',
  })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

ArticleSchema.statics.findByAuthor = function(authorId: string, limit: number = 20) {
  return this.find({
    authorId,
    status: 'published',
  })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

ArticleSchema.statics.findByTag = function(tagId: string, limit: number = 20) {
  return this.find({
    tagIds: tagId,
    status: 'published',
    visibility: 'public',
  })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

ArticleSchema.statics.findPopular = function(limit: number = 20) {
  return this.find({
    status: 'published',
    visibility: 'public',
  })
    .sort({ viewCount: -1, likeCount: -1 })
    .limit(limit);
};

ArticleSchema.statics.search = function(query: string, limit: number = 20) {
  return this.find({
    $or: [
      { title: { $regex: query, $options: 'i' } },
      { content: { $regex: query, $options: 'i' } },
      { excerpt: { $regex: query, $options: 'i' } },
    ],
    status: 'published',
    visibility: 'public',
  })
    .sort({ publishedAt: -1 })
    .limit(limit);
};

// Instance methods
ArticleSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

ArticleSchema.methods.incrementLikeCount = function() {
  this.likeCount += 1;
  return this.save();
};

ArticleSchema.methods.incrementShareCount = function() {
  this.shareCount += 1;
  return this.save();
};

ArticleSchema.methods.isPublished = function() {
  return this.status === 'published';
};

ArticleSchema.methods.isPublic = function() {
  return this.visibility === 'public';
};

ArticleSchema.methods.isTrending = function() {
  return this.trending;
};

ArticleSchema.methods.isFeatured = function() {
  return this.featured;
};

ArticleSchema.methods.getEngagementRate = function() {
  if (this.viewCount === 0) return 0;
  return ((this.likeCount + this.shareCount) / this.viewCount) * 100;
};

export const Article = mongoose.model<IArticle>('Article', ArticleSchema);
