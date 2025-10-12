import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { ArticlesController } from '../controllers/articlesController';

const router = Router();
const articlesController = new ArticlesController();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Articles routes
router.get('/', articlesController.getArticles.bind(articlesController));
router.post('/', articlesController.createArticle.bind(articlesController));
router.get('/:id', articlesController.getArticleById.bind(articlesController));
router.put('/:id', articlesController.updateArticle.bind(articlesController));
router.delete('/:id', articlesController.deleteArticle.bind(articlesController));

// Trending and latest articles
router.get('/trending', articlesController.getTrendingArticles.bind(articlesController));
router.get('/latest', articlesController.getLatestArticles.bind(articlesController));

// Categories and tags
router.get('/categories', articlesController.getCategories.bind(articlesController));
router.get('/tags', articlesController.getTags.bind(articlesController));

export default router;
