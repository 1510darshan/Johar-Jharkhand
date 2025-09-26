const express = require('express');
const router = express.Router();

const { analyzeSingle, analyzeBatch, getSummary } = require('../controller/sentimentAI');

// Analyze single feedback
router.post('/sentiment', async (req, res) => {
	const { feedback, includeEmotions } = req.body;
	if (!feedback) return res.status(400).json({ error: 'Missing feedback text.' });
	try {
		const result = await analyzeSingle(feedback, includeEmotions !== false);
		res.json(result);
	} catch (err) {
		res.status(500).json({ error: 'Sentiment analysis failed', details: err.message });
	}
});

// Analyze batch feedback
router.post('/sentiment/batch', async (req, res) => {
	const { feedbacks } = req.body;
	if (!Array.isArray(feedbacks)) return res.status(400).json({ error: 'feedbacks must be an array.' });
	try {
		const results = await analyzeBatch(feedbacks);
		res.json(results);
	} catch (err) {
		res.status(500).json({ error: 'Batch sentiment analysis failed', details: err.message });
	}
});

// Get summary statistics
router.post('/sentiment/summary', async (req, res) => {
	const { feedbacks } = req.body;
	if (!Array.isArray(feedbacks)) return res.status(400).json({ error: 'feedbacks must be an array.' });
	try {
		const stats = await getSummary(feedbacks);
		res.json(stats);
	} catch (err) {
		res.status(500).json({ error: 'Summary statistics failed', details: err.message });
	}
});

module.exports = router;
