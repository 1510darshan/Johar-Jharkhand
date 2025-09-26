const FeedbackSentimentAnalyzer = require('../processor/sentimentAIProcessor');

// Set your Groq API key here or use environment variable
const API_KEY = process.env.GROQ_API_KEY ;
const analyzer = new FeedbackSentimentAnalyzer(API_KEY);

// Controller function for single feedback analysis
async function analyzeSingle(feedback, includeEmotions = true) {
	return await analyzer.analyzeSentiment(feedback, includeEmotions);
}

// Controller function for batch feedback analysis
async function analyzeBatch(feedbacks) {
	return await analyzer.analyzeBatch(feedbacks);
}

// Controller function for summary statistics
async function getSummary(feedbacks) {
	const results = await analyzer.analyzeBatch(feedbacks);
	return analyzer.getSummaryStatistics(results);
}

module.exports = {
	analyzeSingle,
	analyzeBatch,
	getSummary
};
