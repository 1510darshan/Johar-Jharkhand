const express = require('express');
const router = express.Router();
const { validateQuery } = require('../middlewares/validation');
const chatBotController = require('../controller/chatbot');

// Chatbot endpoint - Fixed route path
router.post('/chatbot', validateQuery, chatBotController.chat);

// Health check for chatbot
router.get('/chatbot/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'chatbot',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;