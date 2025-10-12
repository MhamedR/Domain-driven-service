import { Request, Response } from 'express';
import { Article } from '../models/Article';
import { RedisService } from '../services/redis';
import { KafkaService } from '../services/kafka';
import { MetricsService } from '../services/metrics';
import { logger } from '../utils/logger';

export class ArticlesController {
  private kafkaService: KafkaService;
  private metricsService: MetricsService;

  constructor() {
    this.kafkaService = KafkaService.getInstance();
    this.metricsService = MetricsService.getInstance();
  }

  public async getArticles(req: Request, res: Response): Promise<void> {
    try {
      const { page = 1, limit = 20, category, tag, author, search } = req.query;

      // Check cache first
      const cacheKey = `articles:${JSON.stringify(req.query)}`;
      const cachedArticles = await RedisService.getInstance().get(cacheKey);
      
      if (cachedArticles) {
        this.metricsService.recordCacheHit('articles');
        res.status(200).json({
          success: true,
          data: cachedArticles,
          cached: true,
        });
        return;
      }

      this.metricsService.recordCacheMiss('articles');

      // Build query
      const query: any = {};
      
      if (category) {
        query.category = category;
      }
      
      if (tag) {
        query.tags = { $in: [tag] };
      }
      
      if (author) {
        query.author = author;
      }
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { summary: { $regex: search, $options: 'i' } }
        ];
      }

      // Get articles with pagination
      const skip = (Number(page) - 1) * Number(limit);
      const articles = await Article.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('author')
        .populate('category');

      const total = await Article.countDocuments(query);

      const result = {
        articles,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      };

      // Cache the result
      await RedisService.getInstance().set(cacheKey, result, 300); // 5 minutes

      this.metricsService.recordHttpRequest('GET', '/articles', 200, 0);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Error getting articles:', error);
      this.metricsService.recordHttpRequest('GET', '/articles', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to get articles',
      });
    }
  }

  public async createArticle(req: Request, res: Response): Promise<void> {
    try {
      const articleData = req.body;

      const article = new Article(articleData);
      await article.save();

      // Publish event
      await this.kafkaService.publishArticleCreated({
        id: article._id,
        title: article.title,
        category: article.categoryId,
        author: article.authorId,
        publishedAt: new Date(),
      });

      // Record metrics
      this.metricsService.recordArticleCreated(article.categoryId, article.authorId);
      this.metricsService.recordHttpRequest('POST', '/articles', 201, 0);

      res.status(201).json({
        success: true,
        data: article,
        message: 'Article created successfully',
      });
    } catch (error) {
      logger.error('Error creating article:', error);
      this.metricsService.recordHttpRequest('POST', '/articles', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to create article',
      });
    }
  }

  public async getArticleById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const article = await Article.findById(id)
        .populate('author')
        .populate('category');

      if (!article) {
        res.status(404).json({
          success: false,
          message: 'Article not found',
        });
        return;
      }

      // Record view
      this.metricsService.recordArticleViewed(article.categoryId, article.authorId);
      this.metricsService.recordHttpRequest('GET', '/articles/:id', 200, 0);

      res.status(200).json({
        success: true,
        data: article,
      });
    } catch (error) {
      logger.error('Error getting article:', error);
      this.metricsService.recordHttpRequest('GET', '/articles/:id', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to get article',
      });
    }
  }

  public async updateArticle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const article = await Article.findByIdAndUpdate(
        id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!article) {
        res.status(404).json({
          success: false,
          message: 'Article not found',
        });
        return;
      }

      // Publish event
      await this.kafkaService.publishArticleUpdated({
        id: article._id,
        title: article.title,
        category: article.categoryId,
        author: article.authorId,
        updatedAt: new Date(),
      });

      // Record metrics
      this.metricsService.recordArticleUpdated(article.categoryId, article.authorId);
      this.metricsService.recordHttpRequest('PUT', '/articles/:id', 200, 0);

      res.status(200).json({
        success: true,
        data: article,
        message: 'Article updated successfully',
      });
    } catch (error) {
      logger.error('Error updating article:', error);
      this.metricsService.recordHttpRequest('PUT', '/articles/:id', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to update article',
      });
    }
  }

  public async deleteArticle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const article = await Article.findByIdAndDelete(id);

      if (!article) {
        res.status(404).json({
          success: false,
          message: 'Article not found',
        });
        return;
      }

      // Publish event
      await this.kafkaService.publishArticleDeleted({
        id: article._id,
        title: article.title,
        category: article.categoryId,
        author: article.authorId,
        deletedAt: new Date(),
      });

      // Record metrics
      this.metricsService.recordArticleDeleted(article.categoryId, article.authorId);
      this.metricsService.recordHttpRequest('DELETE', '/articles/:id', 200, 0);

      res.status(200).json({
        success: true,
        message: 'Article deleted successfully',
      });
    } catch (error) {
      logger.error('Error deleting article:', error);
      this.metricsService.recordHttpRequest('DELETE', '/articles/:id', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to delete article',
      });
    }
  }

  public async getTrendingArticles(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      // Check cache first
      const cacheKey = `trending:${limit}`;
      const cachedTrending = await RedisService.getInstance().get(cacheKey);
      
      if (cachedTrending) {
        this.metricsService.recordCacheHit('trending');
        res.status(200).json({
          success: true,
          data: cachedTrending,
          cached: true,
        });
        return;
      }

      this.metricsService.recordCacheMiss('trending');

      // Get trending articles (simplified - in real app, use view counts, likes, etc.)
      const articles = await Article.find({ status: 'published' })
        .sort({ viewCount: -1, publishedAt: -1 })
        .limit(Number(limit))
        .populate('author')
        .populate('category');

      // Cache the result
      await RedisService.getInstance().set(cacheKey, articles, 600); // 10 minutes

      this.metricsService.recordHttpRequest('GET', '/articles/trending', 200, 0);

      res.status(200).json({
        success: true,
        data: articles,
      });
    } catch (error) {
      logger.error('Error getting trending articles:', error);
      this.metricsService.recordHttpRequest('GET', '/articles/trending', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to get trending articles',
      });
    }
  }

  public async getLatestArticles(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 10 } = req.query;

      // Check cache first
      const cacheKey = `latest:${limit}`;
      const cachedLatest = await RedisService.getInstance().get(cacheKey);
      
      if (cachedLatest) {
        this.metricsService.recordCacheHit('latest');
        res.status(200).json({
          success: true,
          data: cachedLatest,
          cached: true,
        });
        return;
      }

      this.metricsService.recordCacheMiss('latest');

      // Get latest articles
      const articles = await Article.find({ status: 'published' })
        .sort({ publishedAt: -1 })
        .limit(Number(limit))
        .populate('author')
        .populate('category');

      // Cache the result
      await RedisService.getInstance().set(cacheKey, articles, 300); // 5 minutes

      this.metricsService.recordHttpRequest('GET', '/articles/latest', 200, 0);

      res.status(200).json({
        success: true,
        data: articles,
      });
    } catch (error) {
      logger.error('Error getting latest articles:', error);
      this.metricsService.recordHttpRequest('GET', '/articles/latest', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to get latest articles',
      });
    }
  }

  public async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const categories = await Article.distinct('category');
      
      this.metricsService.recordHttpRequest('GET', '/articles/categories', 200, 0);

      res.status(200).json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('Error getting categories:', error);
      this.metricsService.recordHttpRequest('GET', '/articles/categories', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to get categories',
      });
    }
  }

  public async getTags(req: Request, res: Response): Promise<void> {
    try {
      const tags = await Article.distinct('tags');
      
      this.metricsService.recordHttpRequest('GET', '/articles/tags', 200, 0);

      res.status(200).json({
        success: true,
        data: tags,
      });
    } catch (error) {
      logger.error('Error getting tags:', error);
      this.metricsService.recordHttpRequest('GET', '/articles/tags', 500, 0);
      res.status(500).json({
        success: false,
        message: 'Failed to get tags',
      });
    }
  }
}
