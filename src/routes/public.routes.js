const express = require('express');
const router = express.Router();
const publicController = require('../controllers/public.controller');
const { contactLimiter } = require('../middleware/rateLimiter');

router.get('/', publicController.home);
router.get('/news', publicController.newsList);
router.get('/news/:slug', publicController.newsShow);
router.post('/contact', contactLimiter, publicController.contact);

module.exports = router;
